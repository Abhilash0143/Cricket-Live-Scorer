// PART 1 START
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
  return (runs / (legalBalls / 6)).toFixed(2);
}

function strikeRate(runs: number, balls: number) {
  if (!balls) return "0.0";
  return ((runs / balls) * 100).toFixed(1);
}

function isUUID(id?: string) {
  return !!id && /^[0-9a-f-]{36}$/i.test(id);
}

// PART 2 START

export default function Score() {
  const { matchId } = useParams();
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

  const [batting, setBatting] = useState({ team: "Team A", short: "A" });
  const [bowling, setBowling] = useState({ team: "Team B", short: "B" });

  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [strikerId, setStrikerId] = useState<string>("");
  const [nonStrikerId, setNonStrikerId] = useState<string>("");
  const [bowlerId, setBowlerId] = useState<string>("");

  const [bowlerName, setBowlerName] = useState("");
  const [nextBatterName, setNextBatterName] = useState("");

  const [stats, setStats] = useState<{ striker: BatterStats; nonStriker: BatterStats }>({
    striker: emptyStats(),
    nonStriker: emptyStats(),
  });

  const [lastBalls, setLastBalls] = useState<BallTag[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showBowlerPicker, setShowBowlerPicker] = useState(false);
  const [showWicketPicker, setShowWicketPicker] = useState(false);

  const [wicketOut, setWicketOut] = useState<"striker" | "nonStriker">("striker");
  const [nextBatterId, setNextBatterId] = useState<string>("");

  const [bowlerSearch, setBowlerSearch] = useState("");
  const [batterSearch, setBatterSearch] = useState("");

  const CONTENT_BOTTOM_PAD = 340;

  const overTxt = useMemo(() => oversText(inning.legal_balls), [inning.legal_balls]);
  const crrTxt = useMemo(() => crr(inning.runs, inning.legal_balls), [inning.runs, inning.legal_balls]);

  function pushToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  const striker = useMemo(() => players.find((p) => p.id === strikerId) ?? null, [players, strikerId]);
  const nonStriker = useMemo(() => players.find((p) => p.id === nonStrikerId) ?? null, [players, nonStrikerId]);
  const bowler = useMemo(() => players.find((p) => p.id === bowlerId) ?? null, [players, bowlerId]);

  type NonWicketTag = Exclude<BallTag, "W">;

  function swapStrike() {
    setStrikerId((prev) => {
      const ns = nonStrikerId;
      setNonStrikerId(prev);
      return ns;
    });
  }

  async function fetchScoreFromView(id: string) {
    const { data } = await supabase
      .from("v_innings_score")
      .select("match_id,innings_no,runs,wickets,legal_balls")
      .eq("match_id", id)
      .order("innings_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setInning(data as InningScore);
  }

  async function fetchInningRow(id: string) {
    const { data } = await supabase
      .from("innings")
      .select("id,match_id,innings_no,batting_team_id,bowling_team_id")
      .eq("match_id", id)
      .order("innings_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    setInningRow((data as InningRow) ?? null);
    return (data as InningRow) ?? null;
  }

  async function fetchPlayers(id: string) {
    const { data } = await supabase
      .from("match_players")
      .select("id,match_id,team_id,name")
      .eq("match_id", id)
      .order("created_at", { ascending: true });

    const list = (data as MatchPlayer[]) ?? [];
    setPlayers(list);
    return list;
  }

// PART 3 START

  async function getOrCreatePlayerId(name: string) {
    if (!matchId) return "";
    const clean = name.trim();
    if (!clean) return "";

    const local = players.find((p) => p.name.toLowerCase() === clean.toLowerCase());
    if (local) return local.id;

    const { data: existing } = await supabase
      .from("match_players")
      .select("id,match_id,team_id,name")
      .eq("match_id", matchId)
      .ilike("name", clean)
      .maybeSingle();

    if (existing?.id) {
      setPlayers((prev) => [...prev, existing as MatchPlayer]);
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from("match_players")
      .insert({
        match_id: matchId,
        team_id: null,
        name: clean,
      })
      .select("id,match_id,team_id,name")
      .single();

    if (error) {
      pushToast(error.message);
      return "";
    }

    setPlayers((prev) => [...prev, created as MatchPlayer]);
    return created.id;
  }

  async function fetchBatterStats(inningsId: string, sId: string, nsId: string) {
    const { data } = await supabase
      .from("ball_events")
      .select("legal,runs_bat,striker_id")
      .eq("innings_id", inningsId)
      .order("seq", { ascending: true });

    const s = emptyStats();
    const ns = emptyStats();

    for (const e of (data ?? []) as any[]) {
      const facedId = e.striker_id as string | null;
      if (!facedId) continue;

      const target = facedId === sId ? s : facedId === nsId ? ns : null;
      if (!target) continue;

      const runsBat = Number(e.runs_bat ?? 0);

      target.runs += runsBat;
      if (runsBat === 4) target.fours += 1;
      if (runsBat === 6) target.sixes += 1;
      if (e.legal) target.balls += 1;
    }

    setStats({ striker: s, nonStriker: ns });
  }

  async function fetchLastBalls(inningsId: string) {
    const { data } = await supabase
      .from("ball_events")
      .select("legal,runs_bat,runs_extras,extra_type,wicket")
      .eq("innings_id", inningsId)
      .order("seq", { ascending: false })
      .limit(6);

    const tags: BallTag[] = (data ?? []).map((e: any) => {
      if (e.wicket) return "W";
      if (!e.legal && e.extra_type === "WD") return "WD";
      if (!e.legal && e.extra_type === "NB") return "NB";
      if (e.extra_type === "B") return "B";
      if (e.extra_type === "LB") return "LB";
      return String(e.runs_bat ?? 0) as BallTag;
    });

    setLastBalls(tags);
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
    if (tag === "W") return { legal: true, runs_bat: 0, runs_extras: 0, extra_type: null, wicket: true };
    if (tag === "WD") return { legal: false, runs_bat: 0, runs_extras: 1, extra_type: "WD", wicket: false };
    if (tag === "NB") return { legal: false, runs_bat: 0, runs_extras: 1, extra_type: "NB", wicket: false };
    if (tag === "B") return { legal: true, runs_bat: 0, runs_extras: 1, extra_type: "B", wicket: false };
    if (tag === "LB") return { legal: true, runs_bat: 0, runs_extras: 1, extra_type: "LB", wicket: false };

    return { legal: true, runs_bat: Number(tag), runs_extras: 0, extra_type: null, wicket: false };
  }

  async function applyBall(tag: NonWicketTag) {
    if (!matchId || !inningRow?.id) return;
    if (!strikerId || !nonStrikerId || !bowlerId) {
      pushToast("Select striker/non-striker/bowler first");
      return;
    }

    const seq = await getNextSeq(inningRow.id);
    const ev = mapEvent(tag);

    const { error } = await supabase.from("ball_events").insert({
      innings_id: inningRow.id,
      seq,
      legal: ev.legal,
      striker_id: strikerId,
      non_striker_id: nonStrikerId,
      bowler_id: bowlerId,
      runs_bat: ev.runs_bat,
      runs_extras: ev.runs_extras,
      extra_type: ev.extra_type,
      wicket: ev.wicket,
    });

    if (error) return pushToast(error.message);

    if (tag === "1" || tag === "3" || tag === "5" || tag === "B" || tag === "LB") {
      const s = strikerId;
      setStrikerId(nonStrikerId);
      setNonStrikerId(s);
    }

    if (ev.legal) {
      const newLegal = inning.legal_balls + 1;
      if (newLegal % 6 === 0) {
        const s = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(s);
      }
    }

    await fetchScoreFromView(matchId);
    await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
    await fetchLastBalls(inningRow.id);
  }

  async function undoLast() {
    if (!inningRow?.id) return;

    const { data: last } = await supabase
      .from("ball_events")
      .select("id")
      .eq("innings_id", inningRow.id)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!last?.id) return pushToast("Nothing to undo");

    await supabase.from("ball_events").delete().eq("id", last.id);

    if (matchId) await fetchScoreFromView(matchId);
    await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
    await fetchLastBalls(inningRow.id);
  }

  useEffect(() => {
    if (!matchId || !isUUID(matchId)) return;

    (async () => {
      setLoading(true);

      const { data: m } = await supabase
        .from("matches")
        .select("id,title,match_type,status")
        .eq("id", matchId)
        .maybeSingle();

      setMatch((m as Match) ?? null);

      const ir = await fetchInningRow(matchId);
      await fetchScoreFromView(matchId);
      const p = await fetchPlayers(matchId);

      if (p.length >= 2) {
        setStrikerId(p[0].id);
        setNonStrikerId(p[1].id);
      }
      if (p.length >= 3) setBowlerId(p[2].id);

      if (ir?.id) await fetchLastBalls(ir.id);

      setLoading(false);
    })();
  }, [matchId]);

  useEffect(() => {
    if (!inningRow?.id || !strikerId || !nonStrikerId) return;

    (async () => {
      await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
      await fetchLastBalls(inningRow.id);
    })();
  }, [inningRow?.id, strikerId, nonStrikerId]);

  useEffect(() => {
    if (!matchId || !inningRow?.id) return;

    const channel = supabase
      .channel(`live-score-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ball_events", filter: `innings_id=eq.${inningRow.id}` },
        async () => {
          await fetchScoreFromView(matchId);
          await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
          await fetchLastBalls(inningRow.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, inningRow?.id, strikerId, nonStrikerId]);

// PART 4 START

  const availableNextBatters = useMemo(() => {
    const used = new Set([strikerId, nonStrikerId]);
    const q = batterSearch.trim().toLowerCase();
    const list = players.filter((p) => !used.has(p.id));
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, strikerId, nonStrikerId, batterSearch]);

  const filteredBowlers = useMemo(() => {
    const q = bowlerSearch.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, bowlerSearch]);

  const canScore = !!inningRow?.id && !!strikerId && !!nonStrikerId && !!bowlerId;

  if (loading) {
    return (
      <AppShell title="Live Scoring">
        <Card>Loading…</Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={match?.title ?? "Live Scoring"}
      subtitle={`${match?.match_type ?? "Match"} • ${match?.status ?? "LIVE"}`}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="green">LIVE</Chip>
          <Button variant="soft" onClick={() => setShowQuickEdit(true)}>
            Quick Edit
          </Button>
        </div>
      }
    >
      <div style={{ paddingBottom: CONTENT_BOTTOM_PAD }}>
        {/* SCORE CARD */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/60 text-sm">Innings {inning.innings_no}</div>
              <div className="text-4xl font-bold">
                {inning.runs}/{inning.wickets}
                <span className="text-lg ml-2">({overTxt})</span>
              </div>
              <div className="text-sm text-white/60">CRR {crrTxt}</div>
            </div>

            <div className="text-right">
              <div className="text-white/60 text-sm">Batting</div>
              <div className="font-bold">{batting.short}</div>
              <div className="text-white/50 text-sm">{batting.team}</div>
            </div>
          </div>

          {/* LAST BALLS */}
          <div className="mt-4 flex gap-2">
            {lastBalls.map((b, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded bg-white/10 border border-white/10"
              >
                {b}
              </span>
            ))}
          </div>
        </Card>

        {/* BATTERS */}
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <Card>
            <div className="text-white/60 text-sm">Striker</div>
            <div className="text-xl font-bold">{striker?.name ?? "—"}</div>

            <div className="text-sm mt-2">
              {stats.striker.runs} ({stats.striker.balls}) • SR{" "}
              {strikeRate(stats.striker.runs, stats.striker.balls)}
            </div>

            <Button
              className="mt-3"
              variant="ghost"
              onClick={swapStrike}
              disabled={!canScore}
            >
              Swap
            </Button>
          </Card>

          <Card>
            <div className="text-white/60 text-sm">Non-Striker</div>
            <div className="text-xl font-bold">{nonStriker?.name ?? "—"}</div>

            <div className="text-sm mt-2">
              {stats.nonStriker.runs} ({stats.nonStriker.balls}) • SR{" "}
              {strikeRate(stats.nonStriker.runs, stats.nonStriker.balls)}
            </div>
          </Card>
        </div>

        {/* BOWLER */}
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/60 text-sm">Bowler</div>
              <div className="text-xl font-bold">{bowler?.name ?? "—"}</div>
            </div>

            <Button
              variant="soft"
              onClick={() => {
                setBowlerSearch("");
                setShowBowlerPicker(true);
              }}
            >
              Change
            </Button>
          </div>
        </Card>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded bg-black/80 border border-white/10">
            {toast}
          </div>
        </div>
      )}

      {/* SCORE PAD */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/60 backdrop-blur border-t border-white/10 p-3">
        <div className="grid grid-cols-7 gap-2">
          {(["0","1","2","3","4","5","6"] as NonWicketTag[]).map((t) => (
            <button
              key={t}
              onClick={() => applyBall(t)}
              disabled={!canScore}
              className="h-11 rounded-xl border bg-white/10"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 mt-2">
          {(["WD","NB","B","LB"] as NonWicketTag[]).map((t) => (
            <button
              key={t}
              onClick={() => applyBall(t)}
              disabled={!canScore}
              className="h-11 rounded-xl border bg-purple-500/20"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-3">
          <Button
            variant="ghost"
            onClick={undoLast}
            disabled={!inningRow?.id}
          >
            Undo
          </Button>

          <Button
            variant="danger"
            onClick={() => setShowWicketPicker(true)}
            disabled={!canScore}
          >
            W
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
// PART 4 END