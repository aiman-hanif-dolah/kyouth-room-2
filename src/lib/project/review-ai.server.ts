// Server-only: automatic AI review of all eight hours through the Lovable AI Gateway.
// One request reviews every hour (with focus on the changed ones) so connections are
// re-checked together. Identical content is skipped by hash, so it costs no credits.
import type { ProjectState, SectionId, Status } from "./types";
import type { Asset } from "./assets";
import { SECTIONS } from "./sections";
import { createSeed } from "./seed";
import { runChecks } from "./review";
import { slices } from "./review-slices";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const IDS: SectionId[] = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
const STATUSES: Status[] = ["not_started", "in_progress", "ready_for_review", "complete"];

export interface HourReview {
  summary: string;
  aligned: string[];
  missing: string[];
  issues: string[];
  suggestions: string[];
}

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SYSTEM = `You are the automatic reviewer for a university group's eight-hour "AI startup project" workspace. Assess every hour against the assignment brief and the latest saved content.
For each hour judge: (1) deliverable completeness, (2) storyline consistency with the other hours (same company, same product name, same customers, same prices and numbers, same claims).
Rules:
- Base every finding only on the saved text and uploaded asset metadata provided. Quote or name the actual field or file.
- Content flagged starterUnchanged is untouched starter content: it never proves completion.
- A copyable image prompt, a link placeholder, or text marked DRAFT is not a finished deliverable.
- Flag contradictions, unsupported claims, mismatched names, and content that no longer fits the business.
- Suggest concrete fixes for teammates; never rewrite their content.
- status: "complete" only when all required deliverables are present and the checks pass; "ready_for_review" when nearly done with minor gaps; "in_progress" when real work exists but key parts are missing or inconsistent; "not_started" when there is no real team work.
Reply with JSON only, no markdown fence:
{"hours":[{"section":"s1","status":"...","summary":"one or two sentences","aligned":["..."],"missing":["..."],"issues":["..."],"suggestions":["..."]}]}
Include all eight sections s1..s8. Keep each list to at most 5 short items. No emoji.`;

type Row = { section: string; status: string; result: unknown; content_hash: string; review_state: string; error: string; reviewed_at: string | null; updated_at: string };

