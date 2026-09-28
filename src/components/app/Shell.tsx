import { useEffect, useState, type ReactNode } from "react";

// On-screen emoji keyboard for the emoji passcode. Append-only keys plus
// backspace; the typed sequence is compared server-side like the text code.
const EMOJI_KEYS = ["😎", "🔥", "🚀", "🌙", "⭐", "🍌", "🎨", "💡", "🐝", "🌺", "🏆", "❤️"];
import { Link } from "@tanstack/react-router";
import { Briefcase, Building2, ClipboardCheck, LayoutDashboard, Megaphone, Menu, MonitorPlay, Package, Sparkles, Users, X, FolderOpen, Lock, PencilLine } from "lucide-react";
import { useProject } from "@/lib/project/store";
import { useEditMode } from "@/lib/project/editmode";
import { useAssets } from "@/lib/project/assets";
import { Button } from "./kit";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/company", label: "Company", icon: Building2 },
  { to: "/business", label: "Business Plan", icon: Briefcase },
  { to: "/product", label: "Product", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/marketing", label: "Marketing", icon: Megaphone },
  { to: "/prompts", label: "Prompt Library", icon: Sparkles },
  { to: "/assets", label: "Project assets", icon: FolderOpen },
  { to: "/presentation", label: "Presentation", icon: MonitorPlay },
  { to: "/review", label: "Review checklist", icon: ClipboardCheck },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { state, sync, syncError } = useProject();
  const { canEdit, unlock, lock } = useEditMode();
  const { primaryLogoId } = useAssets();

  // Keep the browser tab icon (favicon) in step with the chosen main logo without a reload.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = primaryLogoId ? `/api/public/icon?v=${primaryLogoId}` : "/favicon.ico";
  }, [primaryLogoId]);
  const syncText = !canEdit
    ? "Published view: read-only, same content for everyone. Switch to Edit with the passcode to change content or upload files."
    : sync === "loading" ? "Connecting to the shared workspace…" : sync === "saving" ? "Saving to the shared workspace…" : sync === "error" ? `Shared save failed: ${syncError}. Your edits stay in this browser until it works again.` : "Edit mode. Changes save to the shared workspace and appear on everyone's devices. If two people edit at the same moment, the last save wins.";
  const [askCode, setAskCode] = useState(false);
  const [code, setCode] = useState("");
  const [badCode, setBadCode] = useState(false);
  const [checking, setChecking] = useState(false);

  const submitCode = async () => {
    setChecking(true);
    const ok = await unlock(code);
    setChecking(false);
    if (ok) { setAskCode(false); setCode(""); setBadCode(false); }
    else setBadCode(true);
  };

  const modeToggle = (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1" role="group" aria-label="Workspace mode">
        <button
          type="button"
          aria-pressed={!canEdit}
          onClick={() => canEdit && lock()}
          className={cn("flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors", !canEdit ? "bg-brand font-medium text-brand-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Lock className="size-3" /> Published
        </button>
        <button
          type="button"
          aria-pressed={canEdit}
          onClick={() => !canEdit && setAskCode(true)}
          className={cn("flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors", canEdit ? "bg-brand font-medium text-brand-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <PencilLine className="size-3" /> Edit
        </button>
      </div>
      {askCode && !canEdit && (
        <form
          className="mt-2 space-y-1.5"
          onSubmit={(e) => { e.preventDefault(); submitCode(); }}
        >
          <input
            type="password"
            autoFocus
            value={code}
            onChange={(e) => { setCode(e.target.value); setBadCode(false); }}
            placeholder="Passcode"
            aria-label="Edit passcode"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">Emoji keyboard (emoji passcode works too):</p>
            <div className="grid grid-cols-6 gap-1" role="group" aria-label="Emoji keyboard">
              {EMOJI_KEYS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Emoji ${e}`}
                  onClick={() => { setCode((c) => c + e); setBadCode(false); }}
                  className="rounded-md border border-border bg-background py-1 text-base leading-none transition-colors hover:bg-sidebar-accent"
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                aria-label="Delete last emoji"
                onClick={() => { setCode((c) => Array.from(c).slice(0, -1).join("")); setBadCode(false); }}
                className="rounded-md border border-border bg-background py-1 text-xs leading-none text-muted-foreground transition-colors hover:bg-sidebar-accent"
              >
                ⌫
              </button>
            </div>
          </div>
          {badCode && <p className="text-[11px] text-destructive">Incorrect passcode.</p>}
          <div className="flex gap-1.5">
            <Button size="sm" variant="brand" disabled={checking || !code} onClick={submitCode}>{checking ? "Checking…" : "Unlock"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAskCode(false); setCode(""); setBadCode(false); }}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: to === "/" }}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          activeProps={{ className: "bg-sidebar-accent !text-foreground shadow-[inset_2px_0_0_var(--brand)]" }}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );

  const side = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2.5 px-2">
        <div className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-semibold text-brand-foreground">TV</div>
        <div>
          <p className="text-sm font-medium leading-tight">{state.company.name}</p>
          <p className="text-[11px] text-muted-foreground">Project workspace</p>
        </div>
      </div>
      {nav}
      <div className="mt-auto space-y-3 rounded-lg border border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
        {modeToggle}
        <p className={sync === "error" ? "text-destructive" : undefined}>{syncText}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">{side}</aside>
      <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="text-sm font-medium">{state.company.name}</span>
        <Button size="sm" variant="ghost" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="size-5" />
        </Button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70" onClick={() => setOpen(false)} />
          <aside className={cn("absolute inset-y-0 left-0 w-64 border-r border-border bg-sidebar")}>
            <Button size="sm" variant="ghost" aria-label="Close menu" className="absolute right-2 top-3" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
            {side}
          </aside>
        </div>
      )}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
