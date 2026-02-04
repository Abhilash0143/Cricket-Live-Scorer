import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AppShell } from "../ui/AppShell";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

type Match = {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  match_type: string;
};

export default function Lobby() {
  const nav = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        nav("/auth");
        return;
      }

      await supabase.from("profiles").upsert({ id: data.session.user.id });

      const { data: rows, error } = await supabase
        .from("matches")
        .select("id,title,status,created_at,match_type")
        .order("created_at", { ascending: false });

      if (error) console.log(error.message);
      setMatches((rows ?? []) as Match[]);
      setLoading(false);
    })();
  }, [nav]);

  return (
    <AppShell
      title="Your Matches"
      subtitle="Resume scoring or start a new one."
      right={<Button onClick={() => nav("/new")}>+ New Match</Button>}
    >
      {loading ? (
        <Card>Loading…</Card>
      ) : matches.length === 0 ? (
        <Card className="relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative">
            <div className="text-xl font-bold">No matches yet</div>
            <div className="text-white/60 mt-1">
              Create your first match and start scoring live.
            </div>
            <div className="mt-4">
              <Button onClick={() => nav("/new")}>Create Match</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((m) => (
            <Card key={m.id} className="relative overflow-hidden">
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="relative flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">
                    {m.title ?? "Untitled match"}
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    {m.match_type} •{" "}
                    <span className="text-white/80">{m.status}</span>
                  </div>
                </div>
                <Button variant="soft" onClick={() => nav(`/m/${m.id}/score`)}>
                  Open
                </Button>
              </div>

              <div className="relative mt-4 text-xs text-white/40">
                {new Date(m.created_at).toLocaleString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
