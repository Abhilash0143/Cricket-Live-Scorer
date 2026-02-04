import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type ShareLinkRow = {
  token: string;
  match_id: string;
  is_active: boolean;
};

function makeToken(len = 18) {
  // URL-friendly token (no dashes)
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Share() {
  // ✅ route must be: /m/:matchId/share  (protected)
  // public view must be: /s/:token      (public)
  const { matchId } = useParams();
  const nav = useNavigate();

  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const shareUrl = useMemo(() => {
    if (!token) return "";
    return `${window.location.origin}/s/${token}`;
  }, [token]);

  useEffect(() => {
    if (!matchId) return;

    (async () => {
      setLoading(true);

      // ✅ only scorer (logged-in) can generate share links
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        nav("/auth");
        return;
      }

      // 1) If an active share link already exists for this match, reuse it
      const { data: existing, error: exErr } = await supabase
        .from("share_links")
        .select("token,match_id,is_active")
        .eq("match_id", matchId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<ShareLinkRow>();

      if (!exErr && existing?.token) {
        setToken(existing.token);
        setLoading(false);
        return;
      }

      // 2) Else create a new token (retry if collision)
      let createdToken = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        const newToken = makeToken(18);

        const { error: insErr } = await supabase.from("share_links").insert({
          match_id: matchId,
          token: newToken,
          created_by: sess.session.user.id,
          is_active: true,
        });

        if (!insErr) {
          createdToken = newToken;
          break;
        }

        // If token unique constraint collision, retry; otherwise show error
        const msg = insErr.message?.toLowerCase?.() ?? "";
        const code = (insErr as any).code ?? "";
        const collision =
          msg.includes("duplicate") || msg.includes("unique") || code === "23505";

        if (!collision) {
          alert(insErr.message);
          setLoading(false);
          return;
        }
      }

      if (!createdToken) {
        alert("Could not generate share link. Try again.");
        setLoading(false);
        return;
      }

      setToken(createdToken);
      setLoading(false);
    })();
  }, [matchId, nav]);

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function goBack() {
    // ✅ never navigate with undefined
    if (matchId) nav(`/m/${matchId}/score`);
    else nav("/");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">Share Live Score</div>
          <div className="text-white/60">Anyone with the link can view.</div>
        </div>
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
      </div>

      <Card className="mt-6">
        <div className="text-white/60 text-sm mb-2">Public Link</div>

        <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3 break-all">
          {loading ? "Generating..." : shareUrl || "Unable to generate link"}
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={copy} disabled={!shareUrl}>
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => shareUrl && window.open(shareUrl, "_blank")}
            disabled={!shareUrl}
          >
            Open
          </Button>
        </div>

        <div className="text-xs text-white/40 mt-3">
          Tip: Share link is reused if already created for this match.
        </div>
      </Card>
    </div>
  );
}
