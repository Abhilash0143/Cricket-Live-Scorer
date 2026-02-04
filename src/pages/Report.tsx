import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import { supabase } from "../lib/supabase";
import { AppShell } from "../ui/AppShell";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

type Match = { id: string; title: string | null; match_type: string; status: string };
type InningScore = {
  match_id: string;
  innings_no: number;
  runs: number;
  wickets: number;
  legal_balls: number;
};

function oversText(legalBalls: number) {
  const o = Math.floor(legalBalls / 6);
  const b = legalBalls % 6;
  return `${o}.${b}`;
}

export default function Report() {
  const { matchId } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<Match | null>(null);
  const [innings, setInnings] = useState<InningScore[]>([]);

  useEffect(() => {
    if (!matchId) return;

    (async () => {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        nav("/auth");
        return;
      }

      const { data: m } = await supabase
        .from("matches")
        .select("id,title,match_type,status")
        .eq("id", matchId)
        .maybeSingle();

      setMatch((m as Match) ?? null);

      // ✅ IMPORTANT: use v_innings_score
      const { data: inn, error } = await supabase
        .from("v_innings_score")
        .select("match_id,innings_no,runs,wickets,legal_balls")
        .eq("match_id", matchId)
        .order("innings_no", { ascending: true });

      if (error) console.log("Report innings error:", error.message);
      setInnings((inn as InningScore[]) ?? []);

      setLoading(false);
    })();
  }, [matchId, nav]);

  const summaryLines = useMemo(() => {
    return innings.map((i) => `Innings ${i.innings_no}: ${i.runs}/${i.wickets} (${oversText(i.legal_balls)} ov)`);
  }, [innings]);

  function downloadPDF() {
    const doc = new jsPDF();
    const title = match?.title ?? "Match Report";

    doc.setFontSize(16);
    doc.text(title, 14, 18);

    doc.setFontSize(11);
    doc.text(`Type: ${match?.match_type ?? "-"}`, 14, 28);
    doc.text(`Status: ${match?.status ?? "-"}`, 14, 35);
    doc.text(`Match ID: ${matchId ?? "-"}`, 14, 42);

    doc.setFontSize(12);
    doc.text("Score Summary", 14, 55);

    doc.setFontSize(11);
    let y = 64;

    if (!summaryLines.length) {
      doc.text("No innings data found.", 14, y);
      y += 8;
    } else {
      for (const line of summaryLines) {
        doc.text(line, 14, y);
        y += 8;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      }
    }

    doc.save(`${(match?.title ?? "match-report").replaceAll(" ", "-")}.pdf`);
  }

  return (
    <AppShell
      title="Match Report"
      subtitle={match?.title ?? ""}
      right={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav(`/m/${matchId}/score`)}>
            Back
          </Button>
          <Button variant="soft" onClick={downloadPDF}>
            Download PDF
          </Button>
        </div>
      }
    >
      {loading ? (
        <Card>Loading…</Card>
      ) : (
        <div className="grid gap-4">
          <Card>
            <div className="text-white/60 text-sm">Match</div>
            <div className="text-xl font-bold">{match?.title ?? "-"}</div>
            <div className="text-white/60 text-sm mt-1">
              {match?.match_type ?? "-"} • {match?.status ?? "-"}
            </div>
          </Card>

          <Card>
            <div className="text-white/60 text-sm">Score Summary</div>
            <div className="mt-3 grid gap-2">
              {summaryLines.length ? (
                summaryLines.map((l, idx) => (
                  <div key={idx} className="border-b border-white/10 pb-2 font-semibold">
                    {l}
                  </div>
                ))
              ) : (
                <div className="text-white/60">No innings data found.</div>
              )}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
