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
  id: string; // innings_id
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
  id: string; // FK target for ball_events striker_id/non_striker_id/bowler_id
  match_id: string;
  team_id: string;
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
  const overs = legalBalls / 6;
  return (runs / overs).toFixed(2);
}

function strikeRate(runs: number, balls: number) {
  if (!balls) return "0.0";
  return ((runs / balls) * 100).toFixed(1);
}

function isUUID(id?: string) {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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

  // picker modals
  const [showBowlerPicker, setShowBowlerPicker] = useState(false);
  const [showWicketPicker, setShowWicketPicker] = useState(false);

  const [wicketOut, setWicketOut] = useState<"striker" | "nonStriker">("striker");
  const [nextBatterId, setNextBatterId] = useState<string>("");

  // NEW: search inputs
  const [bowlerSearch, setBowlerSearch] = useState("");
  const [batterSearch, setBatterSearch] = useState("");

  // Sticky pad spacing so content isn't hidden
  const CONTENT_BOTTOM_PAD = 340; // adjust if you change pad height

  const overTxt = useMemo(() => oversText(inning.legal_balls), [inning.legal_balls]);
  const crrTxt = useMemo(() => crr(inning.runs, inning.legal_balls), [inning.runs, inning.legal_balls]);

  function pushToast(msg: string) {
    setToast(msg);
    window.clearTimeout((pushToast as any)._t);
    (pushToast as any)._t = window.setTimeout(() => setToast(null), 1800);
  }

  const striker = useMemo(() => players.find((p) => p.id === strikerId) ?? null, [players, strikerId]);
  const nonStriker = useMemo(() => players.find((p) => p.id === nonStrikerId) ?? null, [players, nonStrikerId]);
  const bowler = useMemo(() => players.find((p) => p.id === bowlerId) ?? null, [players, bowlerId]);

  type NonWicketTag = Exclude<BallTag, "W">;

  function swapStrike() {
    // safer swap (your old version relied on stale state)
    setStrikerId((s) => {
      const ns = nonStrikerId;
      setNonStrikerId(s);
      return ns;
    });
  }

  function findPlayerIdByName(name: string) {
    const q = name.trim().toLowerCase();
    if (!q) return "";

    // exact match first
    const exact = players.find((p) => p.name.trim().toLowerCase() === q);
    if (exact) return exact.id;

    // fallback: startsWith / includes
    const starts = players.find((p) => p.name.trim().toLowerCase().startsWith(q));
    if (starts) return starts.id;

    const inc = players.find((p) => p.name.trim().toLowerCase().includes(q));
    return inc?.id ?? "";
  }

  async function getOrCreatePlayerId(name: string) {
    if (!matchId) return "";

    const clean = name.trim();
    if (!clean) return "";

    // 1) check in local state
    const local = players.find((p) => p.name.toLowerCase() === clean.toLowerCase());
    if (local) return local.id;

    // 2) check DB
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

    // 3) create new
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

  async function fetchScoreFromView(id: string) {
    const { data, error } = await supabase
      .from("v_innings_score")
      .select("match_id,innings_no,runs,wickets,legal_balls")
      .eq("match_id", id)
      .order("innings_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) console.log("v_innings_score error:", error.message);
    if (data) setInning(data as InningScore);
  }

  async function fetchInningRow(id: string) {
    const { data, error } = await supabase
      .from("innings")
      .select("id,match_id,innings_no,batting_team_id,bowling_team_id")
      .eq("match_id", id)
      .order("innings_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) console.log("innings row error:", error.message);
    setInningRow((data as InningRow) ?? null);
    return (data as InningRow) ?? null;
  }

  async function fetchPlayers(id: string) {
    const { data, error } = await supabase
      .from("match_players")
      .select("id,match_id,team_id,name")
      .eq("match_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("match_players error:", error.message);
      return [];
    }
    return (data as MatchPlayer[]) ?? [];
  }

  async function fetchLastBalls(inningsId: string) {
    const { data, error } = await supabase
      .from("ball_events")
      .select("legal,runs_bat,runs_extras,extra_type,wicket")
      .eq("innings_id", inningsId)
      .order("seq", { ascending: false })
      .limit(6);

    if (error) {
      console.log("last balls error:", error.message);
      return;
    }

    const tags: BallTag[] = (data ?? []).map((e: any) => {
      if (e.wicket) return "W";
      if (!e.legal && e.extra_type === "WD") return "WD";
      if (!e.legal && e.extra_type === "NB") return "NB";
      if (e.legal && e.extra_type === "B") return "B";
      if (e.legal && e.extra_type === "LB") return "LB";
      return String(e.runs_bat ?? 0) as BallTag;
    });

    setLastBalls(tags);
  }

  async function fetchBatterStats(inningsId: string, sId: string, nsId: string) {
    const { data, error } = await supabase
      .from("ball_events")
      .select("legal,runs_bat,striker_id")
      .eq("innings_id", inningsId)
      .order("seq", { ascending: true });

    if (error) {
      console.log("ball_events stats error:", error.message);
      return { striker: emptyStats(), nonStriker: emptyStats() };
    }

    const s = emptyStats();
    const ns = emptyStats();

    for (const e of (data ?? []) as any[]) {
      const facedId = e.striker_id as string | null;
      if (!facedId) continue;

      const legal = !!e.legal;
      const runsBat = Number(e.runs_bat ?? 0);

      const target = facedId === sId ? s : facedId === nsId ? ns : null;
      if (!target) continue;

      target.runs += runsBat;
      if (runsBat === 4) target.fours += 1;
      if (runsBat === 6) target.sixes += 1;
      if (legal) target.balls += 1;
    }

    return { striker: s, nonStriker: ns };
  }

  async function getNextSeq(inningsId: string) {
    const { data, error } = await supabase
      .from("ball_events")
      .select("seq")
      .eq("innings_id", inningsId)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return 1;
    return (data?.seq ?? 0) + 1;
  }

  function mapEvent(tag: BallTag) {
    if (tag === "W")
      return { legal: true, runs_bat: 0, runs_extras: 0, extra_type: null as string | null, wicket: true };
    if (tag === "WD") return { legal: false, runs_bat: 0, runs_extras: 1, extra_type: "WD", wicket: false };
    if (tag === "NB") return { legal: false, runs_bat: 0, runs_extras: 1, extra_type: "NB", wicket: false };
    if (tag === "B") return { legal: true, runs_bat: 0, runs_extras: 1, extra_type: "B", wicket: false };
    if (tag === "LB") return { legal: true, runs_bat: 0, runs_extras: 1, extra_type: "LB", wicket: false };
    return { legal: true, runs_bat: Number(tag), runs_extras: 0, extra_type: null as string | null, wicket: false };
  }

  async function applyBall(tag: NonWicketTag) {
    if (!matchId || !inningRow?.id) return;
    if (!strikerId || !nonStrikerId || !bowlerId) return pushToast("Select striker/non-striker/bowler first");

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return nav("/auth");

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
      created_by: sess.session.user.id,
    });

    if (error) return pushToast(error.message);

    // strike rotation on odd runs (including bye/lb treated as 1)
    if (tag === "1" || tag === "3" || tag === "5" || tag === "B" || tag === "LB") {
      const s = strikerId;
      setStrikerId(nonStrikerId);
      setNonStrikerId(s);
    }

    // end over swap (only if legal)
    if (ev.legal) {
      const newLegal = inning.legal_balls + 1;
      if (newLegal % 6 === 0) {
        const s = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(s);
      }
    }

    await fetchScoreFromView(matchId);
    const st = await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
    setStats(st);
    await fetchLastBalls(inningRow.id);
  }

  async function confirmWicket() {
    if (!matchId || !inningRow?.id) return;
    if (!strikerId || !nonStrikerId || !bowlerId) return pushToast("Select striker/non-striker/bowler first");
    if (!nextBatterId) return pushToast("Select next batter");

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return nav("/auth");

    const seq = await getNextSeq(inningRow.id);

    const outId = wicketOut === "striker" ? strikerId : nonStrikerId;

    const { error } = await supabase.from("ball_events").insert({
      innings_id: inningRow.id,
      seq,
      legal: true,
      striker_id: strikerId,
      non_striker_id: nonStrikerId,
      bowler_id: bowlerId,
      runs_bat: 0,
      runs_extras: 0,
      extra_type: null,
      wicket: true,
      batter_out_id: outId,
      wicket_type: null,
      fielder_id: null,
      note: null,
      created_by: sess.session.user.id,
    });

    if (error) return pushToast(error.message);

    // replace out batter with next batter in UI
    if (wicketOut === "striker") setStrikerId(nextBatterId);
    else setNonStrikerId(nextBatterId);

    setNextBatterId("");
    setShowWicketPicker(false);

    await fetchScoreFromView(matchId);
    const st = await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
    setStats(st);
    await fetchLastBalls(inningRow.id);
  }

  async function undoLast() {
    if (!inningRow?.id) return;

    const { data: last, error: lastErr } = await supabase
      .from("ball_events")
      .select("id")
      .eq("innings_id", inningRow.id)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) return pushToast(lastErr.message);
    if (!last?.id) return pushToast("Nothing to undo");

    const { error } = await supabase.from("ball_events").delete().eq("id", last.id);
    if (error) return pushToast(error.message);

    if (matchId) await fetchScoreFromView(matchId);
    const st = await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
    setStats(st);
    await fetchLastBalls(inningRow.id);
  }

  function goShare() {
    if (!matchId) return;
    nav(`/m/${matchId}/share`);
  }

  function goReport() {
    if (!matchId) return;
    nav(`/m/${matchId}/report`);
  }

  // Load everything
  useEffect(() => {
    if (!matchId || !isUUID(matchId)) return;

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

      const { data: t } = await supabase
        .from("match_teams")
        .select("team_id, teams(id,name,short_name)")
        .eq("match_id", matchId);

      if (t) {
        const mapped: Team[] = (t as any[]).map((row) => row.teams).filter(Boolean);
        setTeams(mapped);

        if (mapped[0])
          setBatting({
            team: mapped[0].name,
            short: mapped[0].short_name ?? mapped[0].name.slice(0, 3).toUpperCase(),
          });
        if (mapped[1])
          setBowling({
            team: mapped[1].name,
            short: mapped[1].short_name ?? mapped[1].name.slice(0, 3).toUpperCase(),
          });
      }

      const ir = await fetchInningRow(matchId);
      await fetchScoreFromView(matchId);

      const p = await fetchPlayers(matchId);
      setPlayers(p);

      // default selections: pick first 2 as batters, first as bowler
      if (p.length >= 2) {
        setStrikerId(p[0].id);
        setNonStrikerId(p[1].id);
      }
      if (p.length >= 3) setBowlerId(p[2].id);

      if (ir?.id) {
        await fetchLastBalls(ir.id);
      }

      setLoading(false);
    })();
  }, [matchId, nav]);

  // When ids/innings change, recompute stats
  useEffect(() => {
    if (!inningRow?.id || !strikerId || !nonStrikerId) return;
    (async () => {
      const st = await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
      setStats(st);
      await fetchLastBalls(inningRow.id);
    })();
  }, [inningRow?.id, strikerId, nonStrikerId]);

  // Realtime update for this innings
  useEffect(() => {
    if (!matchId || !inningRow?.id) return;

    const channel = supabase
      .channel(`live-score-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ball_events", filter: `innings_id=eq.${inningRow.id}` },
        async () => {
          await fetchScoreFromView(matchId);
          if (strikerId && nonStrikerId) {
            const st = await fetchBatterStats(inningRow.id, strikerId, nonStrikerId);
            setStats(st);
          }
          await fetchLastBalls(inningRow.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, inningRow?.id, strikerId, nonStrikerId]);

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
          <Button variant="ghost" onClick={goReport}>
            Report
          </Button>
          <Button variant="ghost" onClick={goShare}>
            Share
          </Button>
        </div>
      }
    >
      {/* Add bottom padding so sticky pad doesn't hide content */}
      <div style={{ paddingBottom: CONTENT_BOTTOM_PAD }}>
        {loading ? (
          <Card>Loading…</Card>
        ) : (
          <>
            {/* Score Bug */}
            <Card className="relative overflow-hidden">
              <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

              <div className="relative flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-white/60 text-sm">Innings {inning.innings_no}</div>
                    <div className="text-4xl font-extrabold tracking-tight">
                      {inning.runs}
                      <span className="text-white/60">/{inning.wickets}</span>
                      <span className="text-white/45 text-lg font-semibold ml-2">({overTxt})</span>
                    </div>
                    <div className="text-white/60 text-sm mt-1">
                      CRR <span className="text-white/90 font-semibold">{crrTxt}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-white/60 text-sm">Batting</div>
                    <div className="text-lg font-bold">{batting.short}</div>
                    <div className="text-white/50 text-sm">{batting.team}</div>
                  </div>
                </div>

                {/* last balls */}
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white/60 text-sm">Last balls</div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {lastBalls.length ? (
                      lastBalls.slice(0, 6).map((t, i) => (
                        <ChipMini key={i} tone={tagTone(t)}>
                          {tagLabel(t)}
                        </ChipMini>
                      ))
                    ) : (
                      <span className="text-white/40 text-sm">—</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Players + batter stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-white/60 text-sm">Striker</div>
                    <div className="text-xl font-bold truncate">{striker?.name ?? "—"}</div>

                    <div className="mt-2 text-sm text-white/70 flex flex-wrap gap-x-4 gap-y-1">
                      <div>
                        <span className="text-white/90 font-semibold">{stats.striker.runs}</span>
                        <span className="text-white/60"> ({stats.striker.balls})</span>
                      </div>
                      <div className="text-white/60">
                        SR{" "}
                        <span className="text-white/90 font-semibold">
                          {strikeRate(stats.striker.runs, stats.striker.balls)}
                        </span>
                      </div>
                      <div className="text-white/60">
                        4s <span className="text-white/90 font-semibold">{stats.striker.fours}</span>
                      </div>
                      <div className="text-white/60">
                        6s <span className="text-white/90 font-semibold">{stats.striker.sixes}</span>
                      </div>
                    </div>
                  </div>
                  <Chip tone="blue">ON STRIKE</Chip>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white/60 text-sm">Non-striker</div>
                    <div className="text-lg font-semibold truncate">{nonStriker?.name ?? "—"}</div>

                    <div className="mt-2 text-sm text-white/70 flex flex-wrap gap-x-4 gap-y-1">
                      <div>
                        <span className="text-white/90 font-semibold">{stats.nonStriker.runs}</span>
                        <span className="text-white/60"> ({stats.nonStriker.balls})</span>
                      </div>
                      <div className="text-white/60">
                        SR{" "}
                        <span className="text-white/90 font-semibold">
                          {strikeRate(stats.nonStriker.runs, stats.nonStriker.balls)}
                        </span>
                      </div>
                      <div className="text-white/60">
                        4s <span className="text-white/90 font-semibold">{stats.nonStriker.fours}</span>
                      </div>
                      <div className="text-white/60">
                        6s <span className="text-white/90 font-semibold">{stats.nonStriker.sixes}</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" onClick={swapStrike} disabled={!strikerId || !nonStrikerId}>
                    Swap
                  </Button>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-white/60 text-sm">Bowler</div>
                    <div className="text-xl font-bold truncate">{bowler?.name ?? "—"}</div>
                  </div>
                  <Chip tone="neutral">{bowling.short}</Chip>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4 flex items-center justify-between">
                  <div className="text-white/60 text-sm">
                    Over: <span className="text-white/85 font-semibold">{overTxt}</span>
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

                {!canScore ? (
                  <div className="mt-4 text-xs text-white/50">Select striker, non-striker and bowler to start scoring.</div>
                ) : null}
              </Card>
            </div>

            {/* Toast */}
            {toast ? (
              <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
                <div className="px-4 py-2 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-xl text-sm">
                  {toast}
                </div>
              </div>
            ) : null}

            {/* Quick Edit */}
            {showQuickEdit ? (
              <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 pb-[340px] md:items-center md:pb-4">
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowQuickEdit(false)} />
                <Card className="relative w-full max-w-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">Quick Edit</div>
                    <Button variant="ghost" onClick={() => setShowQuickEdit(false)}>
                      Close
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <Button
                      variant="soft"
                      onClick={() => {
                        setShowQuickEdit(false);
                        setBowlerSearch("");
                        setShowBowlerPicker(true);
                      }}
                    >
                      Change Bowler
                    </Button>
                    <Button
                      variant="soft"
                      onClick={() => {
                        setShowQuickEdit(false);
                        setBatterSearch("");
                        setNextBatterId("");
                        setWicketOut("striker");
                        setShowWicketPicker(true);
                      }}
                    >
                      Change Batter
                    </Button>
                  </div>
                </Card>
              </div>
            ) : null}

            {/* Bowler Picker (SEARCH BOX) */}
            {showBowlerPicker ? (
  <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 pb-[340px] md:items-center md:pb-4">
    <div className="absolute inset-0 bg-black/60" onClick={() => setShowBowlerPicker(false)} />
    <Card className="relative w-full max-w-lg max-h-[calc(100vh-360px)] md:max-h-[85vh] overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">Change Bowler</div>
        <Button variant="ghost" onClick={() => setShowBowlerPicker(false)}>
          Close
        </Button>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="text-white/60 text-sm">Bowler name</div>

        <input
          value={bowlerName}
          onChange={(e) => setBowlerName(e.target.value)}
          placeholder="Type bowler name..."
          className="w-full h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/25"
        />

        <Button
          variant="soft"
          onClick={async () => {
            const id = await getOrCreatePlayerId(bowlerName);
            if (!id) return;
            setBowlerId(id);
            setShowBowlerPicker(false);
            pushToast("Bowler updated");
          }}
        >
          Save Bowler
        </Button>
      </div>
    </Card>
  </div>
) : null}


            {/* Wicket Picker (SEARCH BOX) */}
            {showWicketPicker ? (
              <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 pb-[340px] md:items-center md:pb-4">
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowWicketPicker(false)} />
                <Card className="relative w-full max-w-lg max-h-[calc(100vh-360px)] md:max-h-[85vh] overflow-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">Wicket / Change Batter</div>
                    <Button variant="ghost" onClick={() => setShowWicketPicker(false)}>
                      Close
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="text-white/60 text-sm">Who got out?</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant={wicketOut === "striker" ? "soft" : "ghost"} onClick={() => setWicketOut("striker")}>
                        Striker
                      </Button>
                      <Button
                        variant={wicketOut === "nonStriker" ? "soft" : "ghost"}
                        onClick={() => setWicketOut("nonStriker")}
                      >
                        Non-striker
                      </Button>
                    </div>

                    <div className="text-white/60 text-sm">Next batter</div>
                    <input
                      value={batterSearch}
                      onChange={(e) => setBatterSearch(e.target.value)}
                      placeholder="Type batter name…"
                      className="w-full h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/25"
                    />

                    <div className="grid gap-2 max-h-60 overflow-auto">
                      {availableNextBatters.length ? (
                        availableNextBatters.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setNextBatterId(p.id)}
                            className={`text-left px-4 py-3 rounded-xl border ${p.id === nextBatterId ? "bg-white/10 border-white/20" : "bg-black/20 border-white/10"
                              }`}
                          >
                            <div className="font-semibold">{p.name}</div>
                          </button>
                        ))
                      ) : (
                        <div className="text-white/50 text-sm">No players found.</div>
                      )}
                    </div>

                    <Button variant="danger" onClick={confirmWicket} disabled={!nextBatterId}>
                      Confirm Wicket
                    </Button>
                  </div>
                </Card>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Bottom Score Pad (Sticky + scrollable if tall) */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-black/50 backdrop-blur-xl border-t border-white/10 px-3 pb-3 pt-2 max-h-[45vh] overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-white/70">
                <span className="font-semibold text-white/90">Score Pad</span>{" "}
                <span className="text-white/50">• tap to add ball</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setBatterSearch("");
                    setNextBatterId("");
                    setWicketOut("striker");
                    setShowWicketPicker(true);
                  }}
                  disabled={!canScore}
                  className="h-9 rounded-xl px-3"
                >
                  Wicket
                </Button>

                <Button variant="ghost" onClick={undoLast} disabled={!inningRow?.id} className="h-9 rounded-xl px-3">
                  Undo
                </Button>
              </div>
            </div>

            {/* RUNS */}
            <div className="mt-3">
              <div className="text-[11px] text-white/50 mb-2">RUNS</div>
              <div className="grid grid-cols-7 gap-2">
                {(["0", "1", "2", "3", "4", "5", "6"] as NonWicketTag[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => applyBall(t)}
                    disabled={!canScore}
                    className={`h-11 rounded-2xl border text-base font-semibold transition active:scale-[0.98]
                    ${!canScore
                        ? "opacity-40 border-white/10 bg-white/5"
                        : t === "4" || t === "6"
                          ? "border-blue-400/25 bg-blue-500/15"
                          : "border-white/10 bg-white/8 hover:bg-white/12"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* EXTRAS */}
            <div className="mt-3">
              <div className="text-[11px] text-white/50 mb-2">EXTRAS</div>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { k: "WD", label: "Wide" },
                    { k: "NB", label: "No Ball" },
                    { k: "B", label: "Bye" },
                    { k: "LB", label: "Leg Bye" },
                  ] as { k: NonWicketTag; label: string }[]
                ).map((x) => (
                  <button
                    key={x.k}
                    onClick={() => applyBall(x.k)}
                    disabled={!canScore}
                    className={`h-11 rounded-2xl border text-sm font-semibold transition active:scale-[0.98]
                    ${!canScore
                        ? "opacity-40 border-white/10 bg-white/5"
                        : x.k === "WD" || x.k === "NB"
                          ? "border-purple-400/25 bg-purple-500/15"
                          : "border-white/10 bg-white/8 hover:bg-white/12"
                      }`}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-[11px] text-white/45">{canScore ? "Ready" : "Pick striker, non-striker & bowler"}</div>

              <button
                onClick={() => {
                  setWicketOut("striker");
                  setBatterSearch("");
                  setNextBatterId("");
                  setShowWicketPicker(true);
                }}
                disabled={!canScore}
                className={`h-11 rounded-2xl px-5 font-bold border transition active:scale-[0.98]
                ${!canScore
                    ? "opacity-40 border-white/10 bg-white/5"
                    : "border-red-400/25 bg-red-500/25 hover:bg-red-500/30"
                  }`}
              >
                W
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
