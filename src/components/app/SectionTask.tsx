import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useProject } from "@/lib/project/store";
import { sectionById } from "@/lib/project/sections";
import { STATUS_LABEL, type SectionId, type Status } from "@/lib/project/types";
import { Area, Badge, Button, ProvenanceBadge, Select, StatusBadge } from "./kit";
import { cn } from "@/lib/utils";

export function MemberPicker({ section }: { section: SectionId }) {
  const { state, update } = useProject();
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
            onClick={() =>
              update((d) => {
                const a = d.tasks[section].assignees;
                d.tasks[section].assignees = on ? a.filter((x) => x !== m.id) : [...a, m.id];
              })
            }
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              on ? "border-brand bg-brand/15 text-foreground" : "border-border-strong text-muted-foreground hover:text-foreground",
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
  const { state, update } = useProject();
  return (
    <Select<Status>
      label="Status"
      value={state.tasks[section].status}
      onChange={(v) => update((d) => { d.tasks[section].status = v; })}
      options={(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
    />
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
  const { state, update } = useProject();
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
              <input type="checkbox" checked={t.verified} onChange={(e) => update((d) => { d.tasks[section].verified = e.target.checked; })} className="accent-[var(--brand)]" />
              Group has checked and verified this content
            </label>
            <Button size="sm" variant="primary" disabled={t.status === "complete"} onClick={() => update((d) => { d.tasks[section].status = "complete"; })}>
              Mark complete
            </Button>
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
