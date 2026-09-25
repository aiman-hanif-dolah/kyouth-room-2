import type { SectionId } from "./types";

export interface SectionMeta {
  id: SectionId;
  hour: number;
  title: string;
  objective: string;
  tasks: string[];
  deliverables: string[];
  path: "/company" | "/business" | "/product" | "/customers" | "/marketing" | "/prompts" | "/presentation";
  minutes: number;
}

export const SECTIONS: SectionMeta[] = [
  { id: "s1", hour: 1, title: "Company creation and identity", objective: "Create a fictional company using AI ideation tools.", tasks: ["Brainstorm 10 company ideas", "Narrow to 1 idea using pros and cons", "Name, tagline, mission, vision, values", "Logo, brand palette, mood board"], deliverables: ["Company identity pack", "Selected idea and rationale", "Logo and brand visuals or prompts"], path: "/company", minutes: 60 },
  { id: "s2", hour: 2, title: "Company profile", objective: "Build a professional company profile.", tasks: ["Company background and founding story", "Founder profiles", "Organisational structure", "Products and services overview", "Unique selling proposition"], deliverables: ["Company profile (6 to 10 card equivalent)", "Founder biographies"], path: "/company", minutes: 60 },
  { id: "s3", hour: 3, title: "Business plan", objective: "Build a structured business plan.", tasks: ["Problem and solution", "Market analysis with assumptions", "Competitor analysis", "SWOT", "Revenue model and cost structure", "1 to 3 year RM projection"], deliverables: ["Concise business plan", "SWOT and competitor matrix", "Financial projection table"], path: "/business", minutes: 60 },
  { id: "s4", hour: 4, title: "Product development and prototype", objective: "Define the product and build a prototype.", tasks: ["Refine product concept", "Features, benefits, differentiators", "Product mockups", "Interactive prototype"], deliverables: ["Product description", "Product mockups", "Prototype demo"], path: "/product", minutes: 60 },
  { id: "s5", hour: 5, title: "Target demographics and personas", objective: "Define the target market.", tasks: ["Demographic segmentation", "2 to 3 customer personas", "Customer journey map"], deliverables: ["Demographic report", "Personas", "Journey map"], path: "/customers", minutes: 60 },
  { id: "s6", hour: 6, title: "Social media marketing plan", objective: "Build a full marketing strategy.", tasks: ["Strategy, pillars, schedule", "Influencer and paid ads strategy", "5 Instagram, 3 TikTok, 3 Facebook, 2 LinkedIn", "Visual mockups"], deliverables: ["Social media plan", "Content samples", "Visual mockups or prompts"], path: "/marketing", minutes: 60 },
  { id: "s7", hour: 7, title: "Prompt engineering and outline", objective: "Document and improve the prompts used.", tasks: ["Document prompts used", "Improve and categorise prompts", "Build the prompt library", "40-minute outline"], deliverables: ["20 to 40 prompt library", "Actual prompt log", "Presentation outline"], path: "/prompts", minutes: 60 },
  { id: "s8", hour: 8, title: "Final presentation preparation", objective: "Build and rehearse the 40-minute presentation.", tasks: ["Compile presentation", "Speaker notes", "Rehearse with timer", "Finalise timing at 40 minutes"], deliverables: ["Full 40-minute presentation", "Speaker notes", "Visuals"], path: "/presentation", minutes: 60 },
];

export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
