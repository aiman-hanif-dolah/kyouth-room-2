import { ArrowUpRight, Copy, FolderHeart, ShoppingBag, Trash2 } from "lucide-react";
import { CATEGORIES, money, productFor, PRODUCTS, unitPrice } from "@/lib/batik/catalog";
import type { BatikStudio } from "@/lib/batik/store";
import { DesignPreview } from "./StudioControls";
export function Collection({ studio: s }: { studio: BatikStudio }) {
  return <section className="lab-section"><header><span className="lab-eyebrow">The collection / {PRODUCTS.length} canvases</span><h2>One pattern. A world of possibilities.</h2><p>Your current design travels with you. Choose a canvas to start customising.</p></header>
    <div className="lab-filter"><div className="lab-segments">{CATEGORIES.map((c) => <button type="button" key={c} aria-pressed={s.category === c} onClick={() => s.setCategory(c)}>{c}</button>)}</div><input aria-label="Search products" placeholder="Find your next canvas…" value={s.query} onChange={(e) => s.setQuery(e.target.value)} /></div>
    <div className="lab-collection">{s.products.map((p) => <button key={p.id} type="button" className="lab-product-card" onClick={() => s.selectProduct(p.id)}><div><DesignPreview design={{ ...s.design, product: p.id, size: p.sizes[0], material: p.materials[0] }} /><span className="lab-category">{p.category}</span></div><span className="lab-card-line"><strong>{p.name}</strong><ArrowUpRight size={19} /></span><p>{p.description}</p><small>From {money(p.price)} · simulated pricing</small></button>)}</div>
    {!s.products.length && <div className="lab-empty">No canvases match that search.<button type="button" className="lab-button" onClick={() => { s.setQuery(""); s.setCategory("All"); }}>Show all products</button></div>}
  </section>;
}
export function SavedDesigns({ studio: s }: { studio: BatikStudio }) {
  return <section className="lab-section"><header><span className="lab-eyebrow">Your personal archive</span><h2>A shelf full of possibilities.</h2><p>Saved in this browser. Open a design to continue, or duplicate it for a new direction.</p></header>
    {!s.saved.length ? <div className="lab-empty"><FolderHeart size={38} /><h3>Your first collection starts here.</h3><p>Save a design from the studio and find it here whenever you return.</p><button className="lab-button lab-primary" onClick={() => s.setTab("studio")}>Create a design</button></div> : <div className="lab-collection">{s.saved.map((x) => <article key={x.id} className="lab-saved-card"><button className="lab-saved-preview" onClick={() => s.load(x)} aria-label={`Open ${x.design.name}`}><DesignPreview design={x.design} /></button><h3>{x.design.name}</h3><p>{productFor(x.design).name} · {money(unitPrice(x.design))}</p><div className="lab-actions"><button className="lab-button" onClick={() => s.load(x)}>Open design <ArrowUpRight size={14} /></button><button className="lab-icon" aria-label={`Duplicate ${x.design.name}`} onClick={() => s.duplicate(x)}><Copy size={17} /></button><button className="lab-icon" aria-label={`Remove saved ${x.design.name}`} onClick={() => s.removeSaved(x.id)}><Trash2 size={17} /></button></div></article>)}</div>}
  </section>;
}
export function EmptyBag({ studio: s }: { studio: BatikStudio }) {
  return <div className="lab-empty"><ShoppingBag size={38} /><h3>Something beautiful belongs here.</h3><p>Customise a product in the studio, then add it to your bag.</p><button className="lab-button lab-primary" onClick={() => s.setTab("collection")}>Explore the collection</button></div>;
}
