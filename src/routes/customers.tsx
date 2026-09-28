import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useProject, uid } from "@/lib/project/store";
import { Badge, Button, Card, PageHeader, RowControls, move } from "@/components/app/kit";
import { SectionTaskPanel } from "@/components/app/SectionTask";
import type { JourneyStage, Persona } from "@/lib/project/types";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers and personas | Tech Ventura" },
      { name: "description", content: "Malaysian demographic segmentation, persona composites and the customer journey map." },
      { property: "og:title", content: "Customers and personas | Tech Ventura" },
      { property: "og:description", content: "Malaysian demographic segmentation, persona composites and the customer journey map." },
    ],
  }),
  component: CustomersPage,
});

const PERSONA_FIELDS: { key: keyof Persona; label: string }[] = [
  { key: "location", label: "Location" },
  { key: "occupation", label: "Occupation" },
  { key: "income", label: "Income" },
  { key: "goals", label: "Goals" },
  { key: "frustrations", label: "Frustrations" },
  { key: "behaviours", label: "Behaviours" },
];

const JOURNEY_ROWS: { key: keyof JourneyStage; label: string }[] = [
  { key: "actions", label: "Customer actions" },
  { key: "questions", label: "Questions" },
  { key: "pains", label: "Pain points" },
  { key: "touchpoints", label: "Touchpoints" },
  { key: "opportunities", label: "Opportunities" },
];

const cell = "w-full resize-none rounded-md bg-transparent p-1.5 text-xs leading-relaxed hover:bg-elevated focus:bg-elevated focus:outline-none";

function CustomersPage() {
  const { state, update, canEdit } = useProject();
  const c = state.customers;
  const u = (fn: (d: typeof c) => void) => update((d) => fn(d.customers), "s5");

  return (
    <>
      <PageHeader eyebrow="Hour 5" title="Target demographics and personas" description="Everything here is a hypothesis to test with real customers, not research findings." />
      <SectionTaskPanel sections={["s5"]} />

      <Card title="Demographic segmentation" action={<Badge tone="warning">Hypothesis</Badge>}>
        <div className="grid gap-2 md:grid-cols-2">
          {c.segments.map((s, i) => (
            <div key={s.label} className="rounded-lg border border-border bg-background p-3">
              <label htmlFor={`seg-${i}`} className="text-xs font-medium text-brand-soft">{s.label}</label>
              <textarea
                id={`seg-${i}`}
                rows={2}
                value={s.value}
                readOnly={!canEdit}
                disabled={!canEdit}
                onChange={(e) => u((d) => { d.segments[i].value = e.target.value; })}
                className={cn(cell, !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default resize-none")}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-xl font-normal tracking-tight">Customer personas</h2>
        {canEdit && (
          <Button size="sm" disabled={c.personas.length >= 3} title={c.personas.length >= 3 ? "The brief asks for 2 to 3 personas" : undefined} onClick={() => u((d) => { d.personas.push({ id: uid(), name: "New persona (persona composite)", age: "", location: "", occupation: "", income: "", goals: "", frustrations: "", behaviours: "", quote: "" }); })}><Plus className="size-3.5" /> Persona</Button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {c.personas.map((p, i) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="grid size-12 place-items-center rounded-full bg-brand/15 text-lg text-brand-soft">{p.name.slice(0, 1)}</div>
              <RowControls index={i} length={c.personas.length} onMove={(dir) => u((d) => move(d.personas, i, dir))} onDelete={() => u((d) => { d.personas.splice(i, 1); })} />
            </div>
            <input
              aria-label="Persona name"
              value={p.name}
              readOnly={!canEdit}
              disabled={!canEdit}
              onChange={(e) => u((d) => { d.personas[i].name = e.target.value; })}
              className={cn("mt-3 w-full bg-transparent text-base font-medium focus:outline-none", !canEdit && "cursor-default")}
            />
            <Badge tone="warning" className="mt-1">Composite, not a real person</Badge>
            <textarea
              aria-label="Quote"
              rows={2}
              value={p.quote}
              readOnly={!canEdit}
              disabled={!canEdit}
              onChange={(e) => u((d) => { d.personas[i].quote = e.target.value; })}
              className={cn("mt-3 w-full resize-none border-l-2 border-brand bg-transparent pl-3 text-sm italic text-subtle focus:outline-none", !canEdit && "cursor-default")}
            />
            <dl className="mt-3 space-y-1">
              {PERSONA_FIELDS.map((f) => (
                <div key={f.key}>
                  <dt className="text-[11px] text-muted-foreground">{f.label}</dt>
                  <dd>
                    <textarea
                      aria-label={f.label}
                      rows={f.key === "location" || f.key === "income" || f.key === "occupation" ? 1 : 2}
                      value={p[f.key]}
                      readOnly={!canEdit}
                      disabled={!canEdit}
                      onChange={(e) => u((d) => { d.personas[i][f.key] = e.target.value; })}
                      className={cn(cell, !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default resize-none")}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      <Card className="mt-8" title="Customer journey map" action={<Button size="sm" onClick={() => u((d) => { d.journey.push({ id: uid(), stage: "New stage", actions: "", questions: "", pains: "", touchpoints: "", opportunities: "" }); })}><Plus className="size-3.5" /> Stage</Button>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-left">
            <thead>
              <tr>
                <th className="w-32" />
                {c.journey.map((j, i) => (
                  <th key={j.id} className="px-1 pb-2 align-top">
                    <div className="rounded-lg bg-brand/10 p-2">
                      <span className="font-mono text-[10px] text-brand-soft">STAGE {i + 1}</span>
                      <input
                        aria-label="Stage name"
                        value={j.stage}
                        readOnly={!canEdit}
                        disabled={!canEdit}
                        onChange={(e) => u((d) => { d.journey[i].stage = e.target.value; })}
                        className={cn("w-full bg-transparent text-sm font-medium focus:outline-none", !canEdit && "cursor-default")}
                      />
                      <RowControls index={i} length={c.journey.length} onMove={(dir) => u((d) => move(d.journey, i, dir))} onDelete={() => u((d) => { d.journey.splice(i, 1); })} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {JOURNEY_ROWS.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <th className="py-2 pr-2 align-top text-xs font-medium text-muted-foreground">{r.label}</th>
                  {c.journey.map((j, i) => (
                    <td key={j.id} className="px-1 py-1 align-top">
                      <textarea
                        aria-label={`${r.label} ${j.stage}`}
                        rows={3}
                        value={j[r.key]}
                        readOnly={!canEdit}
                        disabled={!canEdit}
                        onChange={(e) => u((d) => { d.journey[i][r.key] = e.target.value; })}
                        className={cn(cell, !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default resize-none")}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
