import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createSeed, DRAFT_SPEAKER_NOTES, SEED_VERSION } from "./seed";
import type { ProjectState, SectionId } from "./types";

const KEY = "tech-ventura-project-v1";

interface Ctx {
  state: ProjectState;
  hydrated: boolean;
  update: (fn: (draft: ProjectState) => void, section?: SectionId) => void;
  reset: () => void;
}

// Keep a single context instance across hot reloads so provider and consumers always match.
const g = globalThis as unknown as { __tvProjectCtx?: React.Context<Ctx | null> };
const ProjectContext = g.__tvProjectCtx ?? (g.__tvProjectCtx = createContext<Ctx | null>(null));

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProjectState>(() => createSeed());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProjectState;
        if (parsed.version === SEED_VERSION) {
          // Migration: upgrade untouched default placeholders to real member names.
          const names: Record<string, string> = { "Member 1": "Aiman Hanif", "Member 2": "Afif", "Member 3": "Naim", "Member 4": "Shamimi", "Member 5": "Tharsiny" };
          const members = (parsed as any).members;
          if (Array.isArray(members)) {
            (parsed as any).members = members.map((m: any) => (m && typeof m.name === "string" && names[m.name.trim()] ? { ...m, name: names[m.name.trim()] } : m));
          }
          // Migration: fill only empty speaker notes with labelled drafts; never overwrite user notes.
          if (Array.isArray((parsed as any).presentation)) {
            (parsed as any).presentation = (parsed as any).presentation.map((p: any) => (p && !String(p.speakerNotes ?? "").trim() && DRAFT_SPEAKER_NOTES[p.key] ? { ...p, speakerNotes: DRAFT_SPEAKER_NOTES[p.key] } : p));
          }
          setState({ ...createSeed(), ...parsed });
        }
      }
    } catch {
      /* corrupted storage: keep seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full (large images) */
    }
  }, [state, hydrated]);

  const update = useCallback((fn: (d: ProjectState) => void, section?: SectionId) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      draft.updatedAt = new Date().toISOString();
      if (section) draft.touched[section] = true;
      return draft;
    });
  }, []);

  const reset = useCallback(() => {
    const s = createSeed();
    setState(s);
  }, []);

  const value = useMemo(() => ({ state, hydrated, update, reset }), [state, hydrated, update, reset]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function memberName(state: ProjectState, id: string) {
  return state.members.find((m) => m.id === id)?.name ?? "Unassigned";
}

export function yearCalc(r: { units: number; avgPrice: number; cogsPerUnit: number; fixedCosts: number; marketing: number }) {
  const revenue = r.units * r.avgPrice;
  const cogs = r.units * r.cogsPerUnit;
  const gross = revenue - cogs;
  const net = gross - r.fixedCosts - r.marketing;
  return { revenue, cogs, gross, net, margin: revenue ? (gross / revenue) * 100 : 0 };
}

export const rm = (n: number) =>
  (n < 0 ? "-RM" : "RM") + Math.abs(n).toLocaleString("en-MY", { maximumFractionDigits: 0 });
