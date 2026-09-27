import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, Building2, ClipboardCheck, LayoutDashboard, Megaphone, Menu, MonitorPlay, Package, Sparkles, Users, X, RotateCcw, FolderOpen, LogIn, LogOut } from "lucide-react";
import { useProject } from "@/lib/project/store";
import { useAuth } from "@/lib/project/auth";
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
  const { state, reset, sync, syncError } = useProject();
  const { session, signOut } = useAuth();
  const syncText = !session ? "Not signed in: saved in this browser only. Sign in to share edits and files with your teammates." : sync === "loading" ? "Connecting to the shared workspace…" : sync === "saving" ? "Saving to the shared workspace…" : sync === "error" ? `Shared save failed: ${syncError}. Your edits stay in this browser until it works again.` : "Shared with the team. Edits appear on everyone's devices. If two people edit at the same moment, the last save wins.";
  const [confirm, setConfirm] = useState(false);

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
        <p className={sync === "error" ? "text-destructive" : undefined}>{syncText}</p>
        {session ? (
          <div className="flex items-center justify-between gap-2"><span className="truncate">{session.user.email}</span><Button size="sm" variant="ghost" onClick={signOut} aria-label="Sign out"><LogOut className="size-3.5" /></Button></div>
        ) : (
          <Link to="/auth" className="inline-flex items-center gap-1.5 text-brand-soft"><LogIn className="size-3.5" /> Sign in</Link>
        )}
        {confirm ? (
          <div className="space-y-2">
            <p className="text-destructive">Erase all edits and restore starter content?</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="danger" className="border border-destructive/40" onClick={() => { reset(); setConfirm(false); }}>Yes, reset</Button>
              <Button size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="-ml-2" onClick={() => setConfirm(true)}>
            <RotateCcw className="size-3.5" /> Reset to demo data
          </Button>
        )}
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
