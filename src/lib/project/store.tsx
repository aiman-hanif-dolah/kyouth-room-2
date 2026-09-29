import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSeed, DRAFT_SPEAKER_NOTES, SEED_VERSION } from "./seed";
import type { ProjectState, SectionId } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useEditMode } from "./editmode";
import { saveWorkspace } from "./write.functions";
import { decideRemote, hasPendingLocal, toMs, type SyncBook } from "./sync-core";

const KEY = "tech-ventura-project-v1";
const MIGRATED_KEY = "tech-ventura-cloud-migrated-v1";
const PING_KEY = "tech-ventura-workspace-saved";
const ROW_ID = "main";

export type SyncStatus = "local" | "loading" | "refreshing" | "synced" | "saving" | "error";

interface Ctx {
  state: ProjectState;
  hydrated: boolean;
  sync: SyncStatus;
  syncError: string;
  syncNotice: string;
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

interface CloudRow { state: unknown; updated_at?: string | null; client_id?: string | null }

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { canEdit, expire } = useEditMode();
  const [state, setState] = useState<ProjectState>(() => createSeed());
  const [hydrated, setHydrated] = useState(false);
  const [sync, setSync] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const [saveTick, setSaveTick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const clientId = useRef(Math.random().toString(36).slice(2) + Date.now().toString(36));
  const book = useRef<SyncBook>({ clientId: clientId.current, lastAppliedAt: 0, localRev: 0, savedRev: 0 });
  const saving = useRef(false);
  const cloudReady = useRef(false);
  const refetchRef = useRef<(reason: string) => void>(() => {});

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

  /** Apply a cloud row if it is newer and would not clobber unsaved local edits. */
  const applyRow = useCallback((row: CloudRow | null | undefined) => {
    if (!row) return;
    const updatedAt = toMs(row.updated_at);
    const decision = decideRemote(book.current, { updatedAt, clientId: String(row.client_id ?? "") });
    if (decision === "ignore-own" || decision === "ignore-stale") return;
    book.current.lastAppliedAt = updatedAt;
    if (decision === "conflict") {
      setSyncNotice("A teammate saved while you were editing. Your newer edits are kept and will be saved over theirs.");
      setTimeout(() => setSyncNotice(""), 15000);
      return;
    }
    const s = normalize(row.state);
    if (s) setState(s);
  }, []);

  // Shared workspace: everyone loads and live-subscribes, and re-reads on tab
  // return, focus, BFCache restore, same-browser tab pings and realtime reconnects.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    let fetching = false;
    let again = false;
    let lastFetch = 0;
    setSync("loading");

    const fetchRow = () => supabase.from("workspace_state").select("state, updated_at, client_id").eq("id", ROW_ID).maybeSingle();

    const refetch = async (reason: string) => {
      if (cancelled || !cloudReady.current) return;
      if (fetching) { again = true; return; }
      const now = Date.now();
      if (reason !== "realtime-reconnect" && reason !== "tab-ping" && now - lastFetch < 1500) return;
      fetching = true;
      lastFetch = now;
      setSync((s) => (s === "saving" ? s : "refreshing"));
      const { data, error } = await fetchRow();
      fetching = false;
      if (cancelled) return;
      if (error) { setSync("error"); setSyncError(error.message); return; }
      applyRow(data as CloudRow | null);
      setSync((s) => (s === "saving" ? s : "synced"));
      setSyncError("");
      if (again) { again = false; void refetch("tab-ping"); }
    };
    refetchRef.current = (r) => void refetch(r);

    (async () => {
      const { data, error } = await fetchRow();
      if (cancelled) return;
      if (error) { setSync("error"); setSyncError(error.message); return; }
      if (data) {
        applyRow(data as CloudRow);
      } else if (canEditRef.current) {
        // One-time migration: the shared copy is empty, so seed it from this browser's copy.
        const local = stateRef.current;
        try {
          const res = await saveWorkspace({ data: { state: local, clientId: clientId.current } });
          book.current.lastAppliedAt = toMs(res.updatedAt);
          try { localStorage.setItem(MIGRATED_KEY, new Date().toISOString()); } catch { /* ignore */ }
        } catch {
          // Someone else created it first, or edit locked: never overwrite, load theirs.
          const second = await fetchRow();
          applyRow(second.data as CloudRow | null);
        }
      }
      if (cancelled) return;
      cloudReady.current = true;
      setSync("synced");
      setSyncError("");
    })();

    let subscribedOnce = false;
    const channel = supabase
      .channel("workspace-state-main")
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_state", filter: `id=eq.${ROW_ID}` }, (payload) => {
        const row = payload.new as CloudRow & { id?: string };
        if (row?.id !== ROW_ID) return;
        applyRow(row);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Any (re)subscribe after the first may have missed events: read fresh.
          if (subscribedOnce) void refetch("realtime-reconnect");
          subscribedOnce = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // The client rejoins automatically; the next SUBSCRIBED triggers a refetch.
          lastFetch = 0;
        }
      });

    const onVisible = () => { if (document.visibilityState === "visible") void refetch("visible"); };
    const onFocus = () => void refetch("focus");
    const onPageShow = () => void refetch("pageshow");
    const onStorage = (e: StorageEvent) => { if (e.key === PING_KEY) void refetch("tab-ping"); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("storage", onStorage);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(PING_KEY);
      bc.onmessage = () => void refetch("tab-ping");
    } catch { /* BroadcastChannel unavailable: storage event fallback */ }

    return () => {
      cancelled = true;
      cloudReady.current = false;
      refetchRef.current = () => {};
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("storage", onStorage);
      bc?.close();
    };
  }, [hydrated, applyRow]);

  // Debounced save of local edits to the shared copy (Edit mode only).
  useEffect(() => {
    if (!canEdit || !cloudReady.current || saving.current) return;
    if (!hasPendingLocal(book.current)) return;
    setSync("saving");
    const t = setTimeout(async () => {
      const rev = book.current.localRev;
      saving.current = true;
      try {
        const res = await saveWorkspace({ data: { state: stateRef.current, clientId: clientId.current } });
        book.current.savedRev = Math.max(book.current.savedRev, rev);
        book.current.lastAppliedAt = Math.max(book.current.lastAppliedAt, toMs(res.updatedAt));
        setSyncError("");
        try {
          const bc = new BroadcastChannel(PING_KEY);
          bc.postMessage({ at: res.updatedAt });
          bc.close();
        } catch { /* ignore */ }
        try { localStorage.setItem(PING_KEY, `${clientId.current}:${res.updatedAt}`); } catch { /* ignore */ }
        if (hasPendingLocal(book.current)) setSaveTick((n) => n + 1);
        else setSync("synced");
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
      } finally {
        saving.current = false;
      }
    }, 700);
    return () => clearTimeout(t);
  }, [state, canEdit, expire, saveTick]);

  const update = useCallback((fn: (d: ProjectState) => void, section?: SectionId) => {
    if (!canEditRef.current) return; // Published mode is read-only.
    book.current.localRev += 1;
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
    book.current.localRev += 1;
    setState(createSeed());
  }, []);

  const value = useMemo(() => ({ state, hydrated, sync, syncError, syncNotice, canEdit, update, reset }), [state, hydrated, sync, syncError, syncNotice, canEdit, update, reset]);
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
