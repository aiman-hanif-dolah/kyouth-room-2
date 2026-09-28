import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useProject, uid, memberName } from "@/lib/project/store";
import { Badge, Button, Card, CopyButton, PageHeader, RowControls, Select, move } from "@/components/app/kit";
import { SectionTaskPanel } from "@/components/app/SectionTask";
import { SECTIONS } from "@/lib/project/sections";
import { PROMPT_CATEGORIES, type PromptCategory, type SectionId } from "@/lib/project/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prompts")({
  head: () => ({
    meta: [
      { title: "Prompt library | Tech Ventura" },
      { name: "description", content: "30 categorised prompt templates plus a log of prompts the group actually used." },
      { property: "og:title", content: "Prompt library | Tech Ventura" },
      { property: "og:description", content: "30 categorised prompt templates plus a log of prompts the group actually used." },
    ],
  }),
  component: PromptsPage,
});

const sectionOpts = SECTIONS.map((s) => ({ value: s.id, label: `H${s.hour} ${s.title}` }));
const inp = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";

function PromptsPage() {
  const { state, update, canEdit } = useProject();
  const u = (fn: (d: typeof state) => void) => update(fn, "s7");
  const [cat, setCat] = useState<PromptCategory | "All">("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = state.prompts.map((p, i) => ({ p, i })).filter(({ p }) => (cat === "All" || p.category === cat) && (p.title + p.text).toLowerCase().includes(q.toLowerCase()));
  const n = state.prompts.length;

  return (
    <>
      <PageHeader eyebrow="Hour 7" title="Prompt library" description="Templates are planned prompts. Only entries in the 'Actually used' log count as prompts the group ran." />
      <SectionTaskPanel sections={["s7"]} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={n >= 20 && n <= 40 ? "success" : "danger"}>{n} templates (target 20 to 40)</Badge>
        {(["All", ...PROMPT_CATEGORIES] as const).map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={cn("rounded-full border px-3 py-1 text-xs", cat === c ? "border-brand bg-brand/10" : "border-border-strong text-muted-foreground")}>
            {c} {c !== "All" && <span className="text-muted-foreground">({state.prompts.filter((p) => p.category === c).length})</span>}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <input aria-label="Search prompts" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 rounded-lg border border-input bg-card pl-8 pr-3 text-sm" />
        </div>
        {canEdit && (
          <Button size="sm" variant="primary" disabled={n >= 40} title={n >= 40 ? "Library is at the 40 prompt maximum" : undefined} onClick={() => { const id = uid(); u((d) => { d.prompts.unshift({ id, title: "New prompt", category: cat === "All" ? "Ideation" : cat, purpose: "", text: "", section: "s1", variables: "", notes: "" }); }); setOpen(id); }}><Plus className="size-3.5" /> New prompt</Button>
        )}
      </div>

      <div className="space-y-2">
        {shown.map(({ p, i }) => {
          const isOpen = open === p.id;
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-6 font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="min-w-0 flex-1 text-left">
                  <span className="text-sm font-medium">{p.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{p.purpose}</span>
                </button>
                <Badge tone="brand">{p.category}</Badge>
                <Badge>Template</Badge>
                <CopyButton text={p.text} label="Copy" />
                <RowControls index={i} length={n} onMove={(dir) => u((d) => move(d.prompts, i, dir))} onDelete={() => u((d) => { d.prompts.splice(i, 1); })} />
              </div>
              {isOpen && (
                <div className="grid gap-3 border-t border-border p-4 md:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    Title
                    <input
                      value={p.title}
                      readOnly={!canEdit}
                      disabled={!canEdit}
                      onChange={(e) => u((d) => { d.prompts[i].title = e.target.value; })}
                      className={cn(inp, "mt-1 text-foreground", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Purpose
                    <input
                      value={p.purpose}
                      readOnly={!canEdit}
                      disabled={!canEdit}
                      onChange={(e) => u((d) => { d.prompts[i].purpose = e.target.value; })}
                      className={cn(inp, "mt-1 text-foreground", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
                    />
                  </label>
                  <Select<PromptCategory> label="Category" value={p.category} onChange={(v) => u((d) => { d.prompts[i].category = v; })} options={PROMPT_CATEGORIES.map((c) => ({ value: c, label: c }))} />
                  <Select<SectionId> label="Related section" value={p.section} onChange={(v) => u((d) => { d.prompts[i].section = v; })} options={sectionOpts} />
                  <label className="text-xs text-muted-foreground md:col-span-2">
                    Full prompt text
                    <textarea
                      rows={4}
                      value={p.text}
                      readOnly={!canEdit}
                      disabled={!canEdit}
                      onChange={(e) => u((d) => { d.prompts[i].text = e.target.value; })}
                      className={cn(inp, "mt-1 font-mono text-[13px] text-foreground", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default resize-none")}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Input variables
                    <input
                      value={p.variables}
                      placeholder={canEdit ? "{product}, {city}" : ""}
                      readOnly={!canEdit}
                      disabled={!canEdit}
                      onChange={(e) => u((d) => { d.prompts[i].variables = e.target.value; })}
                      className={cn(inp, "mt-1 text-foreground", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    What was improved
                    <input
                      value={p.notes}
                      placeholder={canEdit ? "e.g. added RM and 'do not invent stats'" : ""}
                      readOnly={!canEdit}
                      disabled={!canEdit}
                      onChange={(e) => u((d) => { d.prompts[i].notes = e.target.value; })}
                      className={cn(inp, "mt-1 text-foreground", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
        {shown.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No prompts match.</p>}
      </div>

      <UsedLog />
    </>
  );
}

function UsedLog() {
  const { state, update, canEdit } = useProject();
  const u = (fn: (d: typeof state) => void) => update(fn, "s7");
  const blank = { memberId: state.members[0].id, tool: "", section: "s1" as SectionId, prompt: "", outputSummary: "", howChecked: "" };
  const [f, setF] = useState(blank);
  const valid = f.tool.trim() && f.prompt.trim();

  return (
    <Card className="mt-10" title="Actually used prompts log" subtitle="Record a prompt only after a member really ran it. This feeds the presentation's prompt engineering section.">
      {canEdit && (
        <div className="grid gap-2 rounded-lg border border-border bg-background p-3 md:grid-cols-3">
          <Select label="Member" value={f.memberId} onChange={(v) => setF({ ...f, memberId: v })} options={state.members.map((m) => ({ value: m.id, label: m.name }))} />
          <label className="text-xs text-muted-foreground">AI tool<input value={f.tool} onChange={(e) => setF({ ...f, tool: e.target.value })} placeholder="ChatGPT, Claude, Copilot…" className={cn(inp, "mt-1.5 text-foreground")} /></label>
          <Select<SectionId> label="Section" value={f.section} onChange={(v) => setF({ ...f, section: v })} options={sectionOpts} />
          <label className="text-xs text-muted-foreground md:col-span-3">Exact prompt used<textarea rows={2} value={f.prompt} onChange={(e) => setF({ ...f, prompt: e.target.value })} className={cn(inp, "mt-1 text-foreground")} /></label>
          <label className="text-xs text-muted-foreground md:col-span-1">Output summary<input value={f.outputSummary} onChange={(e) => setF({ ...f, outputSummary: e.target.value })} className={cn(inp, "mt-1 text-foreground")} /></label>
          <label className="text-xs text-muted-foreground md:col-span-2">How the output was checked<input value={f.howChecked} onChange={(e) => setF({ ...f, howChecked: e.target.value })} placeholder="e.g. compared prices with 3 Shopee listings" className={cn(inp, "mt-1 text-foreground")} /></label>
          <div className="md:col-span-3">
            <Button variant="primary" size="sm" disabled={!valid} title={!valid ? "Tool and prompt are required" : undefined} onClick={() => { u((d) => { d.usedPrompts.unshift({ ...f, id: uid(), date: new Date().toISOString() }); }); setF(blank); }}>Log prompt</Button>
          </div>
        </div>
      )}
      <div className={cn("space-y-2", canEdit && "mt-4")}>
        {state.usedPrompts.length === 0 && <p className="text-sm text-muted-foreground">Nothing logged yet.</p>}
        {state.usedPrompts.map((x, i) => (
          <div key={x.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success">Used</Badge>
              <span className="text-xs text-muted-foreground">{memberName(state, x.memberId)} · {x.tool} · H{x.section.slice(1)} · {new Date(x.date).toLocaleDateString("en-MY")}</span>
              {canEdit && (
                <Button size="sm" variant="danger" className="ml-auto" onClick={() => u((d) => { d.usedPrompts.splice(i, 1); })}>Delete</Button>
              )}
            </div>
            <p className="mt-2 font-mono text-[13px] text-subtle">{x.prompt}</p>
            {x.outputSummary && <p className="mt-1 text-xs text-muted-foreground">Output: {x.outputSummary}</p>}
            {x.howChecked && <p className="text-xs text-muted-foreground">Checked: {x.howChecked}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
