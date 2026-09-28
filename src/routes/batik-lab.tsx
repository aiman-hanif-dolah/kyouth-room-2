import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowDownToLine, ChevronRight, FlaskConical, FolderHeart, RotateCcw, Save, ShoppingBag as BagIcon, Shuffle, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";
import { useBatikStudio, type StudioTab } from "@/lib/batik/store";
import { money, PRODUCTS } from "@/lib/batik/catalog";
import { DesignPreview, StudioControls } from "@/components/batik/StudioControls";
import { Collection, SavedDesigns } from "@/components/batik/Collection";
import { ShoppingBag, Orders } from "@/components/batik/Checkout";
import "@/components/batik/batik-lab.css";
export const Route = createFileRoute("/batik-lab")({
  head: () => ({ meta: [{ title: "Batik Lab — Your pattern. Your world." }, { name: "description", content: "Design your own batik. Explore twelve products, build a personal collection, export your artwork and try a simulated checkout." }] }),
  component: BatikLab,
});
const TABS: { key: StudioTab; label: string }[] = [{ key: "studio", label: "Design studio" }, { key: "collection", label: "The collection" }, { key: "saved", label: "Saved designs" }, { key: "bag", label: "Bag" }, { key: "orders", label: "Orders" }];
function BatikLab() {
  const s = useBatikStudio();
  return <div className="batik-lab">
    <header className="lab-header"><div className="lab-wordmark"><span><FlaskConical size={24} /></span><div>Batik<span>Lab.</span><small>A little heritage. A lot of you.</small></div></div><div className="lab-header-actions"><span className="lab-status"><i /> Your creative space</span><button className="lab-bag-button" onClick={() => s.setTab("bag")} aria-label={`Open bag, ${s.totals.units} items`}><BagIcon size={18} /><span>{s.totals.units}</span></button></div></header>
    <nav className="lab-nav" aria-label="Batik Lab">{TABS.map((t) => <button type="button" key={t.key} aria-current={s.tab === t.key ? "page" : undefined} onClick={() => s.setTab(t.key)}>{t.label}{t.key === "saved" && <small>{s.saved.length}</small>}{t.key === "bag" && <small>{s.totals.units}</small>}</button>)}<Link to="/product">Hour 4 prototype <ArrowUpRight size={13} /></Link></nav>
    {s.storageError && <div className="lab-warning" role="alert">{s.storageError}</div>}
    <p className="lab-announcement" role="status" aria-live="polite">{s.notice || "Your studio, saved in this browser. Design freely; checkout is simulated."}</p>
    <fieldset disabled={!s.ready} className="lab-workspace">
      {s.tab === "studio" && <>
        <section className="lab-intro"><div><span className="lab-eyebrow">The design studio / Made by you</span><h1>Heritage, with<br /><em>your signature.</em></h1><p>Choose a rhythm. Find your colours. Make something unmistakably yours.</p></div><button className="lab-collection-link" onClick={() => s.setTab("collection")}><span>12 canvases.<br />Endless possibilities.</span><ArrowUpRight size={28} /></button></section>
        <div className="lab-editor"><StudioControls studio={s} /><div className="lab-main-canvas">
          <div className="lab-toolbar"><label className="lab-design-name"><span className="lab-eyebrow">Current design</span><input aria-label="Design name" maxLength={60} value={s.design.name} onChange={(e) => s.change({ name: e.target.value })} /></label><div className="lab-actions"><button className="lab-icon" aria-label="Undo design change" title="Undo" disabled={!s.canUndo} onClick={s.undo}><Undo2 size={18} /></button><button className="lab-icon" aria-label="Redo design change" title="Redo" disabled={!s.canRedo} onClick={s.redo}><Redo2 size={18} /></button><button className="lab-icon" aria-label="Reset design" title="Reset (undoable)" onClick={s.reset}><RotateCcw size={17} /></button><button className="lab-button" onClick={s.save}><Save size={15} /> Save design</button></div></div>
          <div className="lab-canvas"><div className="lab-canvas-top"><span className="lab-canvas-badge">LIVE PREVIEW</span><div className="lab-segments"><button aria-pressed={s.mode === "product"} onClick={() => s.setMode("product")}>2D Product</button><button aria-pressed={s.mode === "3d"} onClick={() => s.setMode("3d")}>3D Model ✦</button><button aria-pressed={s.mode === "pattern"} onClick={() => s.setMode("pattern")}>Pattern Tile</button></div></div><div className="lab-preview-window"><div style={{ transform: s.mode === "3d" ? "none" : `scale(${s.zoom})`, width: "100%", height: "100%" }}><DesignPreview design={s.design} mode={s.mode} zoom={s.zoom} /></div></div><div className="lab-canvas-bottom"><button className="lab-button" onClick={s.shuffle}><Shuffle size={15} /> Surprise me</button><div className="lab-zoom"><button className="lab-icon" aria-label="Zoom out" disabled={s.zoom <= 0.75} onClick={() => s.setZoom(Math.max(0.75,s.zoom-0.25))}><ZoomOut size={18} /></button><output>{Math.round(s.zoom*100)}%</output><button className="lab-icon" aria-label="Zoom in" disabled={s.zoom >= 1.75} onClick={() => s.setZoom(Math.min(1.75,s.zoom+0.25))}><ZoomIn size={18} /></button></div></div></div>
          <div className="lab-product-config"><div><span className="lab-eyebrow">Your canvas</span><label>Product<select value={s.design.product} onChange={(e) => s.selectProduct(e.target.value)}>{PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><label>Size<select value={s.design.size} onChange={(e) => s.change({ size: e.target.value })}>{s.product.sizes.map((size) => <option key={size}>{size}</option>)}</select></label><label>Material<select value={s.design.material} onChange={(e) => s.change({ material: e.target.value })}>{s.product.materials.map((material) => <option key={material}>{material}</option>)}</select></label></div>
          <div className="lab-buy-line"><div><strong>{money(s.price)}</strong><small>per piece · simulated pricing</small></div><button className="lab-button lab-primary" onClick={s.addToCart}>Add to bag <BagIcon size={18} /></button></div>
          <div className="lab-export"><div><ArrowDownToLine size={19} /><span>Keep your creation<small>{s.mode === "pattern" ? "Pattern sheet" : "Product mockup"} · SVG or 2400px PNG</small></span></div><div className="lab-actions"><button className="lab-button" disabled={s.exporting} onClick={() => s.download("svg")}>SVG</button><button className="lab-button" disabled={s.exporting} onClick={() => s.download("png")}>{s.exporting ? "Exporting…" : "PNG"}</button></div></div>
          <p className="lab-fine-print">Illustrative previews, not production specifications. Material and size change the quote; shown silhouettes are representative. No physical products are fulfilled through this demo checkout.</p>
        </div></div>
        <section className="lab-bottom-banner"><FolderHeart size={32} /><div><h2>Keep the ideas coming.</h2><p>Save variations, build a collection and return to your favourites.</p></div><button className="lab-button" onClick={() => s.setTab("saved")}>Your design shelf <ChevronRight size={16} /></button></section>
      </>}
      {s.tab === "collection" && <Collection studio={s} />}
      {s.tab === "saved" && <SavedDesigns studio={s} />}
      {s.tab === "bag" && <ShoppingBag studio={s} />}
      {s.tab === "orders" && <Orders studio={s} />}
    </fieldset>
    <footer className="lab-footer"><strong>Batik Lab.</strong><span>Personal expression, inspired by tradition.</span><small>Browser-local studio · Simulated orders · By Tech Ventura</small></footer>
  </div>;
}
