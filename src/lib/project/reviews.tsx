import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "./store";
import { useAssets } from "./assets";
import { slices } from "./review-slices";
import { runAiReview } from "./ai.functions";
import type { SectionId, Status } from "./types";

export interface AiReview {
  section: SectionId;
  status: Status;
  result: { summary?: string; aligned?: string[]; missing?: string[]; issues?: string[]; suggestions?: string[] };
  review_state: "fresh" | "updating" | "error" | "paused";
  error: string;
  reviewed_at: string | null;
}

interface Ctx {
  reviews: Partial<Record<SectionId, AiReview>>;
  /** Hours whose content changed since the last finished review. */
  stale: Set<SectionId>;
}

const g = globalThis as unknown as { __tvReviewCtx?: React.Context<Ctx | null> };
const ReviewCtx = g.__tvReviewCtx ?? (g.__tvReviewCtx = createContext<Ctx | null>(null));

const IDS: SectionId[] = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
// Wait this long after the last saved change so quick edits share one review.
const DEBOUNCE_MS = 20_000;

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const { state, sync, canEdit, update } = useProject();
  const { assets, ready } = useAssets();
  const [reviews, setReviews] = useState<Ctx["reviews"]>({});
  const [stale, setStale] = useState<Set<SectionId>>(new Set());
  const lastSig = useRef<Record<string, string> | null>(null);
  const pending = useRef<Set<SectionId>>(new Set());
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Everyone sees the shared review results live.
  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("ai_reviews").select("*");
      setReviews(Object.fromEntries(((data ?? []) as AiReview[]).map((r) => [r.section, r])));
    };
    load();
    const ch = supabase.channel("ai-reviews").on("postgres_changes", { event: "*", schema: "public", table: "ai_reviews" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Keep each hour's status in step with its latest finished review (Edit mode saves it).
  useEffect(() => {
    if (!canEdit || sync !== "synced") return;
    const diff = IDS.filter((id) => reviews[id]?.review_state === "fresh" && reviews[id]!.status !== state.tasks[id].status);
    if (diff.length) update((d) => { for (const id of diff) d.tasks[id].status = reviews[id]!.status; });
  }, [reviews, canEdit, sync, state.tasks, update]);

  const run = async () => {
    if (running.current) return;
    running.current = true;
    const changed = Array.from(pending.current);
    pending.current = new Set();
    try {
      await runAiReview({ data: { changed } });
    } catch { /* result or error is stored on the server; edits are never affected */ }
    running.current = false;
    setStale(new Set(pending.current));
    if (pending.current.size) schedule();
  };
  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, DEBOUNCE_MS);
  };

  // Detect meaningful saved changes per hour (task status, assignment and notes are ignored).
  useEffect(() => {
    if (!canEdit || sync !== "synced" || !ready) return;
    const sl = slices(state);
    const sig: Record<string, string> = {};
    for (const id of IDS) {
      const files = assets.filter((a) => a.section_id === id).map((a) => [a.id, a.file_name, a.caption, a.alt_text, a.tags, a.in_presentation, a.category, a.sort_order]);
      sig[id] = JSON.stringify([sl[id], files]);
    }
    if (!lastSig.current) {
      // First look this session: the server skips it for free if nothing changed.
      lastSig.current = sig;
      schedule();
      return;
    }
    const changed = IDS.filter((id) => sig[id] !== lastSig.current![id]);
    lastSig.current = sig;
    if (!changed.length) return;
    changed.forEach((id) => pending.current.add(id));
    setStale((s) => new Set([...s, ...changed]));
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, assets, canEdit, sync, ready]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <ReviewCtx.Provider value={{ reviews, stale }}>{children}</ReviewCtx.Provider>;
}

export function useReviews() {
  const c = useContext(ReviewCtx);
  if (!c) throw new Error("useReviews must be used within ReviewsProvider");
  return c;
}
