import type { ReactNode } from "react";
import type { PartKey, ProjectState } from "@/lib/project/types";
import { yearCalc, rm, memberName } from "@/lib/project/store";
import { ProductDemo } from "./ProductDemo";
import type { Asset } from "@/lib/project/assets";

export interface SlideMedia { assets: Asset[]; urls: Record<string, string> }
interface Pic { id: string; url: string; caption: string; alt: string; w?: number | null; h?: number | null }

/** Adapts layout to image count and aspect ratio; never crops uploaded images. */
function VisualGrid({ pics }: { pics: Pic[] }) {
  const n = pics.length;
  const cols = n === 1 ? "grid-cols-1" : n === 2 || n === 4 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
  const maxH = n === 1 ? "max-h-[60vh]" : n <= 3 ? "max-h-[45vh]" : "max-h-[24vh]";
  return (
    <div className={`grid items-center gap-4 ${cols}`} data-testid="slide-visuals">
      {pics.map((x) => (
        <figure key={x.id} className="flex flex-col items-center">
          <img src={x.url} alt={x.alt || x.caption} style={x.w && x.h ? { aspectRatio: `${x.w} / ${x.h}` } : undefined} className={`${maxH} w-auto max-w-full rounded-lg object-contain`} />
          {x.caption && <figcaption className="mt-1 text-center text-sm text-muted-foreground">{x.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export interface Slide {
  part: PartKey;
  title: string;
  body: ReactNode;
}

const Missing = () => <span className="text-warning">Not completed yet</span>;
const T = ({ v }: { v: string }) => (v?.trim() ? <>{v}</> : <Missing />);
const Label = ({ children }: { children: ReactNode }) => <span className="rounded-full border border-warning/40 px-2 py-0.5 text-[11px] text-warning">{children}</span>;
const Grid = ({ children, cols = 2 }: { children: ReactNode; cols?: number }) => (
  <div className={cols === 3 ? "grid gap-4 md:grid-cols-3" : cols === 4 ? "grid gap-4 md:grid-cols-4" : "grid gap-4 md:grid-cols-2"}>{children}</div>
);
const Box = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-brand-soft">{title}</p>
    <div className="whitespace-pre-line text-[15px] leading-relaxed text-subtle">{children}</div>
  </div>
);
const Bullets = ({ items }: { items: string[] }) => (items.filter((x) => x.trim()).length ? <ul className="list-disc space-y-1 pl-5">{items.filter((x) => x.trim()).map((x, i) => <li key={i}>{x}</li>)}</ul> : <Missing />);

/** Pure selector: every slide reads from project state. Nothing is copied. */
export function buildSlides(s: ProjectState, interactive = true, media: SlideMedia = { assets: [], urls: {} }): Slide[] {
  const deck = media.assets.filter((a) => a.kind === "image" && a.in_presentation && media.urls[a.id]);
  const toPic = (a: Asset): Pic => ({ id: a.id, url: media.urls[a.id], caption: a.caption, alt: a.alt_text, w: a.width, h: a.height });
  const pics = (pred: (a: Asset) => boolean) => deck.filter(pred).map(toPic);
  const visuals = (part: PartKey, title: string, list: Pic[]) => {
    for (let k = 0; k < list.length; k += 6) add(part, list.length > 6 ? `${title} (${k / 6 + 1}/${Math.ceil(list.length / 6)})` : title, <VisualGrid pics={list.slice(k, k + 6)} />);
  };
  const sampleImg = (id: string) => deck.find((a) => a.slot === `marketing.sample.${id}`);
  const c = s.company, b = s.business, p = s.product, cu = s.customers, m = s.marketing;
  const out: Slide[] = [];
  const add = (part: PartKey, title: string, body: ReactNode) => out.push({ part, title, body });

  add("opening", c.name, (
    <div className="flex h-full flex-col justify-center">
      <p className="text-brand-soft">Presenting {c.productName}</p>
      <h1 className="mt-3 text-5xl font-normal tracking-[-1.3px] md:text-7xl">{c.name}</h1>
      <p className="mt-4 text-2xl text-subtle"><T v={c.tagline} /></p>
      <p className="mt-10 text-sm text-muted-foreground">{s.members.map((x) => x.name).join(" · ")}</p>
      <div className="mt-3"><Label>Fictional startup concept for a university project</Label></div>
    </div>
  ));
  add("opening", "Agenda", <ol className="grid gap-2 text-lg md:grid-cols-2">{s.presentation.map((x, i) => <li key={x.key} className="rounded-lg border border-border px-4 py-3"><span className="mr-3 font-mono text-sm text-brand-soft">{String(i + 1).padStart(2, "0")}</span>{x.title} <span className="text-sm text-muted-foreground">({x.minutes} min)</span></li>)}</ol>);

  add("company", "Who we are", <Grid><Box title="Mission"><T v={c.mission} /></Box><Box title="Vision"><T v={c.vision} /></Box><Box title="Core values"><Bullets items={c.values} /></Box><Box title="Brand palette"><div className="flex h-16 overflow-hidden rounded-lg">{c.palette.map((x) => <div key={x.id} className="flex-1" style={{ background: x.hex }} title={x.name} />)}</div></Box></Grid>);
  add("company", "Our story", <Grid><Box title="Background"><T v={c.background} /></Box><Box title="Founding story (fictional)"><T v={c.foundingStory} /></Box><Box title="Why this concept"><T v={c.rationale} /></Box><Box title="USP"><T v={c.usp} /></Box></Grid>);
  add("company", "The founding team", <><Grid cols={3}>{c.founders.map((f) => <Box key={f.id} title={f.role || "Founder"}><p className="text-foreground">{f.name}</p><p className="mt-1 text-sm">{f.bio}</p></Box>)}</Grid><p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{c.orgStructure}</p></>);

  const logoFirst = (a: Asset) => (a.slot === "company.logo" ? 0 : 1);
  visuals("company", "Brand visuals", deck.filter((a) => a.section_id === "s1" || a.section_id === "s2").sort((a, b) => logoFirst(a) - logoFirst(b)).map(toPic));

  add("business", "Problem and solution", <Grid><Box title="Problem"><T v={b.problem} /></Box><Box title="Solution"><T v={b.solution} /></Box></Grid>);
  add("business", "Market", <Grid><Box title="Market analysis"><T v={b.market} /></Box><Box title="Assumptions to verify"><Bullets items={b.assumptions} /></Box></Grid>);
  add("business", "Competitors", (
    <table className="w-full text-left text-sm">
      <thead><tr className="text-muted-foreground"><th className="pb-2">Competitor</th><th>Price</th><th>Customisation</th><th>Local identity</th><th>Weakness</th></tr></thead>
      <tbody>{b.competitors.map((k) => <tr key={k.id} className="border-t border-border"><td className="py-2 text-foreground">{k.name}</td><td>{k.price}</td><td>{k.customisation}</td><td>{k.localIdentity}</td><td>{k.weakness}</td></tr>)}</tbody>
    </table>
  ));
  add("business", "SWOT", <Grid><Box title="Strengths"><Bullets items={b.swot.strengths} /></Box><Box title="Weaknesses"><Bullets items={b.swot.weaknesses} /></Box><Box title="Opportunities"><Bullets items={b.swot.opportunities} /></Box><Box title="Threats"><Bullets items={b.swot.threats} /></Box></Grid>);
  add("business", "Financial projection (RM)", (
    <>
      <div className="mb-3"><Label>Assumption-based forecast, not actual results</Label></div>
      <table className="w-full text-right text-base tabular-nums">
        <thead><tr className="text-muted-foreground"><th className="pb-2 text-left">Line</th>{b.projection.map((r) => <th key={r.id}>{r.label}</th>)}</tr></thead>
        <tbody>
          {(["revenue", "gross", "net"] as const).map((k) => <tr key={k} className="border-t border-border"><td className="py-2 text-left">{({ revenue: "Revenue", gross: "Gross profit", net: "Net profit" })[k]}</td>{b.projection.map((r) => { const v = yearCalc(r)[k]; return <td key={r.id} className={k === "net" ? (v < 0 ? "text-destructive" : "text-success") : ""}>{rm(v)}</td>; })}</tr>)}
          <tr className="border-t border-border text-muted-foreground"><td className="py-2 text-left">Units</td>{b.projection.map((r) => <td key={r.id}>{r.units.toLocaleString()}</td>)}</tr>
        </tbody>
      </table>
      <Grid><div className="mt-4"><Box title="Revenue model"><T v={b.revenueModel} /></Box></div><div className="mt-4"><Box title="Costs"><T v={b.costStructure} /></Box></div></Grid>
    </>
  ));

  visuals("business", "Business visuals", pics((a) => a.section_id === "s3"));

  add("product", c.productName, <Grid><Box title="Concept"><T v={p.concept} /></Box><Box title="Description"><T v={p.description} /></Box><Box title="Features">{p.features.map((f) => <p key={f.id}><span className="text-foreground">{f.title}:</span> {f.benefit}</p>)}</Box><Box title="Differentiators"><Bullets items={p.differentiators} /></Box></Grid>);
  add("product", "Live demo", interactive ? <ProductDemo /> : <p className="text-muted-foreground">Live interactive demo shown in the app.</p>);
  visuals("product", "Mockups", [...p.mockups.filter((x) => resolveUrl(x.url, media.urls)).map((x) => ({ id: x.id, url: resolveUrl(x.url, media.urls), caption: x.caption, alt: x.caption })), ...pics((a) => a.section_id === "s4")]);

  add("marketing", "Marketing strategy", <Grid><Box title="Strategy"><T v={m.strategy} /></Box><Box title="Content pillars">{m.pillars.map((x) => <p key={x.id}><span className="text-foreground">{x.title}:</span> {x.description}</p>)}</Box><Box title="Influencers"><T v={m.influencer} /></Box><Box title="Paid ads"><T v={m.paid} /></Box></Grid>);
  add("marketing", "Content samples", (
    <Grid cols={4}>
      {(["instagram", "tiktok", "facebook", "linkedin"] as const).map((pl) => {
        const list = m.samples.filter((x) => x.platform === pl);
        return <Box key={pl} title={`${pl} (${list.length})`}>{list.slice(0, 3).map((x) => <div key={x.id} className="mb-3 border-b border-border pb-2 text-sm last:border-0">{(() => { const a = sampleImg(x.id); const src = a ? media.urls[a.id] : x.imageUrl; return src ? <img src={src} alt={a?.alt_text || x.title} className="mb-1 max-h-40 w-full rounded object-contain" /> : null; })()}<p className="text-foreground">{x.title}</p><p className="line-clamp-3">{x.body}</p></div>)}</Box>;
      })}
    </Grid>
  ));

  visuals("marketing", "Campaign visuals", pics((a) => a.section_id === "s6" && !a.slot.startsWith("marketing.sample.")));

  add("demographics", "Who we serve", <><div className="mb-3"><Label>Hypotheses to validate</Label></div><Grid>{cu.segments.map((x) => <Box key={x.label} title={x.label}><T v={x.value} /></Box>)}</Grid></>);
  add("demographics", "Personas", <Grid cols={3}>{cu.personas.map((x) => <Box key={x.id} title={x.name}><p className="italic">"{x.quote}"</p><p className="mt-2 text-sm">{x.location} · {x.occupation} · {x.income}</p><p className="mt-2 text-sm"><span className="text-foreground">Goals:</span> {x.goals}</p><p className="text-sm"><span className="text-foreground">Frustrations:</span> {x.frustrations}</p></Box>)}</Grid>);
  add("demographics", "Customer journey", <div className="grid gap-2 md:grid-cols-6">{cu.journey.map((j, i) => <div key={j.id} className="rounded-lg border border-border bg-card p-3 text-sm"><p className="font-mono text-[10px] text-brand-soft">{i + 1}</p><p className="text-foreground">{j.stage}</p><p className="mt-2 text-muted-foreground">{j.pains}</p><p className="mt-2 text-success">{j.opportunities}</p></div>)}</div>);

  visuals("demographics", "Customer visuals", pics((a) => a.section_id === "s5"));

  const cats = ["Ideation", "Analysis", "Marketing", "Image generation", "Technical/prototype"] as const;
  add("prompts", "AI prompt engineering", (
    <div className="flex h-full flex-col justify-center">
      <p className="text-brand-soft">Main technical highlight</p>
      <h2 className="mt-2 text-5xl font-normal tracking-[-1.3px]">How we designed, tested and checked our prompts</h2>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">{cats.map((k) => <div key={k} className="rounded-xl border border-border bg-card p-4"><p className="text-3xl tabular-nums">{s.prompts.filter((x) => x.category === k).length}</p><p className="text-sm text-muted-foreground">{k}</p></div>)}</div>
      <p className="mt-4 text-sm text-muted-foreground">{s.prompts.length} templates in library · {s.usedPrompts.length} prompts logged as actually used</p>
    </div>
  ));
  add("prompts", "Prompt design pattern", <Grid><Box title="Our structure">{"1. Role: who the AI should act as\n2. Context: company, product, Malaysia, RM\n3. Task: one clear job\n4. Constraints: length, tone, 'do not invent statistics'\n5. Format: table, bullets or script\n6. Variables: {product}, {city}, {segment} for reuse"}</Box><Box title="Example template">{(() => { const x = s.prompts.find((q) => q.category === "Analysis") ?? s.prompts[0]; return x ? <><p className="text-foreground">{x.title}</p><p className="mt-2 font-mono text-sm">{x.text}</p></> : <Missing />; })()}</Box></Grid>);
  const improved = s.prompts.filter((x) => x.notes.trim());
  add("prompts", "Iteration: what we improved", improved.length ? <Grid>{improved.slice(0, 4).map((x) => <Box key={x.id} title={x.title}><p>{x.notes}</p></Box>)}</Grid> : <p className="text-lg"><Missing /> Add "What was improved" notes in the Prompt Library to fill this slide.</p>);
  add("prompts", "Prompts we actually used", s.usedPrompts.length ? <div className="space-y-3">{s.usedPrompts.slice(0, 4).map((x) => <div key={x.id} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{memberName(s, x.memberId)} · {x.tool}</p><p className="mt-1 font-mono text-sm text-subtle">{x.prompt}</p>{x.howChecked && <p className="mt-2 text-sm text-success">Checked: {x.howChecked}</p>}</div>)}</div> : <p className="text-lg"><Missing /> Log real prompts in the Prompt Library. Nothing is claimed as used until a member records it.</p>);
  add("prompts", "Limitations and how we checked outputs", <Grid><Box title="Limitations">{"AI invents market statistics confidently\nFinancial maths can be wrong\nImage tools struggle with authentic batik motifs\nCultural nuance needs human review"}</Box><Box title="How we checked">{"Every number labelled as assumption\nRecalculated projections in our own table\nCompared prices with real listings\nGroup review before marking a section complete"}</Box></Grid>);

  visuals("prompts", "Prompt work visuals", pics((a) => a.section_id === "s7"));
  add("conclusion", "Conclusion", <div className="flex h-full flex-col justify-center"><h2 className="text-5xl font-normal tracking-[-1.3px]">{c.name}: <T v={c.tagline} /></h2><p className="mt-6 max-w-2xl text-xl text-subtle"><T v={c.vision} /></p></div>);
  add("qa", "Questions?", <div className="flex h-full flex-col items-center justify-center text-center"><h2 className="text-7xl font-normal tracking-[-1.3px]">Terima kasih</h2><p className="mt-4 text-xl text-muted-foreground">Questions and answers</p></div>);
  return out;
}
