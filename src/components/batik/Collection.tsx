import { useRef, useState } from "react";
import { ArrowUpRight, Box, Check, Copy, Eye, FolderHeart, ShoppingBag, Trash2 } from "lucide-react";
import { CATEGORIES, money, productFor, PRODUCTS, unitPrice, type StudioProduct } from "@/lib/batik/catalog";
import type { BatikStudio } from "@/lib/batik/store";
import { DesignPreview } from "./StudioControls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export function Collection({ studio: s }: { studio: BatikStudio }) {
  const [previewProduct, setPreviewProduct] = useState<StudioProduct | null>(null);
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");
  const preview = (product: StudioProduct, mode: "2d" | "3d") => {
    setPreviewProduct(product);
    setPreviewMode(mode);
  };
  const designProduct = () => {
    if (!previewProduct) return;
    s.selectProduct(previewProduct.id);
    setPreviewProduct(null);
  };
  return <>
    <section className="lab-section"><header><span className="lab-eyebrow">The collection / {PRODUCTS.length} canvases</span><h2>One pattern. A world of possibilities.</h2><p>Your current design travels with you. Choose a canvas to start customising.</p></header>
      <div className="lab-filter"><div className="lab-segments">{CATEGORIES.map((c) => <button type="button" key={c} aria-pressed={s.category === c} onClick={() => s.setCategory(c)}>{c}</button>)}</div><input aria-label="Search products" placeholder="Find your next canvas…" value={s.query} onChange={(e) => s.setQuery(e.target.value)} /></div>
      <div className="lab-collection">{s.products.map((p) => <article key={p.id} className="lab-product-card">
        <button type="button" className="lab-product-art" onClick={() => preview(p, "2d")} aria-label={`Preview ${p.name} in 2D`}><DesignPreview design={{ ...s.design, product: p.id, size: p.sizes[0], material: p.materials[0] }} /><span className="lab-category">{p.category}</span><span className="lab-preview-cue"><Eye size={14} /> Quick view</span></button>
        <div className="lab-card-line"><strong>{p.name}</strong><button type="button" className="lab-3d-button" onClick={() => preview(p, "3d")} aria-label={`Preview ${p.name} in 3D`}><Box size={16} /> 3D</button></div>
        <p>{p.description}</p><small>From {money(p.price)} · simulated pricing</small>
        <button type="button" className="lab-button lab-card-cta" onClick={() => s.selectProduct(p.id)}>Design this canvas <ArrowUpRight size={15} /></button>
      </article>)}</div>
      {!s.products.length && <div className="lab-empty">No canvases match that search.<button type="button" className="lab-button" onClick={() => { s.setQuery(""); s.setCategory("All"); }}>Show all products</button></div>}
    </section>
    <Dialog open={!!previewProduct} onOpenChange={(open) => { if (!open) setPreviewProduct(null); }}>
      <DialogContent className="lab-quickview-dialog w-[min(960px,calc(100vw-2rem))] max-w-none border-[#d9cfbf] bg-[#fffaf1] text-[#292640]">
        {previewProduct && <>
          <DialogHeader>
            <DialogTitle>{previewProduct.name}</DialogTitle>
            <DialogDescription>{previewProduct.description} · From {money(previewProduct.price)} · simulated pricing</DialogDescription>
          </DialogHeader>
          <div className="lab-quickview-layout">
            <div className="lab-quickview-stage">
              <div className="lab-segments" role="group" aria-label="Product preview mode">
                <button type="button" aria-pressed={previewMode === "2d"} onClick={() => setPreviewMode("2d")}>2D view</button>
                <button type="button" aria-pressed={previewMode === "3d"} onClick={() => setPreviewMode("3d")}><Box size={14} /> 3D view</button>
              </div>
              <div className="lab-quickview-model"><DesignPreview design={{ ...s.design, product: previewProduct.id, size: previewProduct.sizes[0], material: previewProduct.materials[0] }} mode={previewMode === "3d" ? "3d" : "product"} /></div>
              {previewMode === "3d" && <p className="lab-quickview-cue">Drag the model to inspect the silhouette · Your pattern stays live</p>}
            </div>
            <aside className="lab-quickview-details"><span className="lab-eyebrow">{previewProduct.category} / made for your pattern</span><h3>{previewProduct.name}</h3><p>{previewProduct.description}</p><dl><div><dt>Available sizes</dt><dd>{previewProduct.sizes.join(" · ")}</dd></div><div><dt>Materials</dt><dd>{previewProduct.materials.join(" · ")}</dd></div><div><dt>Starting price</dt><dd>{money(previewProduct.price)}</dd></div></dl></aside>
          </div>
          <DialogFooter><button type="button" className="lab-button lab-primary" onClick={designProduct}>Design this canvas <ArrowUpRight size={15} /></button></DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
export function SavedDesigns({ studio: s }: { studio: BatikStudio }) {
  const backupInput = useRef<HTMLInputElement>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState<"product" | "3d">("product");
  const compared = compareIds.map((id) => s.saved.find((item) => item.id === id)).filter((item): item is (typeof s.saved)[number] => !!item);
  const toggleCompare = (id: string) => setCompareIds((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length < 2 ? [...items, id] : [items[1], id]);
  return <section className="lab-section"><header><span className="lab-eyebrow">Your personal archive</span><h2>A shelf full of possibilities.</h2><p>Saved in this browser. Open a design to continue, duplicate it for a new direction, or compare two variations side by side.</p></header>
    <div className="lab-library-actions"><span><strong>Take your work with you.</strong><small>Back up the active design, saved designs and custom palettes. Restore merges your library and keeps this browser's bag and order history.</small></span><div className="lab-actions"><button type="button" className="lab-button" onClick={s.downloadLibraryBackup}>Download backup</button><button type="button" className="lab-button" onClick={() => backupInput.current?.click()}>Restore backup</button><input ref={backupInput} type="file" accept="application/json,.json" aria-label="Choose Batik Lab library backup" onChange={async (event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) await s.importLibraryBackup(file); input.value = ""; }} /></div></div>
    {!s.saved.length ? <div className="lab-empty"><FolderHeart size={38} /><h3>Your first collection starts here.</h3><p>Save a design from the studio and find it here whenever you return.</p><button className="lab-button lab-primary" onClick={() => s.setTab("studio")}>Create a design</button></div> : <>
      {compared.length > 0 && <section className="lab-compare" aria-label="Design comparison"><div className="lab-compare-heading"><div><span className="lab-eyebrow">Variation study / {compared.length} of 2</span><h3>Which direction feels right?</h3></div><div className="lab-actions"><div className="lab-segments" role="group" aria-label="Comparison preview mode"><button type="button" aria-pressed={compareMode === "product"} onClick={() => setCompareMode("product")}>2D</button><button type="button" aria-pressed={compareMode === "3d"} onClick={() => setCompareMode("3d")}><Box size={14} /> 3D</button></div><button type="button" className="lab-text-button" onClick={() => setCompareIds([])}>Clear comparison</button></div></div>
        <div className="lab-compare-grid">{compared.map((item, index) => <article className="lab-compare-design" key={item.id}><div className="lab-compare-preview"><DesignPreview design={item.design} mode={compareMode} /></div><div className="lab-compare-caption"><span className="lab-eyebrow">Direction 0{index + 1}</span><h4>{item.design.name}</h4><p>{productFor(item.design).name} · {money(unitPrice(item.design))}</p><div className="lab-compare-swatches" aria-label={`Colours for ${item.design.name}`}>{[item.design.ink, item.design.accent, item.design.background, item.design.detail].map((colour, i) => <i key={`${colour}-${i}`} style={{ background: colour }} />)}</div><button type="button" className="lab-button" onClick={() => s.load(item)}>Continue this design <ArrowUpRight size={14} /></button></div></article>)}{compared.length === 1 && <div className="lab-compare-placeholder"><span aria-hidden="true">＋</span><h4>Bring in another direction.</h4><p>Select a second saved design below to see both patterns and silhouettes together.</p></div>}</div>
      </section>}
      <div className="lab-collection">{s.saved.map((x) => { const selected = compareIds.includes(x.id); return <article key={x.id} className={`lab-saved-card${selected ? " is-comparing" : ""}`}><button className="lab-saved-preview" onClick={() => s.load(x)} aria-label={`Open ${x.design.name}`}><DesignPreview design={x.design} /></button><label className="lab-compare-select"><input type="checkbox" checked={selected} onChange={() => toggleCompare(x.id)} /><span>{selected && <Check size={12} />}{selected ? "Comparing" : "Compare"}</span></label><h3>{x.design.name}</h3><p>{productFor(x.design).name} · {money(unitPrice(x.design))}</p><div className="lab-actions"><button className="lab-button" onClick={() => s.load(x)}>Open design <ArrowUpRight size={14} /></button><button className="lab-icon" aria-label={`Duplicate ${x.design.name}`} onClick={() => s.duplicate(x)}><Copy size={17} /></button><button className="lab-icon" aria-label={`Remove saved ${x.design.name}`} onClick={() => s.removeSaved(x.id)}><Trash2 size={17} /></button></div></article>; })}</div>
    </>}
  </section>;
}
export function EmptyBag({ studio: s }: { studio: BatikStudio }) {
  return <div className="lab-empty"><ShoppingBag size={38} /><h3>Something beautiful belongs here.</h3><p>Customise a product in the studio, then add it to your bag.</p><button className="lab-button lab-primary" onClick={() => s.setTab("collection")}>Explore the collection</button></div>;
}
