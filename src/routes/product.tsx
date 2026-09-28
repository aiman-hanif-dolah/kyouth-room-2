import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useProject, uid } from "@/lib/project/store";
import { AssetGallery, StorageNote } from "@/components/app/Assets";
import { Area, Badge, Button, Card, CopyButton, newImage, PageHeader, RowControls, StringList, move } from "@/components/app/kit";
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
  const { state, update, canEdit } = useProject();
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
              <input
                aria-label="Feature"
                value={f.title}
                readOnly={!canEdit}
                disabled={!canEdit}
                onChange={(e) => u((d) => { d.features[i].title = e.target.value; })}
                className={cn("rounded-md bg-card px-2 py-1.5 text-sm font-medium", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
              />
              <input
                aria-label="Benefit"
                value={f.benefit}
                readOnly={!canEdit}
                disabled={!canEdit}
                onChange={(e) => u((d) => { d.features[i].benefit = e.target.value; })}
                className={cn("rounded-md bg-card px-2 py-1.5 text-sm text-subtle", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
              />
              <RowControls index={i} length={p.features.length} onMove={(dir) => u((d) => move(d.features, i, dir))} onDelete={() => u((d) => { d.features.splice(i, 1); })} />
            </div>
          ))}
        </div>
      </Card>

      <Card
        className="mt-4"
        title="Product mockups"
        subtitle="Upload mockups directly, paste an image link, or generate them using the prompt templates below."
        action={
          <Button size="sm" onClick={() => u((d) => { d.mockups.push({ ...newImage(), id: uid() }); })}>
            <Plus className="size-3.5" /> Mockup prompt
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Prompts and link generator accordion / box */}
          {p.mockups.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border bg-card/40 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
                  Image generation prompts & links ({p.mockups.length})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Copy prompts into your image tool or paste links below
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {p.mockups.map((m, i) => (
                  <div key={m.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {m.caption || `Prompt ${i + 1}`}
                      </span>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="danger"
                          aria-label="Delete prompt"
                          onClick={() => u((d) => { d.mockups.splice(i, 1); })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <input
                      aria-label="Mockup title"
                      value={m.caption}
                      placeholder={canEdit ? "Title / Silhouette name" : ""}
                      readOnly={!canEdit}
                      disabled={!canEdit}
                      onChange={(e) => u((d) => { d.mockups[i].caption = e.target.value; })}
                      className={cn("w-full rounded-md border border-input bg-card px-2 py-1 text-xs", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
                    />
                    <textarea
                      aria-label="Mockup prompt"
                      rows={3}
                      value={m.prompt}
                      placeholder={canEdit ? "Describe the product mockup to generate…" : ""}
                      readOnly={!canEdit}
                      disabled={!canEdit}
                      onChange={(e) => u((d) => { d.mockups[i].prompt = e.target.value; })}
                      className={cn("w-full resize-y rounded-md border border-input bg-card p-2 text-xs", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default resize-none")}
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">Prompt for AI generator</span>
                      <CopyButton text={m.prompt} />
                    </div>
                    {/* Link paste optional shortcut */}
                    {canEdit && (
                      <div className="mt-1 flex gap-1.5 border-t border-border/60 pt-2">
                        <input
                          aria-label="Paste image link"
                          placeholder="https://… or direct link"
                          value={m.url && !m.url.startsWith("asset:") ? m.url : ""}
                          onChange={(e) => u((d) => { d.mockups[i].url = e.target.value; })}
                          className="flex-1 rounded-md border border-input bg-card px-2 py-1 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unified Asset Gallery containing direct uploads, preview, AI assist, and organization */}
          <AssetGallery slot="product.mockups" section="s4" imagesOnly />
          <StorageNote />
        </div>
      </Card>
    </>
  );
}
