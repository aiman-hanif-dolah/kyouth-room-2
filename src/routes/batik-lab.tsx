import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowUpRight, ArrowDownToLine, ChevronRight, Copy, FlaskConical, FolderHeart, RotateCcw, Save, Share2, ShoppingBag as BagIcon, Shuffle, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";
import { useBatikStudio, type StudioTab } from "@/lib/batik/store";
import { MOTIFS, money, PRODUCTS } from "@/lib/batik/catalog";
import { repeatRotation } from "@/lib/batik/design";
import { DesignPreview, StudioControls } from "@/components/batik/StudioControls";
import { Collection, SavedDesigns } from "@/components/batik/Collection";
import { ShoppingBag, Orders } from "@/components/batik/Checkout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "@/components/batik/batik-lab.css";
function layerMarkers(repeat: "grid" | "brick" | "half-drop" | "diamond", tile: number, spacing: number, scale: number, position: { x: number; y: number }) {
  const periodX = repeat === "half-drop" ? tile * 2 : tile;
  const periodY = repeat === "brick" ? tile * 2 : tile;
  const offsets = repeat === "brick" ? [{ x: 0, y: 0 }, { x: tile / 2, y: tile }] : repeat === "half-drop" ? [{ x: 0, y: 0 }, { x: tile, y: tile / 2 }] : [{ x: 0, y: 0 }];
  const markers = [];
  for (let row = 0; row * periodY < 600; row++) {
    for (let column = 0; column * periodX < 600; column++) {
      for (const offset of offsets) {
        const x = column * periodX + offset.x + spacing / 2 + scale / 60 * (position.x + 30);
        const y = row * periodY + offset.y + spacing / 2 + scale / 60 * (position.y + 30);
        if (x >= 0 && x <= 600 && y >= 0 && y <= 600) markers.push({ x, y });
      }
    }
  }
  return markers;
}
export const Route = createFileRoute("/batik-lab")({
  head: () => ({ meta: [{ title: "Batik Lab — Your pattern. Your world." }, { name: "description", content: `Design your own batik. Explore ${PRODUCTS.length} products, build a personal collection, export your artwork and try a simulated checkout.` }] }),
  component: BatikLab,
});
const TABS: { key: StudioTab; label: string }[] = [{ key: "studio", label: "Design studio" }, { key: "collection", label: "The collection" }, { key: "saved", label: "Saved designs" }, { key: "bag", label: "Bag" }, { key: "orders", label: "Orders" }];
function BatikLab() {
  const s = useBatikStudio();
  const [placingLayer, setPlacingLayer] = useState(false);
  const [placeLayerId, setPlaceLayerId] = useState("secondary");
  const [placementPreview, setPlacementPreview] = useState<{ layerId: string; position: { x: number; y: number } } | null>(null);
  const placementPointerId = useRef<number | null>(null);
  const placeableLayers = [
    ...(s.design.secondary === "none" ? [] : [{ id: "secondary", name: `Secondary · ${MOTIFS.find((motif) => motif.id === s.design.secondary)?.name}` }]),
    ...s.design.layers.map((layer, index) => ({ id: layer.id, name: `Extra motif ${index + 1} · ${MOTIFS.find((motif) => motif.id === layer.motif)?.name}` })),
  ];
  const selectedLayer = placeableLayers.find((layer) => layer.id === placeLayerId) ?? placeableLayers[0];
  const patternPointFromEvent = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 600, y: (event.clientY - rect.top) / rect.height * 600 };
  };
  const previewLayerFromPointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (!selectedLayer) return;
    const point = patternPointFromEvent(event);
    setPlacementPreview({ layerId: selectedLayer.id, position: s.patternPositionAtPoint(point.x, point.y) });
  };
  const startLayerPlacement = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    placementPointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    previewLayerFromPointer(event);
  };
  const moveLayerPlacement = (event: PointerEvent<HTMLButtonElement>) => {
    if (placementPointerId.current === event.pointerId) previewLayerFromPointer(event);
  };
  const finishLayerPlacement = (event: PointerEvent<HTMLButtonElement>) => {
    if (!selectedLayer || placementPointerId.current !== event.pointerId) return;
    const point = patternPointFromEvent(event);
    s.placeLayerAtPatternPoint(selectedLayer.id, point.x, point.y);
    placementPointerId.current = null;
    setPlacementPreview(null);
  };
  const cancelLayerPlacement = (event: PointerEvent<HTMLButtonElement>) => {
    if (placementPointerId.current !== event.pointerId) return;
    placementPointerId.current = null;
    setPlacementPreview(null);
  };
  const placeLayerFromKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === "Enter" || event.key === " ") && selectedLayer) {
      event.preventDefault();
      s.placeLayerAtPatternPoint(selectedLayer.id, 300, 300);
    }
  };
  const placeLayerFromClick = () => {
    if (selectedLayer) s.placeLayerAtPatternPoint(selectedLayer.id, 300, 300);
  };
  return <div className="batik-lab">
    <header className="lab-header"><div className="lab-wordmark"><span><FlaskConical size={24} /></span><div>Batik<span>Lab.</span><small>A little heritage. A lot of you.</small></div></div><div className="lab-header-actions"><span className="lab-status"><i /> Your creative space</span><button className="lab-bag-button" onClick={() => s.setTab("bag")} aria-label={`Open bag, ${s.totals.units} items`}><BagIcon size={18} /><span>{s.totals.units}</span></button></div></header>
    <nav className="lab-nav" aria-label="Batik Lab">{TABS.map((t) => <button type="button" key={t.key} aria-current={s.tab === t.key ? "page" : undefined} onClick={() => s.setTab(t.key)}>{t.label}{t.key === "saved" && <small>{s.saved.length}</small>}{t.key === "bag" && <small>{s.totals.units}</small>}</button>)}<Link to="/product">Hour 4 prototype <ArrowUpRight size={13} /></Link></nav>
    {s.storageError && <div className="lab-warning" role="alert">{s.storageError}</div>}
    <p className="lab-announcement" role="status" aria-live="polite">{s.notice || "Your studio, saved in this browser. Design freely; checkout is simulated."}</p>
    <fieldset disabled={!s.ready} className="lab-workspace">
      {s.tab === "studio" && <>
        <section className="lab-intro"><div><span className="lab-eyebrow">The design studio / Made by you</span><h1>Heritage, with<br /><em>your signature.</em></h1><p>Choose a rhythm. Find your colours. Make something unmistakably yours.</p></div><button className="lab-collection-link" onClick={() => s.setTab("collection")}><span>{PRODUCTS.length} canvases.<br />Endless possibilities.</span><ArrowUpRight size={28} /></button></section>
        <div className="lab-editor"><StudioControls studio={s} /><div className="lab-main-canvas">
          <div className="lab-toolbar"><label className="lab-design-name"><span className="lab-eyebrow">Current design</span><input aria-label="Design name" maxLength={60} value={s.design.name} onChange={(e) => s.change({ name: e.target.value })} /></label><div className="lab-actions"><button className="lab-icon" aria-label="Undo design change" title="Undo" disabled={!s.canUndo} onClick={s.undo}><Undo2 size={18} /></button><button className="lab-icon" aria-label="Redo design change" title="Redo" disabled={!s.canRedo} onClick={s.redo}><Redo2 size={18} /></button><button className="lab-icon" aria-label="Reset design" title="Reset (undoable)" onClick={s.reset}><RotateCcw size={17} /></button><button className="lab-button" onClick={s.share}><Share2 size={15} /> Share design</button><button className="lab-button" onClick={s.save}><Save size={15} /> Save design</button></div></div>
          <div className="lab-canvas"><div className="lab-canvas-top"><span className="lab-canvas-badge">{s.mode === "3d" ? "MADE TO MOVE · LIVE 3D" : "LIVE PREVIEW"}</span><div className="lab-segments"><button aria-pressed={s.mode === "product"} onClick={() => s.setMode("product")}>2D Product</button><button aria-pressed={s.mode === "3d"} onClick={() => s.setMode("3d")}>3D Model ✦</button><button aria-pressed={s.mode === "pattern"} onClick={() => s.setMode("pattern")}>Pattern Tile</button></div>{s.mode === "pattern" && !!placeableLayers.length && <div className="lab-place-controls"><label><span className="sr-only">Motif layer to place</span><select aria-label="Motif layer to place" value={selectedLayer?.id ?? ""} onChange={(event) => setPlaceLayerId(event.target.value)}>{placeableLayers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label><button type="button" className="lab-button" aria-pressed={placingLayer} onClick={() => setPlacingLayer((active) => !active)}>{placingLayer ? "Done placing" : "Place on tile"}</button></div>}</div><div className="lab-preview-window"><div style={{ transform: s.mode === "3d" ? "none" : `scale(${s.zoom})`, width: "100%", height: "100%" }}>{s.mode === "pattern" && placingLayer && selectedLayer ? <div className="lab-pattern-stage"><DesignPreview design={s.design} mode="pattern" /><svg className="lab-pattern-handles" viewBox="0 0 600 600" aria-hidden="true"><g transform={`rotate(${repeatRotation(s.design)} 300 300)`}>{layerMarkers(s.design.repeat, s.design.scale + s.design.spacing, s.design.spacing, s.design.scale, placementPreview?.layerId === selectedLayer.id ? placementPreview.position : selectedLayer.id === "secondary" ? { x: s.design.secondaryX, y: s.design.secondaryY } : s.design.layers.find((layer) => layer.id === selectedLayer.id)!).map(({ x, y }, index) => { const previewing = !!placementPreview && placementPreview.layerId === selectedLayer.id; return <g key={index} transform={`translate(${x} ${y})`} data-preview={previewing}><circle r="9" /><path d="M-4 0H4M0-4V4" /></g>; })}</g></svg><button type="button" className={`lab-pattern-place-target${placementPreview ? " is-dragging" : ""}`} aria-label={`Drag ${selectedLayer.name} to place it on the tile, or press Enter to move it to the centre.`} onPointerDown={startLayerPlacement} onPointerMove={moveLayerPlacement} onPointerUp={finishLayerPlacement} onPointerCancel={cancelLayerPlacement} onLostPointerCapture={cancelLayerPlacement} onClick={(event) => { if (event.detail === 0) placeLayerFromClick(); }} onKeyDown={placeLayerFromKey} /></div> : <DesignPreview design={s.design} mode={s.mode} zoom={s.zoom} />}</div></div>{s.mode === "pattern" && placingLayer && <p className="lab-place-hint" role="status">Drag {selectedLayer?.name} across the tile to position it. The change applies across the whole repeat.</p>}<div className="lab-canvas-bottom"><button className="lab-button" onClick={s.shuffle}><Shuffle size={15} /> Surprise me</button><div className="lab-zoom"><button className="lab-icon" aria-label="Zoom out" disabled={s.zoom <= 0.75} onClick={() => s.setZoom(Math.max(0.75,s.zoom-0.25))}><ZoomOut size={18} /></button><output>{Math.round(s.zoom*100)}%</output><button className="lab-icon" aria-label="Zoom in" disabled={s.zoom >= 1.75} onClick={() => s.setZoom(Math.min(1.75,s.zoom+0.25))}><ZoomIn size={18} /></button></div></div></div>
          <div className="lab-product-config"><div><span className="lab-eyebrow">Your canvas</span><label>Product<select value={s.design.product} onChange={(e) => s.selectProduct(e.target.value)}>{PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><label>Size<select value={s.design.size} onChange={(e) => s.change({ size: e.target.value })}>{s.product.sizes.map((size) => <option key={size}>{size}</option>)}</select></label><label>Material<select value={s.design.material} onChange={(e) => s.change({ material: e.target.value })}>{s.product.materials.map((material) => <option key={material}>{material}</option>)}</select></label></div>
          <div className="lab-buy-line"><div><strong>{money(s.price)}</strong><small>per piece · simulated pricing</small></div><button className="lab-button lab-primary" onClick={s.addToCart}>Add to bag <BagIcon size={18} /></button></div>
          <div className="lab-export"><div><ArrowDownToLine size={19} /><span>Keep your creation<small>{s.mode === "pattern" ? "Pattern sheet" : "Product mockup"} · SVG or 2400px PNG</small></span></div><div className="lab-actions"><button className="lab-button" disabled={s.exporting} onClick={() => s.download("svg")}>SVG</button><button className="lab-button" disabled={s.exporting} onClick={() => s.download("png")}>{s.exporting ? "Exporting…" : "PNG"}</button></div></div>
          <div className="lab-range-export"><span><strong>One design, {PRODUCTS.length} canvases</strong><small>Download a product-range board to share the full collection.</small></span><div className="lab-actions"><button className="lab-button" disabled={s.exporting} onClick={() => s.downloadProductRange("svg")}>Range SVG</button><button className="lab-button" disabled={s.exporting} onClick={() => s.downloadProductRange("png")}>{s.exporting ? "Exporting…" : "Range PNG"}</button></div></div>
          <p className="lab-fine-print">Illustrative previews, not production specifications. Material and size change the quote; shown silhouettes are representative. No physical products are fulfilled through this demo checkout.</p>
        </div></div>
        <section className="lab-bottom-banner"><FolderHeart size={32} /><div><h2>Keep the ideas coming.</h2><p>Save variations, build a collection and return to your favourites.</p></div><button className="lab-button" onClick={() => s.setTab("saved")}>Your design shelf <ChevronRight size={16} /></button></section>
      </>}
      {s.tab === "collection" && <Collection studio={s} />}
      {s.tab === "saved" && <SavedDesigns studio={s} />}
      {s.tab === "bag" && <ShoppingBag studio={s} />}
      {s.tab === "orders" && <Orders studio={s} />}
    </fieldset>
    <Dialog open={!!s.shareLink} onOpenChange={(open) => { if (!open) s.closeShare(); }}>
      <DialogContent className="border-[#d9cfbf] bg-[#fffaf1] text-[#292640]">
        <DialogHeader>
          <DialogTitle>Pass this design along.</DialogTitle>
          <DialogDescription className="text-[#6c6572]">The link carries this design’s settings. Opening it creates a local copy in Batik Lab; the design isn’t uploaded.</DialogDescription>
        </DialogHeader>
        <input id="batik-share-link" aria-label="Share link" readOnly value={s.shareLink} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border border-[#d9cfbf] bg-white px-3 py-2 text-xs text-[#292640]" />
        <p className="min-h-5 text-xs text-[#6c6572]" role="status" aria-live="polite">{s.shareCopied ? "Link copied. Your teammate can open it in Batik Lab." : s.shareCopyError ? "Clipboard access was unavailable. Select the link field and copy it." : "Copy the link and send it to a teammate."}</p>
        <DialogFooter>
          <button type="button" className="lab-button lab-primary" onClick={s.copyShareLink}><Copy size={15} /> {s.shareCopied ? "Copied" : "Copy link"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <footer className="lab-footer"><strong>Batik Lab.</strong><span>Personal expression, inspired by tradition.</span><small>Browser-local studio · Simulated orders · By Tech Ventura</small></footer>
  </div>;
}
