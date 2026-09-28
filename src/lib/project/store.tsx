import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSeed, DRAFT_SPEAKER_NOTES, SEED_VERSION } from "./seed";
import type { ProjectState, SectionId } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useEditMode } from "./editmode";
import { saveWorkspace } from "./write.functions";

const KEY = "tech-ventura-project-v1";
const MIGRATED_KEY = "tech-ventura-cloud-migrated-v1";
const ROW_ID = "main";

export type SyncStatus = "local" | "loading" | "synced" | "saving" | "error";

interface Ctx {
  state: ProjectState;
  hydrated: boolean;
  sync: SyncStatus;
  syncError: string;
  canEdit: boolean;
  update: (fn: (draft: ProjectState) => void, section?: SectionId) => void;
  reset: () => void;
}

// Keep a single context instance across hot reloads so provider and consumers always match.
const g = globalThis as unknown as { __tvProjectCtx?: React.Context<Ctx | null> };
const ProjectContext = g.__tvProjectCtx ?? (g.__tvProjectCtx = createContext<Ctx | null>(null));

/** Apply safe, non-destructive migrations to any saved copy (local or shared). */
function normalize(raw: unknown): ProjectState | null {
  const parsed = raw as any;
  if (!parsed || typeof parsed !== "object" || parsed.version !== SEED_VERSION) return null;
  const names: Record<string, string> = { "Member 1": "Aiman Hanif", "Member 2": "Afif", "Member 3": "Naim", "Member 4": "Shamimi", "Member 5": "Tharsiny" };
  if (Array.isArray(parsed.members)) {
    parsed.members = parsed.members.map((m: any) => (m && typeof m.name === "string" && names[m.name.trim()] ? { ...m, name: names[m.name.trim()] } : m));
  }
  if (Array.isArray(parsed.presentation)) {
    parsed.presentation = parsed.presentation.map((p: any) => (p && !String(p.speakerNotes ?? "").trim() && DRAFT_SPEAKER_NOTES[p.key] ? { ...p, speakerNotes: DRAFT_SPEAKER_NOTES[p.key] } : p));
  }
  return { ...createSeed(), ...parsed } as ProjectState;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { canEdit, expire } = useEditMode();
  const [state, setState] = useState<ProjectState>(() => createSeed());
  const [hydrated, setHydrated] = useState(false);
  const [sync, setSync] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState("");
  const stateRef = useRef(state);
  stateRef.current = state;
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const clientId = useRef(Math.random().toString(36).slice(2) + Date.now().toString(36));
  const lastSynced = useRef<string>("");
  const cloudReady = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const s = raw ? normalize(JSON.parse(raw)) : null;
      if (s) setState(s);
    } catch {
      /* corrupted storage: keep seed */
    }
    setHydrated(true);
  }, []);

  // Local cache (text only; files live in cloud storage).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full */
    }
  }, [state, hydrated]);

  // Shared workspace: everyone loads and live-subscribes. The first visitor in Edit
  // mode seeds an empty shared copy from this browser's local copy (never overwrites).
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setSync("loading");
    const apply = (raw: unknown) => {
      const s = normalize(raw);
      if (!s) return;
      lastSynced.current = JSON.stringify(s);
      setState(s);
    };
    (async () => {
      const { data, error } = await supabase.from("workspace_state").select("state").eq("id", ROW_ID).maybeSingle();
      if (cancelled) return;
      if (error) { setSync("error"); setSyncError(error.message); return; }
      if (data) {
        apply(data.state);
      } else if (canEditRef.current) {
        // One-time migration: the shared copy is empty, so seed it from this browser's copy.
        const local = stateRef.current;
        try {
          await saveWorkspace({ data: { state: local, clientId: clientId.current } });
          lastSynced.current = JSON.stringify(local);
          try { localStorage.setItem(MIGRATED_KEY, new Date().toISOString()); } catch { /* ignore */ }
        } catch {
          // Someone else created it first, or edit locked: never overwrite, load theirs.
          const again = await supabase.from("workspace_state").select("state").eq("id", ROW_ID).maybeSingle();
          if (again.data) apply(again.data.state);
        }
      }
      if (cancelled) return;
      cloudReady.current = true;
      setSync("synced");
      setSyncError("");
    })();
    const channel = supabase
      .channel("workspace-state")
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_state" }, (payload) => {
        const row = payload.new as { id?: string; state?: unknown; client_id?: string };
        if (row?.id !== ROW_ID || row.client_id === clientId.current) return;
        apply(row.state);
      })
      .subscribe();
    return () => {
      cancelled = true;
      cloudReady.current = false;
      supabase.removeChannel(channel);
    };
  }, [hydrated]);

  // Debounced save of local edits to the shared copy (Edit mode only).
  useEffect(() => {
    if (!canEdit || !cloudReady.current) return;
    const json = JSON.stringify(state);
    if (json === lastSynced.current) return;
    setSync("saving");
    const t = setTimeout(async () => {
      try {
        await saveWorkspace({ data: { state, clientId: clientId.current } });
        lastSynced.current = json;
        setSync("synced");
        setSyncError("");
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (msg.includes("Edit mode is locked")) {
          expire();
          setSync("error");
          setSyncError("Edit mode expired. Enter the passcode again to keep saving.");
          return;
        }
        setSync("error");
        setSyncError(msg);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [state, canEdit, expire]);

  const update = useCallback((fn: (d: ProjectState) => void, section?: SectionId) => {
    if (!canEditRef.current) return; // Published mode is read-only.
    setState((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      draft.updatedAt = new Date().toISOString();
      if (section) draft.touched[section] = true;
      return draft;
    });
  }, []);

  const reset = useCallback(() => {
    if (!canEditRef.current) return;
    setState(createSeed());
  }, []);

  const value = useMemo(() => ({ state, hydrated, sync, syncError, canEdit, update, reset }), [state, hydrated, sync, syncError, canEdit, update, reset]);
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
