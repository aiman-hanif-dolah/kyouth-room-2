import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useProject, uid } from "@/lib/project/store";
import { AssetGallery, SlotImageSlot, StorageNote } from "@/components/app/Assets";
import { Area, Badge, Button, Card, newImage, PageHeader, RowControls, StringList, move } from "@/components/app/kit";
import { SectionTaskPanel } from "@/components/app/SectionTask";
import { ProductDemo } from "@/components/app/ProductDemo";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Product and prototype | Tech Ventura" },
      { name: "description", content: "Product concept, features, mockups and a working interactive prototype." },
      { property: "og:title", content: "Product and prototype | Tech Ventura" },
      { property: "og:description", content: "Product concept, features, mockups and a working interactive prototype." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { state, update } = useProject();
  const p = state.product;
  const u = (fn: (d: typeof p) => void) => update((d) => fn(d.product), "s4");

  return (
    <>
      <PageHeader eyebrow="Hour 4" title={`${state.company.productName} product and prototype`} description="Placeholder product so the group can demonstrate the full company. Swap it later, the demo reads the brand palette live.">
        <Badge tone="warning">Placeholder concept</Badge>
      </PageHeader>
      <SectionTaskPanel sections={["s4"]} />

      <Card title="Interactive prototype" subtitle="Design a pattern, place it on a product, check out and track a mock order. Colours come from the brand palette on the Company page.">
        <ProductDemo />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Concept and description">
          <div className="space-y-3">
            <Area label="Product concept" rows={2} value={p.concept} onChange={(v) => u((d) => { d.concept = v; })} />
            <Area label="Product description" rows={5} value={p.description} onChange={(v) => u((d) => { d.description = v; })} />
          </div>
        </Card>
        <Card title="Benefits and differentiators">
          <div className="space-y-4">
            <StringList label="Benefits" items={p.benefits} onChange={(v) => u((d) => { d.benefits = v; })} />
            <StringList label="Differentiators" items={p.differentiators} onChange={(v) => u((d) => { d.differentiators = v; })} />
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Features" action={<Button size="sm" onClick={() => u((d) => { d.features.push({ id: uid(), title: "", benefit: "" }); })}><Plus className="size-3.5" /> Feature</Button>}>
        <div className="space-y-2">
          {p.features.map((f, i) => (
            <div key={f.id} className="grid gap-2 rounded-lg border border-border bg-background p-2 md:grid-cols-[200px_1fr_auto]">
              <input aria-label="Feature" value={f.title} onChange={(e) => u((d) => { d.features[i].title = e.target.value; })} className="rounded-md bg-card px-2 py-1.5 text-sm font-medium" />
              <input aria-label="Benefit" value={f.benefit} onChange={(e) => u((d) => { d.features[i].benefit = e.target.value; })} className="rounded-md bg-card px-2 py-1.5 text-sm text-subtle" />
              <RowControls index={i} length={p.features.length} onMove={(dir) => u((d) => move(d.features, i, dir))} onDelete={() => u((d) => { d.features.splice(i, 1); })} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4" title="Product mockups" subtitle="Copy a prompt into your image tool, then upload any number of mockups below or paste a link." action={<Button size="sm" onClick={() => u((d) => { d.mockups.push({ ...newImage(), id: uid() }); })}><Plus className="size-3.5" /> Mockup prompt</Button>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {p.mockups.map((m, i) => (
            <SlotImageSlot key={m.id} item={m} slot="product.mockups" section="s4" onChange={(v) => u((d) => { d.mockups[i] = v; })} onDelete={() => u((d) => { d.mockups.splice(i, 1); })} />
          ))}
        </div>
        <div className="mt-6"><AssetGallery slot="product.mockups" section="s4" title="Mockup uploads" /></div>
        <div className="mt-3"><StorageNote /></div>
      </Card>
    </>
  );
}
