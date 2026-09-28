import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

// The passcode never ships to the browser: it is compared here, server-side,
// and the unlocked flag lives in an encrypted session cookie.
const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "tv-edit",
  maxAge: 60 * 60 * 24 * 7,
  cookie: { httpOnly: true, secure: false, sameSite: "lax" as const, path: "/" },
});

type GateSession = { edit?: boolean };

/** Throws unless the visitor has unlocked Edit mode. Call before every write. */
export async function requireEdit() {
  const session = await useSession<GateSession>(sessionConfig());
  if (!session.data.edit) throw new Error("Edit mode is locked. Enter the passcode first.");
}

export const getEditStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  return { edit: !!session.data.edit };
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
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ edit: true });
    return { ok: true as const };
  });

export const lockEdit = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});
