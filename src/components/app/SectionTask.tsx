import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useReviews } from "@/lib/project/reviews";
import { useProject } from "@/lib/project/store";
import { sectionById } from "@/lib/project/sections";
import type { SectionId } from "@/lib/project/types";
import { Area, Badge, ProvenanceBadge, StatusBadge } from "./kit";
import { cn } from "@/lib/utils";

export function MemberPicker({ section }: { section: SectionId }) {
  const { state, update, canEdit } = useProject();
  const t = state.tasks[section];
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Assign members">
      {state.members.map((m) => {
        const on = t.assignees.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={on}
            disabled={!canEdit}
            onClick={() =>
              canEdit &&
              update((d) => {
                const a = d.tasks[section].assignees;
                d.tasks[section].assignees = on ? a.filter((x) => x !== m.id) : [...a, m.id];
              })
            }
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              on ? "border-brand bg-brand/15 text-foreground" : "border-border-strong text-muted-foreground",
              canEdit && !on && "hover:text-foreground",
              !canEdit && "cursor-default"
            )}
          >
            {m.name || "Unnamed"}
          </button>
        );
      })}
    </div>
  );
}

export function StatusSelect({ section }: { section: SectionId }) {
  const { state } = useProject();
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Status (set by AI review)</p>
      <StatusBadge status={state.tasks[section].status} />
    </div>
  );
}

/** Evidence, missing items and suggested fixes from the latest automatic AI review. */
export function AiReviewBox({ section, compact }: { section: SectionId; compact?: boolean }) {
  const { reviews, stale } = useReviews();
  const r = reviews[section];
  const res = r?.result ?? {};
  const state = stale.has(section) || r?.review_state === "updating" ? "Updating, content changed since last review" : r?.review_state === "error" || r?.review_state === "paused" ? r.error : "";
  const when = r?.reviewed_at ? new Date(r.reviewed_at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" }) : "";
  const List = ({ title, items, tone }: { title: string; items?: string[] | undefined; tone: string }) =>
    items && items.length ? (
      <div>
        <p className={cn("mb-1 text-xs font-medium", tone)}>{title}</p>
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-subtle">{items.slice(0, compact ? 3 : 8).map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
    ) : null;
  return (
    <div className="space-y-2 rounded-lg border border-border bg-elevated/40 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Sparkles className="size-3.5 text-brand-soft" />
        <span className="font-medium">AI review</span>
        <span className="text-muted-foreground">{when ? `Last reviewed ${when}` : "Not reviewed yet"}</span>
        {state && <span className={cn("rounded-full border px-2 py-0.5", r?.review_state === "error" || r?.review_state === "paused" ? "border-warning text-warning" : "border-border-strong text-brand-soft")}>{state}</span>}
      </div>
      {res.summary && <p className="text-xs text-muted-foreground">{res.summary}</p>}
      <List title="Evidence that aligns" items={res.aligned} tone="text-success" />
      <List title="Missing" items={res.missing} tone="text-warning" />
      <List title="Issues and contradictions" items={res.issues} tone="text-warning" />
      {!compact && <List title="Suggested fixes (apply them yourselves)" items={res.suggestions} tone="text-brand-soft" />}
      {!compact && <p className="text-[11px] text-muted-foreground">Reviews run automatically about 20 seconds after saved changes in Edit mode. Each review uses AI credits, so edits are batched and unchanged content is skipped.</p>}
    </div>
  );
}

/** Collapsible workflow panel shown at top of every section page */
export function SectionTaskPanel({ sections }: { sections: SectionId[] }) {
  return (
    <div className="mb-6 space-y-2">
      {sections.map((s) => (
        <TaskRow key={s} section={s} />
      ))}
    </div>
  );
}

function TaskRow({ section }: { section: SectionId }) {
  const { state, update, canEdit } = useProject();
  const [open, setOpen] = useState(false);
  const meta = sectionById(section);
  const t = state.tasks[section];
  return (
    <div className="rounded-xl border border-border bg-card">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
        <span className="font-mono text-xs text-brand-soft">H{meta.hour}</span>
        <span className="text-sm font-medium">{meta.title}</span>
        <StatusBadge status={t.status} />
        <ProvenanceBadge section={section} />
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Suggested {meta.minutes} min
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <div className="px-4 pb-3"><AiReviewBox section={section} /></div>
      {open && (
        <div className="grid gap-5 border-t border-border p-4 md:grid-cols-3">
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{meta.objective}</p>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Tasks</p>
              <ul className="list-disc space-y-0.5 pl-4 text-subtle">{meta.tasks.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Deliverables</p>
              <div className="flex flex-wrap gap-1">{meta.deliverables.map((x) => <Badge key={x}>{x}</Badge>)}</div>
            </div>
          </div>
          <div className="space-y-3">
            <StatusSelect section={section} />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Assigned members (anyone can claim)</p>
              <MemberPicker section={section} />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={t.verified}
                disabled={!canEdit}
                onChange={(e) => update((d) => { d.tasks[section].verified = e.target.checked; })}
                className="accent-[var(--brand)]"
              />
              Group has checked and verified this content
            </label>
          </div>
          <div className="space-y-3">
            <Area label="Reviewer notes" rows={2} optional value={t.reviewerNotes} onChange={(v) => update((d) => { d.tasks[section].reviewerNotes = v; })} />
            <Area label="AI prompt log for this hour (quick notes)" rows={2} optional value={t.promptLog} onChange={(v) => update((d) => { d.tasks[section].promptLog = v; })} placeholder="Tool used, prompt, what changed…" />
          </div>
        </div>
      )}
    </div>
  );
}
