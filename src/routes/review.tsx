import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useProject } from "@/lib/project/store";
import { useAssets } from "@/lib/project/assets";
import { runChecks } from "@/lib/project/review";
import { SECTIONS } from "@/lib/project/sections";
import { Card, PageHeader, Progress } from "@/components/app/kit";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review checklist | Tech Ventura" },
      { name: "description", content: "Automatic checks for missing deliverables, content quantities, labels and presentation timing." },
      { property: "og:title", content: "Review checklist | Tech Ventura" },
      { property: "og:description", content: "Automatic checks for missing deliverables, content quantities, labels and presentation timing." },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { state } = useProject();
  const { assets } = useAssets();
  const checks = runChecks(state, assets);
  const ok = checks.filter((c) => c.ok).length;
  return (
    <>
      <PageHeader eyebrow="Quality gate" title="Review checklist" description="Checks run live against the saved content. Fix the flagged items before presenting." />
      <Card>
        <div className="flex items-center gap-4">
          <p className="text-4xl tabular-nums">{ok}/{checks.length}</p>
          <Progress value={(ok / checks.length) * 100} />
        </div>
      </Card>
      <div className="mt-4 space-y-4">
        {SECTIONS.map((s) => {
          const list = checks.filter((c) => c.section === s.id);
          if (!list.length) return null;
          return (
            <Card key={s.id} title={`H${s.hour} ${s.title}`} action={<Link to={s.path} className="text-xs text-brand-soft hover:underline">Go to section</Link>}>
              <ul className="space-y-2">
                {list.map((c) => (
                  <li key={c.id} className="flex items-start gap-3">
                    {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleAlert className={c.partial ? "mt-0.5 size-4 shrink-0 text-brand-soft" : "mt-0.5 size-4 shrink-0 text-warning"} />}
                    <div>
                      <p className="text-sm">{c.label}{c.partial && <span className="ml-2 rounded-full border border-border-strong px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-brand-soft">Partial</span>}</p>
                      <p className="text-xs text-muted-foreground">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
