import type { ProjectState, SectionId } from "./types";

export interface Check {
  id: string;
  section: SectionId;
  label: string;
  ok: boolean;
  detail: string;
}

const filled = (s: string | undefined) => !!s && s.trim().length > 0;

export function runChecks(s: ProjectState): Check[] {
  const c = s.company;
  const b = s.business;
  const count = (p: string) => s.marketing.samples.filter((x) => x.platform === p && filled(x.body)).length;
  const total = s.presentation.reduce((a, p) => a + p.minutes, 0);
  const order = s.presentation.map((p) => p.key).filter((k) => ["company", "business", "product", "marketing", "demographics", "prompts"].includes(k));
  const expected = ["company", "business", "product", "marketing", "demographics", "prompts"];
  const promptsMin = Math.max(...s.presentation.map((p) => p.minutes));
  const promptPart = s.presentation.find((p) => p.key === "prompts");
  const nameMentions = [b.solution, s.product.description, s.marketing.strategy].join(" ");
  const check = (id: string, section: SectionId, label: string, ok: boolean, detail: string): Check => ({ id, section, label, ok, detail });

  return [
    check("ideas", "s1", "10 brainstormed ideas", c.ideas.filter((i) => filled(i.name)).length >= 10, `${c.ideas.filter((i) => filled(i.name)).length} of 10 ideas`),
    check("proscons", "s1", "Pros and cons for shortlisted ideas", c.ideas.filter((i) => i.shortlisted).every((i) => filled(i.pros) && filled(i.cons)), "Every shortlisted idea needs pros and cons"),
    check("selected", "s1", "Selected concept and rationale", filled(c.selectedConceptId) && filled(c.rationale), "Pick a concept and explain why"),
    check("identity", "s1", "Name, tagline, mission, vision, values", [c.name, c.tagline, c.mission, c.vision].every(filled) && c.values.filter(filled).length >= 3, "All identity fields and at least 3 values"),
    check("visuals", "s1", "Logo and mood board visuals or prompts", filled(c.logo.url) || filled(c.logo.prompt), filled(c.logo.url) ? "Logo uploaded" : "Only a prompt so far, upload the generated logo when ready"),
    check("profile", "s2", "Company background, story, org, services, USP", [c.background, c.foundingStory, c.orgStructure, c.services, c.usp].every(filled), "All profile fields filled"),
    check("founders", "s2", "Founder bios labelled fictional", c.founders.length > 0 && c.founders.every((f) => /fictional/i.test(f.name + f.bio)), "Each invented founder must say (fictional)"),
    check("bplan", "s3", "Problem, solution, market, revenue, costs", [b.problem, b.solution, b.market, b.revenueModel, b.costStructure].every(filled), "All business plan text fields"),
    check("assumptions", "s3", "Market assumptions labelled", b.assumptions.filter(filled).length > 0 && /assumption/i.test(b.market + b.problem), "Assumption list plus labels in market text"),
    check("competitors", "s3", "Competitor matrix (3+ rows)", b.competitors.length >= 3, `${b.competitors.length} competitors`),
    check("swot", "s3", "SWOT has items in all quadrants", Object.values(b.swot).every((q) => q.filter(filled).length > 0), "Each quadrant needs at least 1 item"),
    check("projection", "s3", "1 to 3 year RM projection", b.projection.length >= 1 && b.projection.length <= 3 && b.projection.every((r) => r.units >= 0 && r.avgPrice > 0), `${b.projection.length} year(s)`),
    check("product", "s4", "Product description, features, differentiators", filled(s.product.description) && s.product.features.length >= 3 && s.product.differentiators.filter(filled).length > 0, "Description, 3+ features, differentiators"),
    check("mockups", "s4", "Product mockups or prompts", s.product.mockups.some((m) => filled(m.url) || filled(m.prompt)), "At least one mockup or prompt"),
    check("segments", "s5", "Segmentation covers all 7 dimensions", s.customers.segments.filter((x) => filled(x.value)).length >= 7, `${s.customers.segments.filter((x) => filled(x.value)).length} of 7`),
    check("personas", "s5", "2 to 3 personas labelled as composites", s.customers.personas.length >= 2 && s.customers.personas.length <= 3 && s.customers.personas.every((p) => /composite|fictional/i.test(p.name)), `${s.customers.personas.length} personas`),
    check("journey", "s5", "Journey map with 3+ stages", s.customers.journey.length >= 3, `${s.customers.journey.length} stages`),
    check("mkplan", "s6", "Strategy, pillars, schedule, influencer, paid", filled(s.marketing.strategy) && s.marketing.pillars.length > 0 && s.marketing.schedule.length > 0 && filled(s.marketing.influencer) && filled(s.marketing.paid), "All plan parts"),
    check("ig", "s6", "5 Instagram posts", count("instagram") >= 5, `${count("instagram")} of 5`),
    check("tt", "s6", "3 TikTok scripts", count("tiktok") >= 3, `${count("tiktok")} of 3`),
    check("fb", "s6", "3 Facebook ads", count("facebook") >= 3, `${count("facebook")} of 3`),
    check("li", "s6", "2 LinkedIn posts", count("linkedin") >= 2, `${count("linkedin")} of 2`),
    check("library", "s7", "Prompt library has 20 to 40 prompts", s.prompts.length >= 20 && s.prompts.length <= 40, `${s.prompts.length} prompts`),
    check("cats", "s7", "All 5 prompt categories used", new Set(s.prompts.map((p) => p.category)).size === 5, `${new Set(s.prompts.map((p) => p.category)).size} of 5 categories`),
    check("used", "s7", "Actual prompts used are recorded", s.usedPrompts.length > 0, s.usedPrompts.length ? `${s.usedPrompts.length} logged` : "No real prompt usage logged yet. Record prompts the group actually ran."),
    check("time", "s8", "Presentation totals exactly 40 minutes", total === 40, `${total} minutes planned`),
    check("order", "s8", "Presentation follows the required order", JSON.stringify(order) === JSON.stringify(expected), "Company, business, product, marketing, demographics, AI prompts"),
    check("highlight", "s8", "Prompt engineering is the longest part", !!promptPart && promptPart.minutes === promptsMin, "Give the AI prompt section the most time"),
    check("speakers", "s8", "Every part has a speaker", s.presentation.every((p) => p.speakerIds.length > 0), "Assign someone to each part"),
    check("consistent", "s4", "Product name used consistently", nameMentions.includes(c.productName), `Solution, product description and strategy should mention "${c.productName}"`),
  ];
}

export function sectionProgress(s: ProjectState, id: SectionId) {
  const checks = runChecks(s).filter((c) => c.section === id);
  const statusScore = { not_started: 0, in_progress: 0.4, ready_for_review: 0.8, complete: 1 }[s.tasks[id].status];
  const contentScore = checks.length ? checks.filter((c) => c.ok).length / checks.length : 1;
  return Math.round((statusScore * 0.5 + contentScore * 0.5) * 100);
}
