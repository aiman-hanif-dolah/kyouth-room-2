import type { ProjectState, SectionId } from "./types";

/** The saved content that belongs to each hour (shared by client change detection and the server review). */
export function slices(s: ProjectState): Record<SectionId, unknown> {
  const c = s.company;
  return {
    s1: { ideas: c.ideas, concepts: c.concepts, selectedConceptId: c.selectedConceptId, rationale: c.rationale, name: c.name, productName: c.productName, tagline: c.tagline, mission: c.mission, vision: c.vision, values: c.values, palette: c.palette, logo: c.logo, moodboard: c.moodboard },
    s2: { background: c.background, foundingStory: c.foundingStory, founders: c.founders, orgStructure: c.orgStructure, services: c.services, usp: c.usp },
    s3: s.business,
    s4: s.product,
    s5: s.customers,
    s6: s.marketing,
    s7: { promptLibrary: s.prompts, promptsActuallyUsed: s.usedPrompts },
    s8: s.presentation.map((p) => ({ ...p, speakers: p.speakerIds.map((id) => s.members.find((m) => m.id === id)?.name ?? "?") })),
  };
}

