import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../ui/Card";

type Data = {
  match: { title: string; match_type: string; status: string } | null;
  teams: { id: string; name: string; short_name: string | null }[];
  inningsScore: { innings_no: number; runs: number; wickets: number; legal_balls: number }[];
};

export default function PublicScoreboard() {
  const { token } = useParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string>("");

  async function load() {
    try {
      setError("");
      const base = import.meta.env.VITE_PUBLIC_SCOREBOARD_FN_URL as string;
      const res = await fetch(`${base}?token=${token}`);
      if (!res.ok) throw new Error("Invalid/expired link");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message ?? "Failed");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000); // simple polling for public viewers
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <div className="text-xl font-bold">Live Score</div>
          <div className="text-white/60 mt-2">{error}</div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>Loading…</Card>
      </div>
    );
  }

  const inn = data.inningsScore?.[0];
  const overs = inn ? `${Math.floor(inn.legal_balls / 6)}.${inn.legal_balls % 6}` : "0.0";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-2xl font-bold">{data.match?.title ?? "Match"}</div>
      <div className="text-white/60 mt-1">{data.match?.match_type} • {data.match?.status}</div>

      <Card className="mt-6">
        <div className="text-white/60 text-sm">Score</div>
        <div className="text-4xl font-bold mt-1">
          {inn ? `${inn.runs}/${inn.wickets}` : "0/0"}
        </div>
        <div className="text-white/60 mt-2">Overs: <span className="text-white">{overs}</span></div>
        <div className="text-white/40 text-xs mt-4">Auto-refreshing…</div>
      </Card>
    </div>
  );
}
