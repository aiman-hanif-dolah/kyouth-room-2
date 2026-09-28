import type { ReactNode, CSSProperties } from "react";
import type { PartKey, ProjectState } from "@/lib/project/types";
import { yearCalc, rm } from "@/lib/project/store";
import { buildSlides as buildReferenceSlides, type SlideMedia } from "./slides";
import { ProductDemo } from "./ProductDemo";
import { BatikPattern, ProductPreview } from "./Batik";
import "./presentation.css";
import { presentationLead as lead } from "@/lib/project/presentation";

export interface VisualSlide { part: PartKey; title: string; body: ReactNode; detail: ReactNode; tone: string }

const Words = ({ children }: { children: ReactNode }) => <p className="deck-lead">{children}</p>;
const Tiles = ({ items }: { items: { title: string; text?: string }[] }) => <div className="deck-tiles">{items.map((x, i) => <article key={i} className="deck-reveal"><span className="deck-number">{String(i + 1).padStart(2, "0")}</span><h3>{x.title}</h3>{x.text && <p>{x.text}</p>}</article>)}</div>;
const compact = (text: string, limit = 14) => { const words = text.trim().split(/\s+/); return words.length > limit ? `${words.slice(0, limit).join(" ")}…` : text; };

export function buildSlides(s: ProjectState, interactive = true, media: SlideMedia = { assets: [], urls: {} }): VisualSlide[] {
  const c = s.company, b = s.business;
  const reference = buildReferenceSlides(s, false, media);
  const colours = { fg: c.palette[0]?.hex || "#232b75", accent: c.palette[1]?.hex || "#d7a347", bg: c.palette[c.palette.length - 1]?.hex || "#f4efe6" };
  const pattern = <BatikPattern motif="kawung" {...colours} scale={1.5} />;
  const product = <div className="deck-product"><ProductPreview kind="tote" motif="kawung" {...colours} scale={1.2} /></div>;
  const images = media.assets.filter((a) => a.kind === "image" && a.in_presentation && media.urls[a.id]);
  const gallery = (section: string, fallback: ReactNode) => {
    const list = images.filter((a) => a.section_id === section);
    return list.length ? <div className="deck-gallery">{list.map((a) => <figure key={a.id}><img src={media.urls[a.id]} alt={a.alt_text || a.caption} /><figcaption>{a.caption}</figcaption></figure>)}</div> : fallback;
  };
  const split = (copy: ReactNode, visual: ReactNode) => <div className="deck-split"><div className="deck-copy deck-reveal">{copy}</div><div className="deck-art deck-reveal">{visual}</div></div>;
  const [problemWant, problemBarrier] = lead(b.problem).split(/,\s*but\s+/i);
  const out: VisualSlide[] = [];
  const add = (part: PartKey, title: string, body: ReactNode, tone = "ink") => out.push({ part, title, body, tone, detail: <div className="space-y-8">{reference.filter((x) => x.part === part).map((x, i) => <section key={i}><h3 className="mb-3 font-medium">{x.title}</h3>{x.body}</section>)}</div> });
  add("opening", c.productName, split(<><span className="deck-kicker">{c.name} presents</span><h1 className="deck-hero">{c.tagline || c.productName}</h1><p className="deck-subtitle">{c.productName}</p><p className="deck-footnote">{s.members.map((m) => m.name).join(" · ")}</p><span className="deck-label">Fictional university startup concept</span></>, product), "indigo");
  add("company", "Rooted in culture. Made personal.", split(<><Words>{lead(c.mission)}</Words><div className="deck-swatches">{c.palette.map((x) => <span key={x.id} style={{ background: x.hex }} title={x.name} />)}</div><div className="deck-team">{c.founders.map((x) => <span key={x.id}><strong>{x.name}</strong><small>{x.role}</small></span>)}</div></>, gallery("s1", <div className="deck-pattern">{pattern}</div>)), "cream");
  add("business", "Tradition, without the friction.", <div className="deck-friction"><div><span className="deck-kicker">They want</span><Words>{compact(problemWant.replace(/[,;:]$/, ""))}</Words>{problemBarrier && <p className="deck-friction-barrier">Today: {compact(lead(problemBarrier))}</p>}</div><span className="deck-arrow" aria-hidden="true">→</span><div className="deck-answer"><span className="deck-kicker">The possibility</span><Words>{compact(lead(b.solution))}</Words></div><div className="deck-friction-pattern">{pattern}</div></div>);
  add("business", "A different kind of batik experience.", <div className="deck-competitors"><div className="deck-competitor-axis"><span>Guided design</span><span>→</span><span>Print only</span></div>{b.competitors.slice(0, 4).map((x, i) => <article key={x.id} className={i === b.competitors.length - 1 ? "deck-competitor-us" : ""}><span className="deck-competitor-mark">{i === b.competitors.length - 1 ? "✳" : String(i + 1).padStart(2, "0")}</span><div><h3>{x.name}</h3><p>{x.weakness}</p></div><strong>{x.price}</strong></article>)}</div>, "cream");
  add("business", "A strong start. Clear-eyed about the risks.", <div className="deck-swot">{([{ title: "Strengths", mark: "+", values: b.swot.strengths }, { title: "Weaknesses", mark: "−", values: b.swot.weaknesses }, { title: "Opportunities", mark: "↗", values: b.swot.opportunities }, { title: "Threats", mark: "!", values: b.swot.threats }] as const).map((x, i) => <article key={x.title} style={{ "--swot-index": i } as CSSProperties}><span>{x.mark}</span><h3>{x.title}</h3><p>{x.values.slice(0, 2).join(" · ")}</p></article>)}</div>);
  const max = Math.max(1, ...b.projection.map((r) => Math.abs(yearCalc(r).revenue)));
  add("business", "A market with room to grow.", <div className="deck-growth"><section className="deck-market"><span className="deck-label">Market hypotheses · validate before launch</span><Words>{compact(lead(b.market), 11)}</Words><div className="deck-landscape"><span>What exists</span><div>{b.competitors.slice(0, 3).map((x) => <span key={x.id}>{x.name}</span>)}</div></div></section><section className="deck-growth-forecast"><span className="deck-label">Assumption-based forecast</span><div className="deck-chart">{b.projection.map((r) => { const v = yearCalc(r); return <figure key={r.id}><strong>{rm(v.revenue)}</strong><div className="deck-bar-track"><div className="deck-bar" style={{ height: `${Math.max(1, Math.abs(v.revenue) / max * 100)}%` } as CSSProperties} /></div><figcaption>{r.label}<small>Net {rm(v.net)}</small></figcaption></figure>; })}</div><p className="deck-caption">{lead(b.revenueModel)}</p></section></div>, "cream");
  add("product", "From a pattern to your product.", split(<><span className="deck-kicker">Meet {c.productName}</span><Words>{lead(s.product.concept)}</Words><Tiles items={s.product.features.slice(0, 3).map((x) => ({ title: x.title }))} /></>, gallery("s4", product)), "cream");
  add("product", "Don't imagine it. Design it.", interactive ? <ProductDemo /> : split(<Words>Choose a motif. Make it yours. Preview your product.</Words>, product));
  add("marketing", "Make it. Wear it. Share it.", <><Words>{lead(s.marketing.strategy)}</Words><Tiles items={s.marketing.pillars.map((x) => ({ title: x.title, text: lead(x.description) }))} /></>, "indigo");
  add("marketing", "A campaign you can see.", gallery("s6", <Tiles items={s.marketing.samples.filter((x, i, all) => all.findIndex((y) => y.platform === x.platform) === i).map((x) => ({ title: x.platform, text: x.title }))} />), "cream");
  add("demographics", "Made for people, not profiles.", <><span className="deck-label">Fictional composite personas · hypotheses to validate</span><div className="deck-persona-stage">{s.customers.personas.slice(0, 2).map((x, i) => <article key={x.id} className={i === 0 ? "deck-persona-primary" : "deck-persona-secondary"}><span className="deck-avatar">{String(i + 1).padStart(2, "0")}</span><h3>{x.name}</h3><p>{x.occupation} · {x.location}</p><blockquote>“{x.quote}”</blockquote></article>)}</div><div className="deck-journey">{s.customers.journey.slice(0, 5).map((x) => <span key={x.id}>{x.stage}</span>)}</div></>);
  add("prompts", "Better questions. Better possibilities.", <><div className="deck-stats"><div><strong>{s.prompts.length}</strong><span>Library templates</span></div><div><strong>{s.usedPrompts.length}</strong><span>Actually logged as used</span></div></div><div className="deck-prompt-flow">{[{ title: "Role", mark: "01" }, { title: "Context", mark: "02" }, { title: "Task", mark: "03" }, { title: "Constraints", mark: "04" }, { title: "Format", mark: "05" }].map((step) => <div key={step.mark}><small>{step.mark}</small><strong>{step.title}</strong></div>)}</div><p className="deck-caption">A repeatable prompt structure. Human judgement at every step.</p></>, "indigo");
  const improved = s.prompts.filter((x) => x.notes.trim());
  add("prompts", "From first draft to checked result.", <div className="deck-ai-loop"><div className="deck-journey deck-loop"><span>Brief</span><span>Generate</span><span>Review</span><span>Refine ↺</span></div><div className="deck-ai-guardrails"><p className="deck-kicker">AI proposes. People verify.</p><Tiles items={[{ title: "Numbers", text: "Recalculate. Label assumptions." }, { title: "Claims", text: "Check original sources." }, { title: "Culture", text: "Review motifs and context." }]} /></div><p className="deck-caption">{improved.length ? `${improved.length} prompt improvements documented` : "Iteration evidence still to be documented"} · {s.usedPrompts.length} prompts logged as used</p></div>);
  add("conclusion", "Your pattern. Your next chapter.", split(<><span className="deck-kicker">{c.productName}</span><Words>{c.tagline}</Words><p className="deck-caption">{lead(c.vision)}</p></>, gallery("s2", <div className="deck-pattern">{pattern}</div>)), "indigo");
  add("qa", "Let's talk possibilities.", <div className="deck-finale"><div className="deck-finale-pattern">{pattern}</div><span className="deck-kicker">{c.name} / {c.productName}</span><h1 className="deck-hero">Terima<br />kasih.</h1><p className="deck-subtitle">Questions & conversation ↗</p></div>, "cream");
  return out;
}

