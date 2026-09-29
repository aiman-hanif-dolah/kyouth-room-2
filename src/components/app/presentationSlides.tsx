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
    const sectionImages = images.filter((a) => a.section_id === section);
    const list = section === "s6"
      ? ["ig", "tt", "fb"].flatMap((platform) => {
        const asset = sectionImages.find((a) => a.slot.startsWith(`marketing.sample.${platform}`));
        return asset ? [asset] : [];
      })
      : sectionImages;
    return list.length ? <div className={section === "s6" ? "deck-gallery deck-gallery-campaign" : "deck-gallery"}>{list.map((a) => {
      const platform = a.slot.match(/^marketing\.sample\.(ig|tt|fb)/)?.[1];
      const platformName = platform === "ig" ? "Instagram" : platform === "tt" ? "TikTok" : platform === "fb" ? "Facebook" : a.file_name;
      return <figure key={a.id}><img src={media.urls[a.id]} alt={a.alt_text || a.caption || a.file_name} /><figcaption>{a.caption || platformName}</figcaption></figure>;
    })}</div> : fallback;
  };
  const split = (copy: ReactNode, visual: ReactNode) => <div className="deck-split"><div className="deck-copy deck-reveal">{copy}</div><div className="deck-art deck-reveal">{visual}</div></div>;
  const [problemWant, problemBarrier] = lead(b.problem).split(/,\s*but\s+/i);
  const out: VisualSlide[] = [];
  const add = (part: PartKey, title: string, body: ReactNode, tone = "ink") => out.push({ part, title, body, tone, detail: <div className="space-y-8">{reference.filter((x) => x.part === part).map((x, i) => <section key={i}><h3 className="mb-3 font-medium">{x.title}</h3>{x.body}</section>)}</div> });
  add("opening", c.productName, split(<><span className="deck-kicker">{c.name} presents</span><h1 className="deck-hero">{c.tagline || c.productName}</h1><p className="deck-subtitle">{c.productName}</p><p className="deck-footnote">{s.members.map((m) => m.name).join(" · ")}</p><span className="deck-label">Fictional university startup concept</span></>, product), "indigo");
  add("company", "Rooted in culture. Made personal.", split(<><Words>{lead(c.mission)}</Words><div className="deck-swatches">{c.palette.map((x) => <span key={x.id} style={{ background: x.hex }} title={x.name} />)}</div><span className="deck-label">Course project team</span><div className="deck-team">{s.members.map((member) => <span key={member.id}><strong>{member.name}</strong></span>)}</div></>, gallery("s1", <div className="deck-pattern">{pattern}</div>)), "cream");
  add("business", "Tradition, without the friction.", <div className="deck-friction"><div><span className="deck-label">Problem hypothesis · validate with the planned 30-person survey</span><span className="deck-kicker">They want</span><Words>{compact(problemWant.replace(/[,;:]$/, ""))}</Words>{problemBarrier && <p className="deck-friction-barrier">Today: {compact(lead(problemBarrier))}</p>}</div><span className="deck-arrow" aria-hidden="true">→</span><div className="deck-answer"><span className="deck-kicker">The possibility</span><Words>{compact(lead(b.solution))}</Words></div><div className="deck-friction-pattern">{pattern}</div></div>);
  add("business", "A different kind of batik experience.", <div className="deck-competitors"><span className="deck-label">Project comparison · prices and claims need source checks</span><div className="deck-competitor-axis"><span>Guided design</span><span>→</span><span>Print only</span></div>{b.competitors.slice(0, 4).map((x, i) => <article key={x.id} className={i === b.competitors.length - 1 ? "deck-competitor-us" : ""}><span className="deck-competitor-mark">{i === b.competitors.length - 1 ? "✳" : String(i + 1).padStart(2, "0")}</span><div><h3>{x.name}</h3><p>{x.weakness}</p></div><strong>{x.price}</strong></article>)}</div>, "cream");
  add("business", "A strong start. Clear-eyed about the risks.", <div className="deck-swot">{([{ title: "Strengths", mark: "+", values: b.swot.strengths }, { title: "Weaknesses", mark: "−", values: b.swot.weaknesses }, { title: "Opportunities", mark: "↗", values: b.swot.opportunities }, { title: "Threats", mark: "!", values: b.swot.threats }] as const).map((x, i) => <article key={x.title} style={{ "--swot-index": i } as CSSProperties}><span>{x.mark}</span><h3>{x.title}</h3><p>{x.values.slice(0, 2).join(" · ")}</p></article>)}</div>);
  const max = Math.max(1, ...b.projection.map((r) => Math.abs(yearCalc(r).revenue)));
  add("business", "A market with room to grow.", <div className="deck-growth"><section className="deck-market"><span className="deck-label">Market hypotheses · validate before launch</span><Words>{compact(lead(b.market), 11)}</Words><div className="deck-landscape"><span>What exists</span><div>{b.competitors.slice(0, 3).map((x) => <span key={x.id}>{x.name}</span>)}</div></div></section><section className="deck-growth-forecast"><span className="deck-label">Assumption-based forecast</span><div className="deck-chart">{b.projection.map((r) => { const v = yearCalc(r); return <figure key={r.id}><strong>{rm(v.revenue)}</strong><div className="deck-bar-track"><div className="deck-bar" style={{ height: `${Math.max(1, Math.abs(v.revenue) / max * 100)}%` } as CSSProperties} /></div><figcaption>{r.label}<small>Net {rm(v.net)}</small></figcaption></figure>; })}</div><p className="deck-caption">{lead(b.revenueModel)}</p></section></div>, "cream");
  add("product", "From a pattern to your product.", split(<><span className="deck-kicker">Meet {c.productName}</span><Words>{lead(s.product.concept)}</Words><Tiles items={s.product.features.slice(0, 3).map((x) => ({ title: x.title }))} /></>, gallery("s4", product)), "cream");
  add("product", "Don't imagine it. Design it.", interactive ? <ProductDemo /> : split(<Words>Choose a motif. Make it yours. Preview your product.</Words>, product));
  add("marketing", "Make it. Wear it. Share it.", <><Words>{lead(s.marketing.strategy)}</Words><Tiles items={s.marketing.pillars.map((x) => ({ title: x.title, text: lead(x.description) }))} /></>, "indigo");
  add("marketing", "A campaign you can see.", gallery("s6", <div className="deck-campaign-grid">{s.marketing.samples.filter((x, i, all) => all.findIndex((y) => y.platform === x.platform) === i).slice(0, 3).map((sample) => <article className={`deck-campaign-card deck-campaign-${sample.platform}`} key={sample.id}><span className="deck-campaign-platform">{sample.platform}</span><h3>{sample.title}</h3><p>{compact(lead(sample.body), 19)}</p><strong>{sample.cta}</strong><small>Concept mockup · project copy</small></article>)}</div>), "cream");
  add("demographics", "Made for people, not profiles.", <><span className="deck-label">Fictional composite personas · hypotheses to validate</span><div className="deck-persona-stage">{s.customers.personas.slice(0, 2).map((x, i) => <article key={x.id} className={i === 0 ? "deck-persona-primary" : "deck-persona-secondary"}><span className="deck-avatar">{String(i + 1).padStart(2, "0")}</span><h3>{x.name}</h3><p>{x.occupation} · {x.location}</p><blockquote>“{x.quote}”</blockquote></article>)}</div><div className="deck-journey">{s.customers.journey.slice(0, 5).map((x) => <span key={x.id}>{x.stage}</span>)}</div></>);
  add("prompts", "Better questions. Better possibilities.", <><div className="deck-stats"><div><strong>{s.prompts.length}</strong><span>Library templates</span></div><div><strong>{s.usedPrompts.length}</strong><span>Actually logged as used</span></div></div><div className="deck-prompt-flow">{[{ title: "Role", mark: "01" }, { title: "Context", mark: "02" }, { title: "Task", mark: "03" }, { title: "Constraints", mark: "04" }, { title: "Format", mark: "05" }].map((step) => <div key={step.mark}><small>{step.mark}</small><strong>{step.title}</strong></div>)}</div><p className="deck-caption">A repeatable prompt structure. Human judgement at every step.</p></>, "indigo");
  add("prompts", "Test. Review. Refine.", <div className="deck-ai-loop"><div className="deck-journey deck-loop"><span>Brief</span><span>Generate</span><span>Review</span><span>Refine ↺</span></div><div className="deck-ai-guardrails"><p className="deck-kicker">AI proposes. People verify.</p><Tiles items={[{ title: "Numbers", text: "Recalculate. Label assumptions." }, { title: "Claims", text: "Check original sources." }, { title: "Culture", text: "Review motifs and context." }]} /></div><p className="deck-caption">{s.usedPrompts.length ? `${s.usedPrompts.length} actual prompt runs logged` : "No actual prompt runs logged · before/after example [DETAIL NEEDED]"}</p></div>);
  add("conclusion", "Your pattern. Your next chapter.", split(<><span className="deck-kicker">{c.productName}</span><Words>{c.tagline}</Words><p className="deck-caption">{lead(c.vision)}</p></>, gallery("s2", <div className="deck-pattern">{pattern}</div>)), "indigo");
  add("qa", "Let's talk possibilities.", <div className="deck-finale"><div className="deck-finale-pattern">{pattern}</div><span className="deck-kicker">{c.name} / {c.productName}</span><h1 className="deck-hero">Terima<br />kasih.</h1><p className="deck-subtitle">Questions & conversation ↗</p></div>, "cream");
  return out;
}

