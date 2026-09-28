import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

// Handlers dynamically import ./gate.server (server-only) inside their bodies;
// a module-scope import would leak server code into the client bundle.

export const getEditStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { readEdit } = await import("./gate.server");
  return { edit: await readEdit() };
});

export const unlockEdit = createServerFn({ method: "POST" })
  .inputValidator((data: { passcode: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["EDIT_PASSCODE"];
    if (!expected) throw new Error("Edit passcode is not configured.");
    // Hash both sides to equal-length digests: timingSafeEqual throws on a
    // length mismatch, and the raw length would leak through timing.
    const a = createHash("sha256").update(String(data.passcode ?? ""), "utf8").digest();
    const b = createHash("sha256").update(expected, "utf8").digest();
    if (!timingSafeEqual(a, b)) return { ok: false as const };
    const { markEdit } = await import("./gate.server");
    await markEdit();
    return { ok: true as const };
  });

export const lockEdit = createServerFn({ method: "POST" }).handler(async () => {
  const { clearEdit } = await import("./gate.server");
  await clearEdit();
  return { ok: true as const };
});
