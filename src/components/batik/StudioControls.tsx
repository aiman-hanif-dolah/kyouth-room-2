import { lazy, Suspense } from "react";
import type { Design } from "@/lib/batik/catalog";
import { DESIGN_STARTERS, MOTIFS, PALETTES } from "@/lib/batik/catalog";
import { Trash2 } from "lucide-react";
import type { BatikStudio } from "@/lib/batik/store";
import { designImage, type PreviewMode } from "@/lib/batik/design";
const Batik3DViewer = lazy(() => import("./Batik3DViewer").then(({ Batik3DViewer: Component }) => ({ default: Component })));
export function DesignPreview({ design, mode = "product", zoom = 1, className = "" }: { design: Design; mode?: PreviewMode; zoom?: number; className?: string }) {
  if (mode === "3d") {
    return <Suspense fallback={<div className={`grid h-full min-h-[340px] w-full place-items-center bg-[#f4eee5] text-xs font-semibold text-[#514267] ${className}`} role="status">Preparing your 3D preview…</div>}><Batik3DViewer design={design} zoom={zoom} className={className} /></Suspense>;
  }
  return <img className={className} src={designImage(design, mode)} alt={`${design.name || "Untitled design"}, ${design.motif} ${mode} preview`} draggable={false} />;
}
function Range({ label, value, min, max, step = 1, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void; suffix?: string }) {
  return <label className="lab-range"><span>{label}<output>{value}{suffix}</output></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
export function StudioControls({ studio: s }: { studio: BatikStudio }) {
  const d = s.design;
  const hasCustomMotif = d.motif === "custom" || d.secondary === "custom" || d.layers.some((layer) => layer.motif === "custom");
  return <aside className="lab-controls">
    <div className="lab-panel-heading"><span className="lab-eyebrow">Your creative toolkit</span><h2>Make it yours.</h2></div>
    <details><summary><span>00</span> Signature starts</summary><div className="lab-control-body"><p className="lab-help">Choose a complete colour and motif direction, then tune every detail yourself.</p><div className="lab-starter-grid">{DESIGN_STARTERS.map((starter) => <button type="button" className="lab-starter" key={starter.name} onClick={() => s.applyStarter(starter)}><DesignPreview design={{ ...d, ...starter.settings }} mode="pattern" /><strong>{starter.name}</strong><small>{starter.description}</small></button>)}</div></div></details>
    <details open><summary><span>01</span> Motif & rhythm</summary><div className="lab-control-body">
      <div className="lab-motif-grid">{MOTIFS.map((m) => <button key={m.id} type="button" aria-pressed={d.motif === m.id} onClick={() => s.change({ motif: m.id })}><DesignPreview design={{ ...d, motif: m.id, scale: 95, spacing: 8, secondary: "none", rotation: 0 }} mode="pattern" /><span>{m.name}</span></button>)}</div>
      <p className="lab-help">{s.motif.note} {d.motif === "custom" ? "Shape, rhythm and colour combine into a repeat that is uniquely yours." : "These are contemporary interpretations of regional motifs."}</p>
      {hasCustomMotif && <div className="lab-motif-builder"><span className="lab-eyebrow">Signature motif builder</span><label>Geometry<select value={d.customShape} onChange={(event) => s.change({ customShape: event.target.value as Design["customShape"] })}><option value="rosette">Petal rosette</option><option value="diamond">Nested diamonds</option><option value="leaf">Leaf burst</option><option value="wave">Ripple rings</option><option value="star">Pointed star</option></select></label><Range label="Petals / points" min={4} max={12} value={d.customCount} onChange={(customCount) => s.change({ customCount })} /><label>Center finish<select value={d.customCenter} onChange={(event) => s.change({ customCenter: event.target.value as Design["customCenter"] })}><option value="circle">Roundel</option><option value="diamond">Diamond</option><option value="dot">Fine dot</option><option value="none">Open centre</option></select></label><p className="lab-help">Your motif combines the ink, accent and detail colours. Changes flow through every custom layer and product preview.</p></div>}
      <div className="lab-motif-upload"><label>Bring your own artwork<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload a PNG, JPEG or WebP motif" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void s.importCustomMotif(file); event.currentTarget.value = ""; }} /></label><small>PNG, JPEG or WebP · up to 8 MB. Reduced to a compact, repeating motif and kept in this browser.</small>{d.customMotifImage && <div className="lab-uploaded-motif"><img src={d.customMotifImage} alt="Your uploaded motif" /><div><strong>Your artwork is in the repeat</strong>{d.customMotifPalette && <><span className="lab-artwork-colours" role="group" aria-label="Extracted four-colour palette">{d.customMotifPalette.map((colour, index) => <i key={`${colour}-${index}`} style={{ background: colour }} role="img" aria-label={`Palette colour ${index + 1}: ${colour}`} />)}</span><button type="button" className="lab-text-button" onClick={s.applyCustomMotifPalette}>Use artwork colours ↗</button></>}<button type="button" className="lab-text-button" onClick={s.removeCustomMotif}>Remove artwork</button></div></div>}</div>
      <label>Repeat layout<select value={d.repeat} onChange={(e) => s.change({ repeat: e.target.value as Design["repeat"] })}><option value="grid">Straight repeat</option><option value="brick">Half-brick</option><option value="half-drop">Half-drop</option><option value="diamond">Diamond lattice</option></select></label>
      <Range label="Motif scale" min={24} max={120} value={d.scale} onChange={(scale) => s.change({ scale })} />
      <Range label="Spacing" min={0} max={32} value={d.spacing} onChange={(spacing) => s.change({ spacing })} />
      <Range label="Rotation" min={0} max={360} step={5} value={d.rotation} suffix="°" onChange={(rotation) => s.change({ rotation })} />
      <div className="lab-orientation"><span className="lab-eyebrow">Pattern orientation</span><div><label className="lab-check"><input type="checkbox" checked={d.mirror} onChange={(e) => s.change({ mirror: e.target.checked })} /> Mirror horizontally</label><label className="lab-check"><input type="checkbox" checked={d.mirrorVertical} onChange={(e) => s.change({ mirrorVertical: e.target.checked })} /> Mirror vertically</label></div></div>
    </div></details>
    <details open><summary><span>02</span> Colour story</summary><div className="lab-control-body">
      <div className="lab-palette-grid">{PALETTES.map((p,i) => <button key={p.name} type="button" title={p.name} aria-label={`Apply ${p.name} palette`} onClick={() => s.palette(i)}><span>{p.colours.map((c) => <i key={c} style={{ background: c }} />)}</span><small>{p.name}</small></button>)}</div>
      <div className="lab-custom-palettes"><div className="lab-custom-palette-heading"><span className="lab-eyebrow">Your palette shelf <small>{s.customPalettes.length}/12</small></span></div><div className="lab-palette-save"><label><span className="sr-only">Palette name</span><input aria-label="Palette name" maxLength={30} placeholder={`My palette ${s.customPalettes.length + 1}`} value={s.paletteName} onChange={(event) => s.setPaletteName(event.target.value)} /></label><button type="button" className="lab-button" onClick={s.savePalette}>＋ Save palette</button></div>{!!s.customPalettes.length && <div className="lab-palette-grid">{s.customPalettes.map((palette) => <div className="lab-custom-palette" key={palette.id}><button type="button" aria-label={`Apply ${palette.name}`} onClick={() => s.applyCustomPalette(palette)}><span>{palette.colours.map((colour) => <i key={colour} style={{ background: colour }} />)}</span><small>{palette.name}</small></button><button type="button" aria-label={`Remove ${palette.name}`} onClick={() => s.removePalette(palette.id)}><Trash2 size={12} /></button></div>)}</div>}</div>
      <div className="lab-colours">{([{ key: "ink", label: "Motif ink" }, { key: "accent", label: "Accent" }, { key: "background", label: "Base cloth" }, { key: "detail", label: "Detail" }] as const).map((c) => <label key={c.key}><input type="color" aria-label={c.label} value={d[c.key]} onChange={(e) => s.change({ [c.key]: e.target.value })} /><span>{c.label}<small>{d[c.key]}</small></span></label>)}</div>
      <button type="button" className="lab-text-button" onClick={() => s.change({ ink: d.background, background: d.ink })}>Swap ink & base ↔</button>
    </div></details>
    <details><summary><span>03</span> Layers & finish</summary><div className="lab-control-body">
      <label>Secondary motif<select value={d.secondary} onChange={(e) => s.change({ secondary: e.target.value as Design["secondary"] })}><option value="none">None — keep it simple</option>{MOTIFS.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label>
      {d.secondary !== "none" && <>
        <Range label="Layer size" min={15} max={100} value={Math.round(d.secondaryScale * 100)} suffix="%" onChange={(value) => s.change({ secondaryScale: value / 100 })} />
        <Range label="Layer horizontal position" min={-60} max={120} value={d.secondaryX} onChange={(secondaryX) => s.change({ secondaryX })} />
        <Range label="Layer vertical position" min={-60} max={120} value={d.secondaryY} onChange={(secondaryY) => s.change({ secondaryY })} />
        <Range label="Layer rotation" min={0} max={360} step={15} value={d.secondaryRotation} suffix="°" onChange={(secondaryRotation) => s.change({ secondaryRotation })} />
        <Range label="Layer opacity" min={10} max={100} step={5} value={Math.round(d.secondaryOpacity * 100)} suffix="%" onChange={(value) => s.change({ secondaryOpacity: value / 100 })} />
        <button type="button" className="lab-text-button" onClick={() => s.change({ secondaryScale: 0.38, secondaryX: 34, secondaryY: 34, secondaryRotation: 0, secondaryOpacity: 1 })}>Reset layer placement ↺</button>
      </>}
      <Range label="Ink opacity" min={0.15} max={1} step={0.05} value={d.opacity} onChange={(opacity) => s.change({ opacity })} />
      <div className="lab-layer-list">{d.layers.map((layer, index) => <section className="lab-extra-layer" key={layer.id}><div className="lab-layer-heading"><span className="lab-eyebrow">Extra motif / 0{index + 1}</span><span className="lab-layer-actions"><button type="button" className="lab-text-button" aria-label={`Move extra motif ${index + 1} backward`} title="Move behind previous motif" disabled={index === 0} onClick={() => s.moveLayer(layer.id, -1)}>↓ Back</button><button type="button" className="lab-text-button" aria-label={`Move extra motif ${index + 1} forward`} title="Move in front of next motif" disabled={index === d.layers.length - 1} onClick={() => s.moveLayer(layer.id, 1)}>↑ Front</button><button type="button" className="lab-text-button" aria-label={`Remove extra motif ${index + 1}`} onClick={() => s.removeLayer(layer.id)}>Remove</button></span></div>
        <label>Shape<select value={layer.motif} onChange={(e) => s.updateLayer(layer.id, { motif: e.target.value as Design["motif"] })}>{MOTIFS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Ink<select value={layer.colour} onChange={(e) => s.updateLayer(layer.id, { colour: e.target.value as typeof layer.colour })}><option value="detail">Detail ink</option><option value="ink">Motif ink</option><option value="accent">Accent ink</option></select></label>
        <Range label={`Extra motif ${index + 1} size`} min={15} max={100} value={Math.round(layer.scale * 100)} suffix="%" onChange={(value) => s.updateLayer(layer.id, { scale: value / 100 })} />
        <Range label={`Extra motif ${index + 1} horizontal position`} min={-60} max={120} value={layer.x} onChange={(x) => s.updateLayer(layer.id, { x })} />
        <Range label={`Extra motif ${index + 1} vertical position`} min={-60} max={120} value={layer.y} onChange={(y) => s.updateLayer(layer.id, { y })} />
        <Range label={`Extra motif ${index + 1} rotation`} min={0} max={360} step={15} value={layer.rotation} suffix="°" onChange={(rotation) => s.updateLayer(layer.id, { rotation })} />
        <Range label={`Extra motif ${index + 1} opacity`} min={10} max={100} step={5} value={Math.round(layer.opacity * 100)} suffix="%" onChange={(value) => s.updateLayer(layer.id, { opacity: value / 100 })} />
      </section>)}</div>
      <button type="button" className="lab-button lab-add-layer" disabled={d.layers.length >= 3} onClick={s.addLayer}>＋ Add motif layer <span>{d.layers.length}/3</span></button>
      <label>Pattern placement<select value={d.placement} onChange={(e) => s.change({ placement: e.target.value as Design["placement"] })}><option value="all">All-over print</option><option value="panel">Centre panel</option><option value="border">Lower border</option></select></label>
      <label className="lab-check"><input type="checkbox" checked={d.border} onChange={(e) => s.change({ border: e.target.checked })} /> Add accent stripes</label>
      <label className="lab-check"><input type="checkbox" checked={d.texture} onChange={(e) => s.change({ texture: e.target.checked })} /> Woven texture preview</label>
    </div></details>
    <details><summary><span>04</span> Personal signature</summary><div className="lab-control-body">
      <label>Monogram or message<input maxLength={16} placeholder="e.g. AH / MADE BY ME" value={d.monogram} onChange={(e) => s.change({ monogram: e.target.value })} /></label>
      <label>Lettering style<select value={d.monogramFont} onChange={(e) => s.change({ monogramFont: e.target.value as Design["monogramFont"] })}><option value="serif">Classic serif</option><option value="sans">Clean sans</option><option value="script">Handwritten script</option></select></label>
      <label>Lettering ink<select value={d.monogramColor} onChange={(e) => s.change({ monogramColor: e.target.value as Design["monogramColor"] })}><option value="ink">Motif ink</option><option value="detail">Detail colour</option><option value="accent">Accent gold</option></select></label>
      <Range label="Letter size" min={14} max={54} value={d.textSize} onChange={(textSize) => s.change({ textSize })} />
      <Range label="Signature horizontal position" min={120} max={480} value={d.textX} onChange={(textX) => s.change({ textX })} />
      <Range label="Signature position" min={180} max={450} value={d.textY} onChange={(textY) => s.change({ textY })} />
      <p className="lab-help">Visible on the product preview. Adjust the position to fit your chosen silhouette.</p>
    </div></details>
  </aside>;
}
