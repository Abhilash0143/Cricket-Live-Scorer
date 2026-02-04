import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../lib/useSession";

export default function RequireAuth() {
  const { session, loading } = useSession();
  const loc = useLocation();

  if (loading) return null;

  // 🔥 Hard proof in console
  console.log("RequireAuth session:", session);

  if (!session) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;

  return <Outlet />;
}
