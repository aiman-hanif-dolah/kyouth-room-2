import { createServerFn } from "@tanstack/react-start";

// AI suggestions cost credits and read a private file, so Edit mode is required,
// same as every other write. The gateway call lives in a server-only module.

/** Suggest caption, alt text and tags for one uploaded image. */
export const suggestAssetMeta = createServerFn({ method: "POST" })
  .inputValidator((data: { storagePath: string; fileName: string; slotLabel: string }) => data)
  .handler(async ({ data }) => {
    const { requireEdit } = await import("../gate.server");
    await requireEdit();
    const { generateAssetMeta } = await import("./ai.server");
    return generateAssetMeta({ storagePath: data.storagePath, fileName: data.fileName, slotLabel: data.slotLabel });
  });

/** Automatic review of all hours (focus on changed ones). Skips identical content. */
export const runAiReview = createServerFn({ method: "POST" })
  .inputValidator((data: { changed: string[] }) => data)
  .handler(async ({ data }) => {
    const { requireEdit } = await import("../gate.server");
    await requireEdit();
    const { runReview } = await import("./review-ai.server");
    const ok = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
    const changed = (Array.isArray(data.changed) ? data.changed : []).filter((x) => ok.includes(x)) as ("s1")[];
    return runReview(changed);
  });
