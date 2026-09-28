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
    // Accept either the text passcode or the emoji passcode.
    const expected = [process.env["EDIT_PASSCODE"], process.env["EMOJI_PASSCODE"]].filter(
      (v): v is string => Boolean(v),
    );
    if (expected.length === 0) throw new Error("Edit passcode is not configured.");
    // Hash both sides to equal-length digests: timingSafeEqual throws on a
    // length mismatch, and the raw length would leak through timing.
    const a = createHash("sha256").update(String(data.passcode ?? ""), "utf8").digest();
    const match = expected.some((e) =>
      timingSafeEqual(a, createHash("sha256").update(e, "utf8").digest()),
    );
    if (!match) return { ok: false as const };
    const { markEdit } = await import("./gate.server");
    await markEdit();
    return { ok: true as const };
  });

export const lockEdit = createServerFn({ method: "POST" }).handler(async () => {
  const { clearEdit } = await import("./gate.server");
  await clearEdit();
  return { ok: true as const };
});
