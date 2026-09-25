export type SectionId = "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "s7" | "s8";
export type Status = "not_started" | "in_progress" | "ready_for_review" | "complete";

export const STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  ready_for_review: "Ready for review",
  complete: "Complete",
};

export interface Member {
  id: string;
  name: string;
}

export interface SectionTask {
  status: Status;
  assignees: string[];
  reviewerNotes: string;
  promptLog: string;
  verified: boolean;
}

export interface Idea {
  id: string;
  name: string;
  summary: string;
  pros: string;
  cons: string;
  shortlisted: boolean;
}

export interface Concept {
  id: string;
  name: string;
  pitch: string;
  customers: string;
  monetisation: string;
  appeal: number;
  feasibility: number;
  prototype: number;
}

export interface Founder {
  id: string;
  name: string;
  role: string;
  bio: string;
}

export interface Swatch {
  id: string;
  name: string;
  hex: string;
}

export interface ImageItem {
  id: string;
  url: string;
  caption: string;
  prompt: string;
}

export interface Competitor {
  id: string;
  name: string;
  offer: string;
  price: string;
  customisation: string;
  localIdentity: string;
  weakness: string;
}

export interface YearRow {
  id: string;
  label: string;
  units: number;
  avgPrice: number;
  cogsPerUnit: number;
  fixedCosts: number;
  marketing: number;
}

export interface Feature {
  id: string;
  title: string;
  benefit: string;
}

export interface Persona {
  id: string;
  name: string;
  age: string;
  location: string;
  occupation: string;
  income: string;
  goals: string;
  frustrations: string;
  behaviours: string;
  quote: string;
}

export interface JourneyStage {
  id: string;
  stage: string;
  actions: string;
  questions: string;
  pains: string;
  touchpoints: string;
  opportunities: string;
}

export type Platform = "instagram" | "tiktok" | "facebook" | "linkedin";

export interface ContentSample {
  id: string;
  platform: Platform;
  title: string;
  body: string;
  cta: string;
  imagePrompt: string;
  imageUrl: string;
}

export interface Pillar {
  id: string;
  title: string;
  description: string;
}

export interface ScheduleRow {
  id: string;
  day: string;
  platform: string;
  content: string;
}

export type PromptCategory = "Ideation" | "Analysis" | "Marketing" | "Image generation" | "Technical/prototype";
export const PROMPT_CATEGORIES: PromptCategory[] = [
  "Ideation",
  "Analysis",
  "Marketing",
  "Image generation",
  "Technical/prototype",
];

export interface PromptEntry {
  id: string;
  title: string;
  category: PromptCategory;
  purpose: string;
  text: string;
  section: SectionId;
  variables: string;
  notes: string;
}

export interface UsedPrompt {
  id: string;
  memberId: string;
  tool: string;
  section: SectionId;
  prompt: string;
  outputSummary: string;
  howChecked: string;
  date: string;
}

export type PartKey =
  | "opening"
  | "company"
  | "business"
  | "product"
  | "marketing"
  | "demographics"
  | "prompts"
  | "conclusion"
  | "qa";

export interface PresentationPart {
  key: PartKey;
  title: string;
  minutes: number;
  speakerIds: string[];
  keyPoints: string;
  transition: string;
  speakerNotes: string;
}

export interface ProjectState {
  version: number;
  updatedAt: string;
  members: Member[];
  tasks: Record<SectionId, SectionTask>;
  touched: Partial<Record<SectionId, boolean>>;
  company: {
    ideas: Idea[];
    concepts: Concept[];
    selectedConceptId: string;
    rationale: string;
    name: string;
    productName: string;
    tagline: string;
    mission: string;
    vision: string;
    values: string[];
    palette: Swatch[];
    logo: ImageItem;
    moodboard: ImageItem[];
    background: string;
    foundingStory: string;
    founders: Founder[];
    orgStructure: string;
    services: string;
    usp: string;
  };
  business: {
    problem: string;
    solution: string;
    market: string;
    assumptions: string[];
    competitors: Competitor[];
    swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
    revenueModel: string;
    costStructure: string;
    projection: YearRow[];
  };
  product: {
    concept: string;
    description: string;
    features: Feature[];
    benefits: string[];
    differentiators: string[];
    mockups: ImageItem[];
  };
  customers: {
    segments: { label: string; value: string }[];
    personas: Persona[];
    journey: JourneyStage[];
  };
  marketing: {
    strategy: string;
    pillars: Pillar[];
    schedule: ScheduleRow[];
    influencer: string;
    paid: string;
    samples: ContentSample[];
  };
  prompts: PromptEntry[];
  usedPrompts: UsedPrompt[];
  presentation: PresentationPart[];
}
