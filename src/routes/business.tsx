import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useProject, uid, yearCalc, rm } from "@/lib/project/store";
import { Area, Assumption, Button, Card, NumField, PageHeader, RowControls, StringList, move } from "@/components/app/kit";
import { SectionTaskPanel } from "@/components/app/SectionTask";
import type { Competitor } from "@/lib/project/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Business plan | Tech Ventura" },
      { name: "description", content: "Problem, market, competitors, SWOT, revenue, costs and a 3-year RM projection." },
      { property: "og:title", content: "Business plan | Tech Ventura" },
      { property: "og:description", content: "Problem, market, competitors, SWOT, revenue, costs and a 3-year RM projection." },
    ],
  }),
  component: BusinessPage,
});

const COMP_COLS: { key: keyof Competitor; label: string }[] = [
  { key: "name", label: "Competitor" },
  { key: "offer", label: "Offer" },
  { key: "price", label: "Price (RM, est.)" },
  { key: "customisation", label: "Customisation" },
  { key: "localIdentity", label: "Local identity" },
  { key: "weakness", label: "Weakness" },
];

function BusinessPage() {
  const { state, update } = useProject();
  const b = state.business;
  const u = (fn: (d: typeof b) => void) => update((d) => fn(d.business), "s3");
  const rows = b.projection.map((r) => ({ r, c: yearCalc(r) }));
  const cumulative = rows.reduce((a, x) => a + x.c.net, 0);

  return (
    <>
      <PageHeader eyebrow="Hour 3" title="Business plan" description={`A concise plan for ${state.company.productName}. Every number is an assumption until the group verifies it.`} />
      <SectionTaskPanel sections={["s3"]} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Problem and solution">
          <div className="space-y-3">
            <Area label="Problem statement" rows={4} value={b.problem} onChange={(v) => u((d) => { d.problem = v; })} />
            <Area label="Proposed solution" rows={4} value={b.solution} onChange={(v) => u((d) => { d.solution = v; })} />
          </div>
        </Card>
        <Card title="Market analysis" action={<Assumption />}>
          <div className="space-y-3">
            <Area label="Market overview" rows={4} value={b.market} onChange={(v) => u((d) => { d.market = v; })} />
            <StringList label="Key assumptions (to verify)" items={b.assumptions} onChange={(v) => u((d) => { d.assumptions = v; })} />
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Competitor comparison matrix" subtitle="Prices are rough estimates, not verified." action={<Button size="sm" onClick={() => u((d) => { d.competitors.push({ id: uid(), name: "", offer: "", price: "", customisation: "", localIdentity: "", weakness: "" }); })}><Plus className="size-3.5" /> Row</Button>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                {COMP_COLS.map((c) => <th key={c.key} className="px-2 pb-2 font-medium">{c.label}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {b.competitors.map((row, i) => (
                <tr key={row.id} className={cn("border-t border-border", /\(us\)/i.test(row.name) && "bg-brand/5")}>
                  {COMP_COLS.map((c) => (
                    <td key={c.key} className="p-1">
                      <input aria-label={`${c.label} row ${i + 1}`} value={row[c.key]} onChange={(e) => u((d) => { d.competitors[i][c.key] = e.target.value; })} className="w-full rounded-md bg-transparent px-2 py-1.5 hover:bg-elevated focus:bg-elevated focus:outline-none" />
                    </td>
                  ))}
                  <td className="p-1"><RowControls index={i} length={b.competitors.length} onMove={(dir) => u((d) => move(d.competitors, i, dir))} onDelete={() => u((d) => { d.competitors.splice(i, 1); })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4" title="SWOT analysis">
        <div className="grid gap-3 md:grid-cols-2">
          {(["strengths", "weaknesses", "opportunities", "threats"] as const).map((q) => (
            <div key={q} className={cn("rounded-lg border p-3", q === "strengths" || q === "opportunities" ? "border-success/25" : "border-destructive/25")}>
              <StringList label={q[0].toUpperCase() + q.slice(1)} items={b.swot[q]} onChange={(v) => u((d) => { d.swot[q] = v; })} />
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Revenue model" action={<Assumption />}>
          <Area label="How we make money" rows={6} value={b.revenueModel} onChange={(v) => u((d) => { d.revenueModel = v; })} />
        </Card>
        <Card title="Cost structure">
          <Area label="Variable, fixed and marketing costs" rows={6} value={b.costStructure} onChange={(v) => u((d) => { d.costStructure = v; })} />
        </Card>
      </div>

      <Card className="mt-4" title="Financial projection (RM)" subtitle="Edit the blue inputs. Revenue, gross profit and net profit recalculate automatically. Revenue = units × average price. Net = gross profit − fixed − marketing." action={
        <div className="flex items-center gap-2">
          <Assumption />
          <Button size="sm" disabled={b.projection.length >= 3} title={b.projection.length >= 3 ? "Maximum 3 years" : undefined} onClick={() => u((d) => { const last = d.projection[d.projection.length - 1]; d.projection.push({ ...(last ?? { units: 0, avgPrice: 0, cogsPerUnit: 0, fixedCosts: 0, marketing: 0 }), id: uid(), label: `Year ${d.projection.length + 1}` }); })}><Plus className="size-3.5" /> Year</Button>
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Line</th>
                {b.projection.map((r, i) => (
                  <th key={r.id} className="pb-2 text-right font-medium">
                    {r.label}
                    {b.projection.length > 1 && <button type="button" className="ml-2 text-destructive hover:underline" onClick={() => u((d) => { d.projection.splice(i, 1); d.projection.forEach((y, j) => { y.label = `Year ${j + 1}`; }); })}>remove</button>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_td]:py-1.5">
              {([["units", "Units sold"], ["avgPrice", "Average price (RM)"], ["cogsPerUnit", "Cost per unit (RM)"], ["fixedCosts", "Fixed costs (RM)"], ["marketing", "Marketing (RM)"]] as const).map(([k, label]) => (
                <tr key={k} className="border-t border-border">
                  <td className="text-brand-soft">{label}</td>
                  {b.projection.map((r, i) => (
                    <td key={r.id} className="pl-3"><NumField label={`${label} ${r.label}`} value={r[k]} onChange={(v) => u((d) => { d.projection[i][k] = v; })} /></td>
                  ))}
                </tr>
              ))}
              {([["revenue", "Revenue"], ["cogs", "Cost of goods"], ["gross", "Gross profit"], ["net", "Net profit"]] as const).map(([k, label]) => (
                <tr key={k} className={cn("border-t border-border", k === "net" && "font-medium")}>
                  <td>{label}</td>
                  {rows.map(({ r, c }) => (
                    <td key={r.id} className={cn("text-right tabular-nums", k === "net" && (c.net < 0 ? "text-destructive" : "text-success"))}>{rm(c[k])}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-border text-muted-foreground">
                <td>Gross margin</td>
                {rows.map(({ r, c }) => <td key={r.id} className="text-right tabular-nums">{c.margin.toFixed(1)}%</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Cumulative net over {rows.length} year(s): <span className={cumulative < 0 ? "text-destructive" : "text-success"}>{rm(cumulative)}</span>. Forecast only, not actual performance.</p>
      </Card>
    </>
  );
}
