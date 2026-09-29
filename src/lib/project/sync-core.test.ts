import { describe, expect, it } from "vitest";
import { decideRemote, type SyncBook } from "./sync-core";

const book = (p: Partial<SyncBook> = {}): SyncBook => ({ clientId: "tabA", lastAppliedAt: 1000, localRev: 0, savedRev: 0, ...p });

describe("shared workspace sync decisions", () => {
  it("applies a newer save from another tab (distinct clientIds)", () => {
    expect(decideRemote(book(), { clientId: "tabB", updatedAt: 2000 })).toBe("apply");
  });
  it("background tab refetch applies a newer cloud copy", () => {
    expect(decideRemote(book({ lastAppliedAt: 500 }), { clientId: "tabB", updatedAt: 900 })).toBe("apply");
  });
  it("ignores this tab's own realtime event", () => {
    expect(decideRemote(book(), { clientId: "tabA", updatedAt: 5000 })).toBe("ignore-own");
  });
  it("ignores stale or identical reads (no ping-pong)", () => {
    expect(decideRemote(book(), { clientId: "tabB", updatedAt: 1000 })).toBe("ignore-stale");
    expect(decideRemote(book(), { clientId: "tabB", updatedAt: 10 })).toBe("ignore-stale");
  });
  it("never clobbers unsaved local edits: reports a conflict instead", () => {
    expect(decideRemote(book({ localRev: 3, savedRev: 2 }), { clientId: "tabB", updatedAt: 2000 })).toBe("conflict");
  });
  it("stale remote read with unsaved edits is ignored, not applied", () => {
    expect(decideRemote(book({ localRev: 3, savedRev: 2 }), { clientId: "tabB", updatedAt: 900 })).toBe("ignore-stale");
  });
});
