import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../ui/AppShell";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { supabase } from "../lib/supabase";

type Team = { id: string; name: string; short_name: string | null };
type Match = { id: string; title: string | null; match_type: string; status: string };

type InningRow = {
  id: string;
  match_id: string;
  innings_no: number;
  batting_team_id?: string | null;
  bowling_team_id?: string | null;
};

type InningScore = {
  match_id: string;
  innings_no: number;
  runs: number;
  wickets: number;
  legal_balls: number;
};

type MatchPlayer = {
  id: string;
  match_id: string;
  team_id: string | null;
  name: string;
};

type BatterStats = { runs: number; balls: number; fours: number; sixes: number };

type BallTag = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "W" | "WD" | "NB" | "B" | "LB";
type NonWicketTag = Exclude<BallTag, "W">;

function emptyStats(): BatterStats {
  return { runs: 0, balls: 0, fours: 0, sixes: 0 };
}

function oversText(legalBalls: number) {
  const o = Math.floor(legalBalls / 6);
  const b = legalBalls % 6;
  return `${o}.${b}`;
}

function crr(runs: number, legalBalls: number) {
  if (!legalBalls) return "0.00";
  const overs = legalBalls / 6;
  return (runs / overs).toFixed(2);
}

function strikeRate(runs: number, balls: number) {
  if (!balls) return "0.0";
  return ((runs / balls) * 100).toFixed(1);
}

function isUUID(id?: string) {
  return !!id && /^[0-9a-f-]{36}$/i.test(id);
}

function tagTone(t: BallTag): "neutral" | "blue" | "purple" | "red" {
  if (t === "4" || t === "6") return "blue";
  if (t === "W") return "red";
  if (t === "WD" || t === "NB") return "purple";
  return "neutral";
}

function tagLabel(t: BallTag) {
  if (t === "WD") return "Wd";
  if (t === "NB") return "Nb";
  return t;
}

function ChipMini({
  tone,
  children,
}: {
  tone: "neutral" | "blue" | "purple" | "red";
  children: React.ReactNode;
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-500/20 border-blue-400/20 text-blue-100"
      : tone === "purple"
      ? "bg-purple-500/20 border-purple-400/20 text-purple-100"
      : tone === "red"
      ? "bg-red-500/20 border-red-400/20 text-red-100"
      : "bg-white/10 border-white/10 text-white/80";

  return <span className={`px-2.5 py-1 rounded-full text-xs border ${cls}`}>{children}</span>;
}

export default function Score() {
  const { matchId } = useParams<{ matchId: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [inningRow, setInningRow] = useState<InningRow | null>(null);

  const [inning, setInning] = useState<InningScore>({
    match_id: "",
    innings_no: 1,
    runs: 0,
    wickets: 0,
    legal_balls: 0,
  });

  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const [bowlerName, setBowlerName] = useState("");
  const [batterSearch, setBatterSearch] = useState("");
  const [nextBatterId, setNextBatterId] = useState("");

  const [stats, setStats] = useState<{ striker: BatterStats; nonStriker: BatterStats }>({
    striker: emptyStats(),
    nonStriker: emptyStats(),
  });

  const [lastBalls, setLastBalls] = useState<BallTag[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const overTxt = useMemo(() => oversText(inning.legal_balls), [inning.legal_balls]);
  const crrTxt = useMemo(() => crr(inning.runs, inning.legal_balls), [inning.runs, inning.legal_balls]);

  function pushToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  const striker = useMemo(() => players.find((p) => p.id === strikerId) ?? null, [players, strikerId]);
  const nonStriker = useMemo(() => players.find((p) => p.id === nonStrikerId) ?? null, [players, nonStrikerId]);
  const bowler = useMemo(() => players.find((p) => p.id === bowlerId) ?? null, [players, bowlerId]);

  function swapStrike() {
    setStrikerId((prev) => {
      setNonStrikerId(prev);
      return nonStrikerId;
    });
  }

  async function fetchScoreFromView(id: string) {
    const { data } = await supabase
      .from("v_innings_score")
      .select("*")
      .eq("match_id", id)
      .order("innings_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setInning(data as InningScore);
  }

  async function fetchInningRow(id: string) {
    const { data } = await supabase
      .from("innings")
      .select("*")
      .eq("match_id", id)
      .order("innings_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    setInningRow(data as InningRow);
    return data as InningRow;
  }

  async function fetchPlayers(id: string) {
    const { data } = await supabase.from("match_players").select("*").eq("match_id", id);
    return (data as MatchPlayer[]) ?? [];
  }

  async function getNextSeq(inningsId: string) {
    const { data } = await supabase
      .from("ball_events")
      .select("seq")
      .eq("innings_id", inningsId)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data?.seq ?? 0) + 1;
  }

  function mapEvent(tag: BallTag) {
    if (tag === "WD") return { legal: false, runs_bat: 0, runs_extras: 1, extra_type: "WD", wicket: false };
    if (tag === "NB") return { legal: false, runs_bat: 0, runs_extras: 1, extra_type: "NB", wicket: false };
    if (tag === "W") return { legal: true, runs_bat: 0, runs_extras: 0, extra_type: null, wicket: true };

    return { legal: true, runs_bat: Number(tag), runs_extras: 0, extra_type: null, wicket: false };
  }

  async function applyBall(tag: NonWicketTag) {
    if (!inningRow?.id) return;

    const seq = await getNextSeq(inningRow.id);
    const ev = mapEvent(tag);

    const { error } = await supabase.from("ball_events").insert({
      innings_id: inningRow.id,
      seq,
      striker_id: strikerId,
      non_striker_id: nonStrikerId,
      bowler_id: bowlerId,
      ...ev,
    });

    if (error) return pushToast(error.message);

    await fetchScoreFromView(matchId!);
  }

  useEffect(() => {
    if (!matchId || !isUUID(matchId)) return;

    (async () => {
      setLoading(true);

      const { data: m } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
      setMatch(m as Match);

      const ir = await fetchInningRow(matchId);
      await fetchScoreFromView(matchId);

      const p = await fetchPlayers(matchId);
      setPlayers(p);

      if (p.length >= 2) {
        setStrikerId(p[0].id);
        setNonStrikerId(p[1].id);
      }
      if (p.length >= 3) setBowlerId(p[2].id);

      setLoading(false);
    })();
  }, [matchId]);

  return (
    <AppShell title={match?.title ?? "Live Scoring"}>
      <div className="p-4 space-y-4">
        <Card>
          <div className="text-3xl font-bold">
            {inning.runs}/{inning.wickets} ({overTxt})
          </div>
          <div className="text-sm">CRR {crrTxt}</div>
        </Card>

        <Card>
          <div>Striker: {striker?.name}</div>
          <div>Non-Striker: {nonStriker?.name}</div>
          <div>Bowler: {bowler?.name}</div>
        </Card>

        <div className="grid grid-cols-7 gap-2">
          {["0", "1", "2", "3", "4", "5", "6"].map((t) => (
            <button key={t} onClick={() => applyBall(t as NonWicketTag)} className="p-3 bg-white/10 rounded">
              {t}
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}