import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/start-server-core";
import { createHmac, timingSafeEqual } from "node:crypto";

// The passcode never ships to the browser: it is compared here, server-side,
// and Edit state lives in an HMAC-signed cookie the browser cannot forge.
const COOKIE = "tv-edit";
const VALUE = "edit1";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const secret = () => process.env["SESSION_SECRET"]!;
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
const cookieValue = `${VALUE}.${sign(VALUE)}`;

function readEditCookie(): boolean {
  try {
    const cookie = getRequest().headers.get("cookie") ?? "";
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
    if (!m) return false;
    const [payload, sig] = m[1].split(".");
    if (payload !== VALUE || !sig) return false;
    const expect = sign(payload);
    return sig.length === expect.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expect));
  } catch {
    return false;
  }
}

/** Throws unless the visitor has unlocked Edit mode. Call before every write. */
export async function requireEdit() {
  if (!readEditCookie()) throw new Error("Edit mode is locked. Enter the passcode first.");
}

export const getEditStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { edit: readEditCookie() };
});

export const unlockEdit = createServerFn({ method: "POST" })
  .inputValidator((data: { passcode: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["EDIT_PASSCODE"];
    if (!expected) throw new Error("Edit passcode is not configured.");
    // Hash both sides to equal-length digests: timingSafeEqual throws on a
    // length mismatch, and the raw length would leak through timing.
    const a = createHmac("sha256", "compare").update(String(data.passcode ?? ""), "utf8").digest();
    const b = createHmac("sha256", "compare").update(expected, "utf8").digest();
    if (!timingSafeEqual(a, b)) return { ok: false as const };
    setResponseHeader("Set-Cookie", `${COOKIE}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`);
    return { ok: true as const };
  });

export const lockEdit = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return { ok: true as const };
});
