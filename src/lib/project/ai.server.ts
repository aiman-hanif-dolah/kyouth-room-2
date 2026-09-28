// Server-only: AI caption/alt-text/tags suggestions through the Lovable AI Gateway.
// This module is *.server.ts, so it never ships to the client bundle; the key stays here.

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Run-ID fetch wrapper: reuses the gateway-issued run id, never mints one. */
function runIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

export interface AssetMetaSuggestion {
  caption: string;
  altText: string;
  tags: string[];
}

/** Turn a failed gateway response into an honest, plain-language error. */
function friendlyError(status: number, body: string): Error {
  let msg = "";
  try {
    const j = JSON.parse(body);
    msg = String(j.message ?? j.error ?? "").slice(0, 200);
  } catch {
    msg = body.replace(/<[^>]+>/g, " ").slice(0, 160);
  }
  if (status === 402) return new Error(`AI credits are used up. Top up in Settings, Plans and credits, then try again. ${msg}`);
  if (status === 429) return new Error(`The AI is busy right now (rate limit). Wait a moment and try again.`);
  if (status === 403) return new Error(`The AI request was denied (403). ${msg || "This may be a workspace policy."}`);
  if (status === 404) return new Error(`The AI service is not available right now (404).`);
  if (status >= 500) return new Error(`The AI service had a problem (${status}). Try again shortly.`);
  return new Error(`The AI request failed (${status}). ${msg}`);
}

const SYSTEM_PROMPT = `You write concise metadata for files in a student team's shared workspace. The team is preparing a Malaysian startup pitch for "BatikLab", a batik-inspired creative-tech startup. You are given an image from their shared library.

Reply with JSON only, no markdown fence and no extra text:
{"caption": string, "altText": string, "tags": string[]}

Rules:
- caption: one short sentence of at most 12 words describing the image in the context of the startup project. No emoji.
- altText: plain description of what the image actually shows, for screen readers, under 120 characters.
- tags: 3 to 5 short lowercase keywords, no duplicates.`;

/** Suggest caption, alt text and tags for one stored image. */
export async function generateAssetMeta(opts: {
  storagePath: string;
  fileName: string;
  slotLabel: string;
}): Promise<AssetMetaSuggestion> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: signed, error } = await supabaseAdmin.storage
    .from("project-assets")
    .createSignedUrl(opts.storagePath, 600);
  if (error || !signed?.signedUrl) throw new Error("Could not read the file to analyse it. Try again.");

  const gateway = runIdFetch();
  const res = await gateway.fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "input_text", text: `Library section: ${opts.slotLabel}. File name: ${opts.fileName}. Suggest the caption, alt text and tags for this image.` },
            { type: "input_image", image_url: signed.signedUrl },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw friendlyError(res.status, await res.text());

  // Read the SSE stream to the end; accumulate the answer text.
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let fail = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let ev: Record<string, unknown>;
        try { ev = JSON.parse(payload); } catch { continue; }
        const type = String(ev["type"] ?? "");
        if (type === "response.output_text.delta" && typeof ev["delta"] === "string") text += ev["delta"];
        else if (type === "response.failed") fail = String((ev["response"] as { error?: { message?: string } } | undefined)?.error?.message ?? "The AI request failed.");
        else if (type === "error" || type === "response.error") fail = String(ev["message"] ?? "The AI request failed.");
        else if (type === "response.incomplete") fail = "The AI reply was cut short. Try again.";
      }
      if (fail) break;
    }
    if (fail) break;
  }
  if (fail) throw new Error(fail);
  if (!text.trim()) throw new Error("The AI returned an empty reply. Try again.");

  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Could not read the AI reply. Try again.");
  let j: { caption?: unknown; altText?: unknown; tags?: unknown };
  try { j = JSON.parse(m[0]); } catch { throw new Error("Could not read the AI reply. Try again."); }

  const caption = typeof j.caption === "string" ? j.caption.trim().slice(0, 140) : "";
  const altText = typeof j.altText === "string" ? j.altText.trim().slice(0, 200) : "";
  const tags = Array.isArray(j.tags)
    ? j.tags.filter((t): t is string => typeof t === "string" && !!t.trim()).map((t) => t.trim().toLowerCase().slice(0, 24)).slice(0, 6)
    : [];
  if (!caption && !altText && !tags.length) throw new Error("The AI reply was empty. Try again.");
  return { caption, altText, tags };
}