export async function runReview(changed: SectionId[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };
  const [{ data: ws }, { data: assetRows }, { data: rows }] = await Promise.all([
    db.from("workspace_state").select("state").eq("id", "main").maybeSingle(),
    db.from("project_assets").select("*").order("sort_order"),
    db.from("ai_reviews").select("*"),
  ]);
  if (!ws?.state) return { skipped: "no-content" as const };
  const state = { ...createSeed(), ...(ws.state as ProjectState) };
  const assets = (assetRows ?? []) as Asset[];
  const existing = new Map(((rows ?? []) as Row[]).map((r) => [r.section, r]));

  const seed = slices(createSeed());
  const cur = slices(state);
  const checks = runChecks(state, assets);
  const hours = SECTIONS.map((m) => ({
    section: m.id,
    hour: m.hour,
    title: m.title,
    objective: m.objective,
    requiredTasks: m.tasks,
    requiredDeliverables: m.deliverables,
    starterUnchanged: JSON.stringify(cur[m.id]) === JSON.stringify(seed[m.id]),
    automaticChecks: checks.filter((c) => c.section === m.id).map((c) => ({ label: c.label, ok: c.ok, partial: !!c.partial, detail: c.detail })),
    uploadedFiles: assets.filter((a) => a.section_id === m.id).map((a) => ({ file: a.file_name, kind: a.kind, slot: a.slot, caption: a.caption, altText: a.alt_text, tags: a.tags, inPresentation: a.in_presentation, mainLogo: a.category === "primary-logo" })),
    content: cur[m.id],
  }));
  const digest = JSON.stringify({ members: state.members.map((m) => m.name), hours });
  const hash = await sha(digest);

  const all = IDS.map((id) => existing.get(id));
  if (all.every((r) => r && r.content_hash === hash && r.review_state !== "updating")) return { skipped: "unchanged" as const };
  const busy = all.find((r) => r?.review_state === "updating" && Date.now() - new Date(r.updated_at).getTime() < 3 * 60 * 1000);
  if (busy) return { skipped: "busy" as const };

  const now = () => new Date().toISOString();
  await db.from("ai_reviews").upsert(IDS.map((id) => {
    const r = existing.get(id);
    return { section: id, status: r?.status ?? "not_started", result: r?.result ?? {}, content_hash: r?.content_hash ?? "", review_state: "updating", error: "", reviewed_at: r?.reviewed_at ?? null, updated_at: now() };
  }));

  const fail = async (msg: string, paused: boolean) => {
    await db.from("ai_reviews").upsert(IDS.map((id) => {
      const r = existing.get(id);
      // Keep the hash on a pause so the same content is not retried automatically.
      return { section: id, status: r?.status ?? "not_started", result: r?.result ?? {}, content_hash: paused ? hash : r?.content_hash ?? "", review_state: paused ? "paused" : "error", error: msg, reviewed_at: r?.reviewed_at ?? null, updated_at: now() };
    }));
    return { error: msg };
  };

  let text = "";
  try {
    const res = await fetch(`${GATEWAY}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Hours changed since the last review (focus here, then re-check their connections to every other hour): ${changed.length ? changed.join(", ") : "all"}.\n\nWorkspace:\n${digest}` },
        ],
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      if (res.status === 402) return fail("AI credits are used up, so automatic reviews are paused. Top up in Settings, Plans and credits; the next saved change will try again.", true);
      if (res.status === 403) return fail(`The AI review was denied (403), so automatic reviews are paused. ${body}`, true);
      if (res.status === 429) return fail("The AI is busy (rate limit). The review will try again after the next saved change.", false);
      return fail(`The AI review failed (${res.status}). Your edits are safe; it will try again after the next saved change.`, false);
    }
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let err = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, i);
        buf = buf.slice(i + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const p = line.slice(5).trim();
          if (!p || p === "[DONE]") continue;
          let ev: Record<string, any>;
          try { ev = JSON.parse(p); } catch { continue; }
          if (ev["type"] === "response.output_text.delta" && typeof ev["delta"] === "string") text += ev["delta"];
          else if (ev["type"] === "response.failed" || ev["type"] === "error") err = String(ev["response"]?.error?.message ?? ev["message"] ?? "The AI review failed.");
          else if (ev["type"] === "response.incomplete") err = "The AI review was cut short.";
        }
      }
    }
    if (err) return fail(`${err} Your edits are safe; it will try again after the next saved change.`, false);
  } catch {
    return fail("Could not reach the AI service. Your edits are safe; it will try again after the next saved change.", false);
  }

  let parsed: { hours?: Array<Record<string, unknown>> };
  try { parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? ""); } catch { return fail("Could not read the AI review reply. It will try again after the next saved change.", false); }
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 300)).slice(0, 6) : []);
  const byId = new Map((parsed.hours ?? []).map((h) => [String(h["section"]), h]));

  const out = IDS.map((id) => {
    const h = byId.get(id) ?? {};
    const meta = hours.find((x) => x.section === id)!;
    let status = (STATUSES.includes(h["status"] as Status) ? h["status"] : "in_progress") as Status;
    // Hard guards: starter content never counts; failing checks block "complete".
    if (meta.starterUnchanged) status = "not_started";
    else if (status === "complete" && meta.automaticChecks.some((c) => !c.ok)) status = "ready_for_review";
    const failing = meta.automaticChecks.filter((c) => !c.ok).map((c) => `${c.label}: ${c.detail}`);
    const result: HourReview = {
      summary: typeof h["summary"] === "string" ? h["summary"].slice(0, 500) : "",
      aligned: list(h["aligned"]),
      missing: Array.from(new Set([...list(h["missing"]), ...failing])).slice(0, 8),
      issues: list(h["issues"]),
      suggestions: list(h["suggestions"]),
    };
    return { section: id, status, result, content_hash: hash, review_state: "fresh", error: "", reviewed_at: now(), updated_at: now() };
  });
  await db.from("ai_reviews").upsert(out);
  return { reviewed: true as const };
}