export function buildCompanyProfileSlides(s: ProjectState, media: SlideMedia = { assets: [], urls: {} }): VisualSlide[] {
  const c = s.company;
  const background = c.background.replace(/^Tech Ventura is a fictional student-founded startup based in ([^.]+)\. It builds (.+?)\.?$/, "A fictional student startup in $1, connecting young Malaysians with local craft through playful design tools.");
  const location = c.background.match(/based in ([^.]+)\./i)?.[1] ?? "[DETAIL NEEDED]";
  const story = c.foundingStory.replace(/^Fictional:\s*/, "");
  const foundingSummary = story.startsWith("During a group assignment, five friends struggled")
    ? "Five friends sought a personal Hari Raya gift for their lecturer. Custom batik felt slow and costly; generic print felt impersonal. They sketched an app for custom batik."
    : compact(story, 25);
  const colours = { fg: c.palette[0]?.hex || "#232b75", accent: c.palette[1]?.hex || "#d7a347", bg: c.palette[c.palette.length - 1]?.hex || "#f4efe6" };
  const pattern = <BatikPattern motif="kawung" {...colours} scale={1.2} />;
  const product = <div className="deck-product company-profile-product"><ProductPreview kind="tote" motif="kawung" {...colours} scale={1.1} /></div>;
  const images = media.assets.filter((a) => a.kind === "image" && a.in_presentation && media.urls[a.id]);
  const logo = images.find((a) => a.slot === "company.logo" || a.category === "primary-logo");
  const logoMark = logo ? <img className="company-profile-cover-logo" src={media.urls[logo.id]} alt={logo.alt_text || logo.caption || logo.file_name} /> : <span className="company-profile-missing-logo">Company logo · [DETAIL NEEDED]</span>;
  const reference = buildReferenceSlides(s, false, media).filter((slide) => slide.part === "company");
  const detail = <div className="space-y-8">{reference.map((slide, i) => <section key={i}><h3 className="mb-3 font-medium">{slide.title}</h3>{slide.body}</section>)}</div>;
  const out: VisualSlide[] = [];
  const add = (title: string, body: ReactNode, tone = "cream") => out.push({ part: "company", title, body, tone, detail });

  add(c.name, <div className="company-profile-cover"><div className="company-profile-cover-copy">{logoMark}<span className="deck-kicker">Introducing {c.productName} · company profile</span><h1 className="deck-hero">{c.name}</h1><p className="company-profile-tagline">{c.tagline || "[DETAIL NEEDED]"}</p><p className="deck-subtitle">{c.productName} · a batik design studio built around personal expression.</p><p className="company-profile-disclosure">Fictional student startup concept.</p></div><div className="company-profile-cover-art">{product}<span className="company-profile-cover-caption">A pattern made personal</span></div></div>, "indigo");
  add("A small idea, rooted in local craft.", <div className="company-profile-overview"><div><span className="deck-kicker">Company overview</span><Words>{background === c.background ? compact(background, 24) : background}</Words><p className="company-profile-place">BASE · {location}</p></div><article><span className="deck-label">The fictional founding story</span><h3>A gift that felt personal.</h3><p>{foundingSummary}</p><span className="company-profile-disclosure">BatikLab is the current project concept and may be replaced by the group.</span></article></div>);
  add("A clear purpose. A personal future.", <div className="company-profile-purpose"><article><span className="deck-kicker">Mission</span><p>{c.mission || "[DETAIL NEEDED]"}</p></article><article><span className="deck-kicker">Vision</span><p>{c.vision || "[DETAIL NEEDED]"}</p></article><div className="company-profile-values">{c.values.slice(0, 4).map((value, i) => <span key={`${value}-${i}`}>{value.split(":")[0]}</span>)}</div></div>);
  add("Design the motif. Choose what carries it.", <div className="company-profile-offerings"><div className="company-profile-offerings-copy"><span className="deck-kicker">Products & services</span><Words>One design studio. Made to put a personal batik pattern on an everyday piece.</Words><div className="company-profile-product-list">{["Tote", "Tee", "Scarf"].map((item, i) => <span key={item}><small>0{i + 1}</small>{item}</span>)}</div><p>Choose a motif, colour and scale, then preview the design on a product.</p></div><div className="company-profile-offerings-art">{product}</div><p className="company-profile-concept-offer">Corporate/event orders and artisan motif packs are proposed concepts.</p></div>, "cream");
  add("Batik tools. Made personal.", <div className="company-profile-value-slide"><div className="company-profile-strengths">{[{ title: "Batik-specific design", text: "Start with traditional-inspired motifs, not a blank canvas." }, { title: "See the pattern in place", text: "Preview it on a tote, tee or scarf." }, { title: "Clear customisation", text: "Adjust colour and scale with guided controls." }, { title: "Local fulfilment · target", text: "Target local print and delivery in 5–7 days." }].map((item, i) => <article key={item.title}><span>0{i + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div><div className="company-profile-value-art"><div>{pattern}</div><strong>Designed<br />around batik.</strong></div><div className="company-profile-usp"><span>POSITIONING HYPOTHESIS · VALIDATE</span><p>A guided batik design studio with a live product preview and local print fulfilment.</p></div></div>, "indigo");
  add("For people who want batik to feel personal.", <div className="company-profile-market"><span className="deck-label">Target market hypothesis · validate</span><div className="company-profile-market-primary"><strong>18–30</strong><h3>Students & young professionals</h3><p>Klang Valley · Penang · Johor Bahru</p><span>For self-expression and gifting</span></div><div className="company-profile-market-secondary"><span className="deck-kicker">Secondary focus</span><h3>Corporate teams<br />& event planners</h3><p>Branded batik for group occasions</p></div><p className="company-profile-disclosure">Target segments and locations are project hypotheses; market size and demand are unverified.</p></div>);
  add("Five founders. One flat team.", <div className="company-profile-team"><span className="deck-label">AI-drafted fictional bios · course members in company roles</span><div>{c.founders.slice(0, 5).map((founder, i) => {
    const financeConflict = /human resources|\bhr\b|\bchro\b/i.test(founder.role) && /pricing|cost model|financial projection/i.test(founder.bio);
    const bio = financeConflict ? "[DETAIL NEEDED] (role and bio conflict in the project source)"
      : /chief executive|\bceo\b/i.test(founder.role) ? "Shapes company direction around customer needs."
      : /chief technology|\bcto\b/i.test(founder.role) ? "Shapes an accessible digital batik design experience."
      : /chief operations|\bcoo\b/i.test(founder.role) ? "Plans production, print partners and fulfilment."
      : /chief marketing|\bcmo\b/i.test(founder.role) ? "Leads brand stories, social content and campaigns."
      : compact(founder.bio, 10) || "[DETAIL NEEDED]";
    return <article key={founder.id}><span>{String(i + 1).padStart(2, "0")}</span><h3>{founder.name}</h3><strong>{founder.role || "[DETAIL NEEDED]"}</strong><p>{bio}</p></article>;
  })}</div><div className="company-profile-structure"><span>FLAT TEAM · WORKSTREAMS</span><div>{["Product & design", "Engineering", "Operations", "Marketing & community", "Finance · owner [DETAIL NEEDED]"].map((item) => <small key={item}>{item}</small>)}</div></div><p className="company-profile-disclosure">Print partner and artisan-pack plans remain assumptions.</p></div>);
  add("Your pattern. Your pride.", <div className="company-profile-closing"><div><span className="deck-kicker">{c.name} × {c.productName}</span><h2>Explore {c.productName}.</h2><p>Contact · <strong>[DETAIL NEEDED]</strong></p><span className="company-profile-disclosure">Fictional university startup concept</span></div><div className="company-profile-closing-art">{pattern}</div></div>, "indigo");
  return out;
}

