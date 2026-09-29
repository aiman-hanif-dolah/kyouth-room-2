/**
 * Pure decision logic for shared workspace sync. Kept free of React and network
 * code so it can be tested deterministically.
 */
export interface SyncBook {
  /** This tab's id; its own realtime echoes are ignored. */
  clientId: string;
  /** updated_at (ms) of the newest cloud copy this tab has applied or written. */
  lastAppliedAt: number;
  /** Incremented on every local edit. */
  localRev: number;
  /** Highest local revision confirmed saved to the cloud. */
  savedRev: number;
}

export interface RemoteRow {
  updatedAt: number;
  clientId: string;
}

export type RemoteDecision = "ignore-own" | "ignore-stale" | "conflict" | "apply";

export const hasPendingLocal = (b: SyncBook) => b.localRev > b.savedRev;

export function decideRemote(b: SyncBook, row: RemoteRow): RemoteDecision {
  if (row.clientId && row.clientId === b.clientId) return "ignore-own";
  if (!(row.updatedAt > b.lastAppliedAt)) return "ignore-stale";
  // A teammate saved while this tab holds unsaved edits: keep the local edits
  // (they save next, so the latest save wins) and tell the user.
  if (hasPendingLocal(b)) return "conflict";
  return "apply";
}

export const toMs = (v: unknown) => {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : 0;
};
