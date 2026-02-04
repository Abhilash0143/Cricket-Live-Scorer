import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { AppShell } from "../ui/AppShell";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

type MatchType = "T20" | "ODI" | "TEST" | "CUSTOM";

export default function NewMatch() {
    const nav = useNavigate();

    const [title, setTitle] = useState("Live Match");
    const [matchType, setMatchType] = useState<MatchType>("T20");
    const [oversLimit, setOversLimit] = useState<number>(20);

    const [teamA, setTeamA] = useState("Team A");
    const [teamB, setTeamB] = useState("Team B");

    const [opener1, setOpener1] = useState("Batter 1");
    const [opener2, setOpener2] = useState("Batter 2");
    const [bowler1, setBowler1] = useState("Bowler 1");

    const canCreate = useMemo(() => {
        return (
            title.trim() &&
            teamA.trim() &&
            teamB.trim() &&
            opener1.trim() &&
            opener2.trim() &&
            bowler1.trim() &&
            (matchType !== "CUSTOM" || oversLimit > 0)
        );
    }, [title, teamA, teamB, opener1, opener2, bowler1, matchType, oversLimit]);

    async function ensureSession() {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
            nav("/auth");
            return null;
        }
        // safe profile upsert
        await supabase.from("profiles").upsert({ id: data.session.user.id });
        return data.session.user.id;
    }

    async function createMatch() {
        const ownerId = await ensureSession();
        if (!ownerId) return;

        // 1) match
        const { data: match, error: matchErr } = await supabase
            .from("matches")
            .insert({
                owner_id: ownerId,
                title,
                match_type: matchType,
                overs_limit: matchType === "CUSTOM" ? oversLimit : matchType === "T20" ? 20 : matchType === "ODI" ? 50 : null,
                status: "LIVE",
            })
            .select("id")
            .single();

        if (matchErr || !match) return alert(matchErr?.message ?? "Failed to create match");

        // 2) teams
        const { data: teams, error: teamsErr } = await supabase
            .from("match_teams")  
            .insert([
                { match_id: match.id, name: teamA, short_name: teamA.slice(0, 3).toUpperCase(), color: "#3b82f6" },
                { match_id: match.id, name: teamB, short_name: teamB.slice(0, 3).toUpperCase(), color: "#22c55e" },
            ])
            .select("id,name")

        if (teamsErr || !teams || teams.length < 2) return alert(teamsErr?.message ?? "Failed to create teams");

        const teamAId = teams[0].id;
        const teamBId = teams[1].id;

        // 3) minimum players (2 batters in teamA, 1 bowler in teamB)
        const { data: players, error: playersErr } = await supabase
            .from("match_players")
            .insert([
                { match_id: match.id, team_id: teamAId, name: opener1 },
                { match_id: match.id, team_id: teamAId, name: opener2 },
                { match_id: match.id, team_id: teamBId, name: bowler1 },
            ])
            .select("id, name, team_id");

        if (playersErr || !players || players.length < 3) return alert(playersErr?.message ?? "Failed to create players");

        // 4) innings 1 (Team A batting)
        const { data: inn, error: innErr } = await supabase
            .from("innings")
            .insert({
                match_id: match.id,
                innings_no: 1,
                batting_team_id: teamAId,
                bowling_team_id: teamBId,
            })
            .select("id")
            .single();

        if (innErr || !inn) return alert(innErr?.message ?? "Failed to create innings");

        // 5) Insert a “setup” ball event? (not necessary) → go to scoring
        nav(`/m/${match.id}/score`);
    }

    return (
  <AppShell
    title="New Match"
    subtitle="Create a match in under 30 seconds."
    right={<Button variant="ghost" onClick={() => nav("/")}>Back</Button>}
  >
    {/* remove your Tailwind test card after confirming */}
    <div className="grid gap-4">
      <Card className="relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative">
          <div className="text-sm text-white/60">Basics</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Match title" />
            <Select value={matchType} onChange={(e) => setMatchType(e.target.value as any)}>
              <option value="T20">T20</option>
              <option value="ODI">ODI</option>
              <option value="TEST">Test</option>
              <option value="CUSTOM">Custom</option>
            </Select>
          </div>

          {matchType === "CUSTOM" && (
            <div className="mt-3">
              <Input
                type="number"
                min={1}
                value={oversLimit}
                onChange={(e) => setOversLimit(Number(e.target.value))}
                placeholder="Overs limit"
              />
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm text-white/60">Teams</div>
          <div className="mt-3 grid gap-3">
            <Input value={teamA} onChange={(e) => setTeamA(e.target.value)} placeholder="Team A" />
            <Input value={teamB} onChange={(e) => setTeamB(e.target.value)} placeholder="Team B" />
          </div>
        </Card>

        <Card>
          <div className="text-sm text-white/60">Quick Players (Minimum)</div>
          <div className="mt-3 grid gap-3">
            <Input value={opener1} onChange={(e) => setOpener1(e.target.value)} placeholder="Opener 1" />
            <Input value={opener2} onChange={(e) => setOpener2(e.target.value)} placeholder="Opener 2" />
            <Input value={bowler1} onChange={(e) => setBowler1(e.target.value)} placeholder="Opening bowler" />
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-white/60 text-sm">
          You can add full playing XIs later — this starts fast.
        </div>
        <Button onClick={createMatch} disabled={!canCreate}>
          Start Match
        </Button>
      </div>
    </div>
  </AppShell>
);

}
