import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

type Mode = "login" | "signup";

function GoogleIcon() {
  // Simple inline SVG (no external deps)
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.658 32.657 29.221 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 19.01 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.35 4.327-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.201 0-9.626-3.318-11.288-7.946l-6.522 5.025C9.492 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.24-2.231 4.151-4.084 5.565l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  );
}

export default function Auth() {
  const nav = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, go home
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) nav("/");
    });

    return () => sub.subscription.unsubscribe();
  }, [nav]);

  async function login() {
    setMsg(null);

    if (!email.trim()) return setMsg("Enter email.");
    if (!password) return setMsg("Enter password.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setMsg(error.message);
      // success -> onAuthStateChange will redirect to "/"
    } finally {
      setLoading(false);
    }
  }

  async function signup() {
    setMsg(null);

    if (!email.trim()) return setMsg("Enter email.");
    if (password.length < 6) return setMsg("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      // ✅ After signup, go to login step (as you requested)
      setMode("login");
      setPassword("");
      setMsg("Signup complete. Please login now.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) setMsg(error.message);
      // Google flow redirects; on return session will exist and redirect to "/"
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-md relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative">
          <div className="text-2xl font-extrabold tracking-tight">Live Scorer</div>
          <div className="text-white/60 mt-1">
            {mode === "login" ? "Login" : "Create your account."}
          </div>

          {/* Google auth */}
          <div className="mt-6">
            <Button
              className="w-full flex items-center justify-center gap-2"
              variant="soft"
              onClick={signInWithGoogle}
              disabled={loading}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-white/40 text-xs mt-4">
              <div className="h-px flex-1 bg-white/10" />
              <div>OR</div>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          {/* Email auth */}
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm text-white/60 mb-2">Email</div>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="text-sm text-white/60 mb-2">Password</div>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {msg ? (
              <div className="text-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                {msg}
              </div>
            ) : null}

            {mode === "login" ? (
              <Button className="w-full" onClick={login} disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            ) : (
              <Button className="w-full" onClick={signup} disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            )}

            <div className="flex items-center justify-between text-sm">
              <button
                className="text-white/70 hover:text-white underline"
                type="button"
                onClick={() => {
                  setMsg(null);
                  setPassword("");
                  setMode(mode === "login" ? "signup" : "login");
                }}
                disabled={loading}
              >
                {mode === "login" ? "Create account" : "I already have an account"}
              </button>

              {/* Optional */}
              <button
                className="text-white/50 hover:text-white underline"
                type="button"
                disabled={loading}
                onClick={async () => {
                  setMsg(null);
                  if (!email.trim()) return setMsg("Enter email to reset password.");
                  setLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: window.location.origin,
                  });
                  setLoading(false);
                  if (error) setMsg(error.message);
                  else setMsg("Password reset email sent.");
                }}
              >
                Forgot password?
              </button>
            </div>

          </div>
        </div>
      </Card>
    </div>
  );
}
