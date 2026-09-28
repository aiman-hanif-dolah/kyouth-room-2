import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";

// Edit-mode check dynamically imports the server-only gate inside each handler
// (a module-scope import would leak server code into the client bundle).

const BUCKET = "project-assets";

/** Save the shared workspace state. Edit mode required; everyone else is read-only. */
export const saveWorkspace = createServerFn({ method: "POST" })
  .inputValidator((data: { state: unknown; clientId: string }) => data)
  .handler(async ({ data }) => {
    const { requireEdit } = await import("../gate.server");
    await requireEdit();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("workspace_state")
      .upsert({ id: "main", state: data.state as never, client_id: String(data.clientId ?? ""), updated_by: null, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Start an upload: returns a signed upload URL the browser PUTs the file to. */
export const createAssetUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string }) => data)
  .handler(async ({ data }) => {
    const { requireEdit } = await import("../gate.server");
    await requireEdit();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = String(data.fileName ?? "file").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80) || "file";
    const path = `${crypto.randomUUID()}-${safe}`;
    const { data: d, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !d) throw new Error(error?.message ?? "Could not start upload");
    return { path, signedUrl: d.signedUrl };
  });

interface AssetInsert {
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: "image" | "document" | "video" | "audio";
  width: number | null;
  height: number | null;
  section_id: string;
  slot: string;
  in_presentation: boolean;
  sort_order: number;
  uploader_member_id: string;
}

/** Record an uploaded file in the shared library. */
export const insertAsset = createServerFn({ method: "POST" })
  .inputValidator((data: AssetInsert) => data)
  .handler(async ({ data }) => {
    const { requireEdit } = await import("../gate.server");
    await requireEdit();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("project_assets")
      .insert({
        storage_path: data.storage_path,
        file_name: String(data.file_name).slice(0, 200),
        mime_type: String(data.mime_type).slice(0, 120),
        size_bytes: Math.max(0, Number(data.size_bytes) || 0),
        kind: data.kind,
        width: data.width ?? null,
        height: data.height ?? null,
        section_id: data.section_id,
        slot: String(data.slot).slice(0, 80),
        caption: "",
        alt_text: "",
        tags: [],
        in_presentation: !!data.in_presentation,
        sort_order: Number(data.sort_order) || 0,
        uploaded_by: null,
        uploader_member_id: String(data.uploader_member_id ?? ""),
      })
      .select("id")
      .single();
    if (error) {
      await supabaseAdmin.storage.from(BUCKET).remove([data.storage_path]);
      throw new Error(error.message);
    }
    return { id: row.id as string };
  });

const META_FIELDS = ["caption", "alt_text", "tags", "category", "section_id", "slot", "in_presentation", "sort_order", "storage_path", "file_name", "mime_type", "size_bytes", "kind", "width", "height"] as const;

/** Update asset metadata (caption, tags, order, replacement file fields). Optionally removes the old stored file. */
export const updateAssetMeta = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; patch: Record<string, unknown>; removePath?: string }) => data)
  .handler(async ({ data }) => {
    const { requireEdit } = await import("../gate.server");
    await requireEdit();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update: Database["public"]["Tables"]["project_assets"]["Update"] = { updated_at: new Date().toISOString() };
    for (const k of META_FIELDS) if (k in data.patch) (update as Record<string, unknown>)[k] = data.patch[k];
    const { error } = await supabaseAdmin.from("project_assets").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.removePath) await supabaseAdmin.storage.from(BUCKET).remove([data.removePath]);
    return { ok: true as const };
  });

/** Delete an asset row and its stored file. */
export const deleteAsset = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; storagePath: string }) => data)
  .handler(async ({ data }) => {
    const { requireEdit } = await import("../gate.server");
    await requireEdit();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("project_assets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.storage.from(BUCKET).remove([data.storagePath]);
    return { ok: true as const };
  });
