import { Routes, Route, Navigate } from "react-router-dom";
import Lobby from "./pages/Lobby";
import NewMatch from "./pages/NewMatch";
import Score from "./pages/Score";
import Share from "./pages/Share";
import Auth from "./pages/Auth";
import RequireAuth from "./pages/RequireAuth";
import Report from "./pages/Report";


export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/s/:token" element={<Share />} />

      {/* Protected */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Lobby />} />
        <Route path="/new" element={<NewMatch />} />
        <Route path="/m/:matchId/score" element={<Score />} />
        <Route path="/m/:matchId/report" element={<Report />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
