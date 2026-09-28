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
  const out: VisualSlide[] = [];
  const add = (part: PartKey, title: string, body: ReactNode, tone = "ink") => out.push({ part, title, body, tone, detail: <div className="space-y-8">{reference.filter((x) => x.part === part).map((x, i) => <section key={i}><h3 className="mb-3 font-medium">{x.title}</h3>{x.body}</section>)}</div> });
  add("opening", c.productName, split(<><span className="deck-kicker">{c.name} presents</span><h1 className="deck-hero">{c.tagline || c.productName}</h1><p className="deck-subtitle">{c.productName}</p><p className="deck-footnote">{s.members.map((m) => m.name).join(" · ")}</p><span className="deck-label">Fictional university startup concept</span></>, product), "indigo");
  add("company", "Rooted in culture. Made personal.", split(<><Words>{lead(c.mission)}</Words><div className="deck-swatches">{c.palette.map((x) => <span key={x.id} style={{ background: x.hex }} title={x.name} />)}</div><div className="deck-team">{c.founders.map((x) => <span key={x.id}><strong>{x.name}</strong><small>{x.role}</small></span>)}</div></>, gallery("s1", <div className="deck-pattern">{pattern}</div>)), "cream");
  add("business", "A problem worth solving.", <div className="deck-versus"><article><span className="deck-kicker">The friction</span><Words>{lead(b.problem)}</Words></article><span className="deck-arrow" aria-hidden="true">↗</span><article><span className="deck-kicker">Our answer</span><Words>{lead(b.solution)}</Words></article></div>);
  add("business", "Where we can win.", <><span className="deck-label">Market hypotheses · validate before launch</span><Words>{lead(b.market)}</Words><Tiles items={b.competitors.map((x) => ({ title: x.name, text: `${x.price} · ${x.weakness}` }))} /><p className="deck-caption">Our edge: {lead(c.usp)}</p></>, "cream");
  const max = Math.max(1, ...b.projection.map((r) => Math.abs(yearCalc(r).revenue)));
  add("business", "The business in numbers.", <><span className="deck-label">Assumption-based forecast · not actual results</span><div className="deck-chart">{b.projection.map((r) => { const v = yearCalc(r); return <figure key={r.id}><strong>{rm(v.revenue)}</strong><div className="deck-bar-track"><div className="deck-bar" style={{ height: `${Math.max(1, Math.abs(v.revenue) / max * 100)}%` } as CSSProperties} /></div><figcaption>{r.label}<small>Revenue · {r.units.toLocaleString()} units</small><small>Net {rm(v.net)}</small></figcaption></figure>; })}</div><p className="deck-caption">{lead(b.revenueModel)}</p></>);
  add("product", "From a pattern to your product.", split(<><span className="deck-kicker">Meet {c.productName}</span><Words>{lead(s.product.concept)}</Words><Tiles items={s.product.features.slice(0, 3).map((x) => ({ title: x.title }))} /></>, gallery("s4", product)), "cream");
  add("product", "Don't imagine it. Design it.", interactive ? <ProductDemo /> : split(<Words>Choose a motif. Make it yours. Preview your product.</Words>, product));
  add("marketing", "Make it. Wear it. Share it.", <><Words>{lead(s.marketing.strategy)}</Words><Tiles items={s.marketing.pillars.map((x) => ({ title: x.title, text: lead(x.description) }))} /></>, "indigo");
  add("marketing", "A campaign you can see.", gallery("s6", <Tiles items={s.marketing.samples.filter((x, i, all) => all.findIndex((y) => y.platform === x.platform) === i).map((x) => ({ title: x.platform, text: x.title }))} />), "cream");
  add("demographics", "Made for people, not profiles.", <><span className="deck-label">Fictional composite personas · hypotheses to validate</span><div className="deck-personas">{s.customers.personas.map((x, i) => <article key={x.id}><span className="deck-avatar">{String(i + 1).padStart(2, "0")}</span><h3>{x.name}</h3><p>{x.occupation} · {x.location}</p><blockquote>“{x.quote}”</blockquote></article>)}</div><div className="deck-journey">{s.customers.journey.map((x) => <span key={x.id}>{x.stage}</span>)}</div></>);
  add("prompts", "Better questions. Better possibilities.", <><div className="deck-stats"><div><strong>{s.prompts.length}</strong><span>Library templates</span></div><div><strong>{s.usedPrompts.length}</strong><span>Actually logged as used</span></div></div><Tiles items={[{ title: "Role + context" }, { title: "Task + constraints" }, { title: "Format + variables" }]} /><p className="deck-caption">A repeatable prompt structure. Human judgement at every step.</p></>, "indigo");
  const improved = s.prompts.filter((x) => x.notes.trim());
  add("prompts", "The first answer is a starting point.", <><div className="deck-journey deck-loop"><span>Brief</span><span>Generate</span><span>Review</span><span>Refine ↺</span></div><Tiles items={improved.length ? improved.slice(0, 3).map((x) => ({ title: x.title, text: lead(x.notes) })) : [{ title: "Iteration evidence pending", text: "Add improvement notes in the Prompt Library to show what changed." }]} /></>, "cream");
  add("prompts", "AI proposes. People verify.", <><Tiles items={[{ title: "Numbers", text: "Recalculate. Label assumptions." }, { title: "Claims", text: "Check against original sources." }, { title: "Culture", text: "Review motifs and context." }]} /><p className="deck-kicker">Recorded verification evidence</p><Tiles items={s.usedPrompts.length ? s.usedPrompts.slice(0, 2).map((x) => ({ title: x.tool, text: x.howChecked ? lead(x.howChecked) : "Verification not recorded yet" })) : [{ title: "No used prompts logged yet", text: "The library alone is not evidence of execution." }]} /></>);
  add("conclusion", "Your pattern. Your next chapter.", split(<><span className="deck-kicker">{c.productName}</span><Words>{c.tagline}</Words><p className="deck-caption">{lead(c.vision)}</p></>, gallery("s2", <div className="deck-pattern">{pattern}</div>)), "indigo");
  add("qa", "Let's talk possibilities.", <div className="deck-finale"><div className="deck-finale-pattern">{pattern}</div><span className="deck-kicker">{c.name} / {c.productName}</span><h1 className="deck-hero">Terima<br />kasih.</h1><p className="deck-subtitle">Questions & conversation ↗</p></div>, "cream");
  return out;
}

