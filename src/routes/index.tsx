import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useProject } from "@/lib/project/store";
import { SECTIONS } from "@/lib/project/sections";
import { useAssets } from "@/lib/project/assets";
import { runChecks, sectionProgress } from "@/lib/project/review";
import { Card, PageHeader, Progress, StatusBadge, Badge, Button } from "@/components/app/kit";
import { MemberPicker, StatusSelect } from "@/components/app/SectionTask";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Tech Ventura Project Workspace" },
      { name: "description", content: "Track the 8-hour Tech Ventura group plan: members, tasks, status and progress." },
      { property: "og:title", content: "Dashboard | Tech Ventura Project Workspace" },
      { property: "og:description", content: "Track the 8-hour Tech Ventura group plan: members, tasks, status and progress." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, update, hydrated } = useProject();
  const { assets } = useAssets();
  const progress = SECTIONS.map((s) => sectionProgress(state, s.id, assets));
  const overall = Math.round(progress.reduce((a, b) => a + b, 0) / SECTIONS.length);
  const checks = runChecks(state, assets);
  const passed = checks.filter((c) => c.ok).length;
  const complete = SECTIONS.filter((s) => state.tasks[s.id].status === "complete").length;

  return (
    <>
      <PageHeader
        eyebrow="8-hour group work plan"
        title={`${state.company.name} workspace`}
        description={`Everything the group builds lives here, and the presentation is compiled live from it. Current placeholder product: ${state.company.productName}.`}
      >
        <Link to="/presentation">
          <Button variant="primary">Open presentation</Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs text-muted-foreground">Overall completion</p>
          <p className="mt-2 text-5xl font-normal tracking-[-1.3px] tabular-nums">{overall}%</p>
          <Progress value={overall} className="mt-4" />
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Sections marked complete</p>
          <p className="mt-2 text-5xl font-normal tracking-[-1.3px] tabular-nums">{complete}<span className="text-2xl text-muted-foreground">/8</span></p>
          <p className="mt-3 text-xs text-muted-foreground">Last edit {hydrated ? formatDistanceToNow(new Date(state.updatedAt), { addSuffix: true }) : "…"}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Review checklist</p>
          <p className="mt-2 text-5xl font-normal tracking-[-1.3px] tabular-nums">{passed}<span className="text-2xl text-muted-foreground">/{checks.length}</span></p>
          <Link to="/review" className="mt-3 inline-flex items-center gap-1 text-xs text-brand-soft hover:underline">See what is missing <ArrowUpRight className="size-3" /></Link>
        </Card>
      </div>

      <Card className="mt-4" title="Group members" subtitle="Work is split by workstream, not permanent roles. Anyone can claim, edit or review any task.">
        <div className="grid gap-2 sm:grid-cols-5">
          {state.members.map((m, i) => (
            <div key={m.id}>
              <label htmlFor={`mem-${m.id}`} className="mb-1 block text-[11px] text-muted-foreground">Member {i + 1}</label>
              <input id={`mem-${m.id}`} value={m.name} onChange={(e) => update((d) => { d.members[i].name = e.target.value; })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </div>
          ))}
        </div>
      </Card>

      <h2 className="mb-3 mt-10 text-xl font-normal tracking-tight">Eight-hour workflow</h2>
      <p className="mb-4 text-sm text-muted-foreground">Each hour has a suggested 60-minute timebox. It is a guide only, you can keep working past it.</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {SECTIONS.map((s, i) => {
          const t = state.tasks[s.id];
          return (
            <Card key={s.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] text-brand-soft">HOUR {s.hour} · {s.minutes} MIN SUGGESTED</p>
                  <h3 className="mt-1 text-base font-medium">{s.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{s.objective}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1">{s.deliverables.map((d) => <Badge key={d}>{d}</Badge>)}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr]">
                <StatusSelect section={s.id} />
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Assigned</p>
                  <MemberPicker section={s.id} />
                </div>
              </div>
              {t.reviewerNotes && <p className="mt-3 rounded-md bg-elevated px-3 py-2 text-xs text-subtle">Reviewer: {t.reviewerNotes}</p>}
              <div className="mt-auto flex items-center gap-3 pt-4">
                <Progress value={progress[i]} />
                <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{progress[i]}%</span>
                <Link to={s.path} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-brand-soft hover:underline">Open <ArrowUpRight className="size-3" /></Link>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
