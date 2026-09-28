import type { Design } from "@/lib/batik/catalog";
import { MOTIFS, PALETTES } from "@/lib/batik/catalog";
import type { BatikStudio } from "@/lib/batik/store";
import { designImage, type PreviewMode } from "@/lib/batik/design";
import { Batik3DViewer } from "./Batik3DViewer";
export function DesignPreview({ design, mode = "product", className = "" }: { design: Design; mode?: PreviewMode; className?: string }) {
  if (mode === "3d") {
    return <Batik3DViewer design={design} className={className} />;
  }
  return <img className={className} src={designImage(design, mode)} alt={`${design.name || "Untitled design"}, ${design.motif} ${mode} preview`} draggable={false} />;
}
function Range({ label, value, min, max, step = 1, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void; suffix?: string }) {
  return <label className="lab-range"><span>{label}<output>{value}{suffix}</output></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
export function StudioControls({ studio: s }: { studio: BatikStudio }) {
  const d = s.design;
  return <aside className="lab-controls">
    <div className="lab-panel-heading"><span className="lab-eyebrow">Your creative toolkit</span><h2>Make it yours.</h2></div>
    <details open><summary><span>01</span> Motif & rhythm</summary><div className="lab-control-body">
      <div className="lab-motif-grid">{MOTIFS.map((m) => <button key={m.id} type="button" aria-pressed={d.motif === m.id} onClick={() => s.change({ motif: m.id })}><DesignPreview design={{ ...d, motif: m.id, scale: 95, spacing: 8, secondary: "none", rotation: 0 }} mode="pattern" /><span>{m.name}</span></button>)}</div>
      <p className="lab-help">{s.motif.note} These are contemporary interpretations of regional motifs.</p>
      <label>Repeat layout<select value={d.repeat} onChange={(e) => s.change({ repeat: e.target.value as Design["repeat"] })}><option value="grid">Straight repeat</option><option value="brick">Half-brick</option><option value="half-drop">Half-drop</option></select></label>
      <Range label="Motif scale" min={24} max={120} value={d.scale} onChange={(scale) => s.change({ scale })} />
      <Range label="Spacing" min={0} max={32} value={d.spacing} onChange={(spacing) => s.change({ spacing })} />
      <Range label="Rotation" min={0} max={180} step={5} value={d.rotation} suffix="°" onChange={(rotation) => s.change({ rotation })} />
      <label className="lab-check"><input type="checkbox" checked={d.mirror} onChange={(e) => s.change({ mirror: e.target.checked })} /> Mirror motif</label>
    </div></details>
    <details open><summary><span>02</span> Colour story</summary><div className="lab-control-body">
      <div className="lab-palette-grid">{PALETTES.map((p,i) => <button key={p.name} type="button" title={p.name} aria-label={`Apply ${p.name} palette`} onClick={() => s.palette(i)}><span>{p.colours.map((c) => <i key={c} style={{ background: c }} />)}</span><small>{p.name}</small></button>)}</div>
      <div className="lab-colours">{([{ key: "ink", label: "Motif ink" }, { key: "accent", label: "Accent" }, { key: "background", label: "Base cloth" }, { key: "detail", label: "Detail" }] as const).map((c) => <label key={c.key}><input type="color" aria-label={c.label} value={d[c.key]} onChange={(e) => s.change({ [c.key]: e.target.value })} /><span>{c.label}<small>{d[c.key]}</small></span></label>)}</div>
      <button type="button" className="lab-text-button" onClick={() => s.change({ ink: d.background, background: d.ink })}>Swap ink & base ↔</button>
    </div></details>
    <details><summary><span>03</span> Layers & finish</summary><div className="lab-control-body">
      <label>Secondary motif<select value={d.secondary} onChange={(e) => s.change({ secondary: e.target.value as Design["secondary"] })}><option value="none">None — keep it simple</option>{MOTIFS.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label>
      <Range label="Ink opacity" min={0.15} max={1} step={0.05} value={d.opacity} onChange={(opacity) => s.change({ opacity })} />
      <label>Pattern placement<select value={d.placement} onChange={(e) => s.change({ placement: e.target.value as Design["placement"] })}><option value="all">All-over print</option><option value="panel">Centre panel</option><option value="border">Lower border</option></select></label>
      <label className="lab-check"><input type="checkbox" checked={d.border} onChange={(e) => s.change({ border: e.target.checked })} /> Add accent stripes</label>
      <label className="lab-check"><input type="checkbox" checked={d.texture} onChange={(e) => s.change({ texture: e.target.checked })} /> Woven texture preview</label>
    </div></details>
    <details><summary><span>04</span> Personal signature</summary><div className="lab-control-body">
      <label>Monogram or message<input maxLength={16} placeholder="e.g. AH / MADE BY ME" value={d.monogram} onChange={(e) => s.change({ monogram: e.target.value })} /></label>
      <Range label="Letter size" min={14} max={54} value={d.textSize} onChange={(textSize) => s.change({ textSize })} />
      <Range label="Signature position" min={180} max={450} value={d.textY} onChange={(textY) => s.change({ textY })} />
      <p className="lab-help">Visible on the product preview. Adjust the position to fit your chosen silhouette.</p>
    </div></details>
  </aside>;
}
