import { useSession } from "@tanstack/react-start/server";

// This module is server-only (*.server.ts is blocked from client bundles).
// The passcode never ships to the browser: it is compared in gate.functions
// handlers, and the unlocked flag lives in an encrypted session cookie.
const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "tv-edit",
  maxAge: 60 * 60 * 24 * 30,
  cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
});

type GateSession = { edit?: boolean };

async function useGateSession() {
  return useSession<GateSession>(sessionConfig());
}

/** Throws unless the visitor has unlocked Edit mode. Call before every write. */
export async function requireEdit() {
  const session = await useGateSession();
  if (!session.data.edit) throw new Error("Edit mode is locked. Enter the passcode first.");
}

export async function readEdit(): Promise<boolean> {
  const session = await useGateSession();
  return !!session.data.edit;
}

export async function markEdit(): Promise<void> {
  const session = await useGateSession();
  await session.update({ edit: true });
}

export async function clearEdit(): Promise<void> {
  const session = await useGateSession();
  await session.clear();
}
