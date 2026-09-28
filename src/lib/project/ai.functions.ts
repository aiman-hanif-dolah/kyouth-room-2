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
