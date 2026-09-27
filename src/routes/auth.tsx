import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button, Card, PageHeader } from "@/components/app/kit";
import { useAuth } from "@/lib/project/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Tech Ventura workspace" },
      { name: "description", content: "Sign in so the five teammates share one project workspace and file library." },
      { property: "og:title", content: "Sign in | Tech Ventura workspace" },
      { property: "og:description", content: "Sign in so the five teammates share one project workspace and file library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, signOut } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  if (session) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Card title="Signed in" subtitle={session.user.email ?? ""}>
          <div className="flex gap-2">
            <Button onClick={() => nav({ to: "/" })}>Go to dashboard</Button>
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </Card>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    const r = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (r.error) return setMsg(r.error.message);
    if (mode === "up" && !r.data.session) return setMsg("Check your email to confirm your account, then sign in.");
    nav({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PageHeader eyebrow="Team access" title={mode === "in" ? "Sign in" : "Create account"} description="Each teammate signs in with their own account. Everyone then sees and edits the same shared project and files." />
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-3">
          <input className={inp} type="email" required placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inp} type="password" required minLength={6} placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" disabled={busy} className="w-full">{mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
        <Button variant="ghost" className="mt-2 w-full" onClick={async () => {
          const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
          if (r.error) setMsg(String((r.error as any).message ?? r.error));
        }}>Continue with Google</Button>
        {msg && <p className="mt-3 text-sm text-warning">{msg}</p>}
        <button className="mt-4 text-sm text-brand-soft underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New teammate? Create an account" : "Already have an account? Sign in"}
        </button>
      </Card>
    </div>
  );
}
