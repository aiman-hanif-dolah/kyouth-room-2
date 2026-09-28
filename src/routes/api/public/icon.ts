import { createFileRoute } from "@tanstack/react-router";

/**
 * Serves the logo chosen as the project's main logo (project_assets.category = 'primary-logo')
 * as the favicon / app icon / share image. Falls back to the bundled favicon when none is chosen.
 */
export const Route = createFileRoute("/api/public/icon")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("project_assets")
          .select("storage_path, mime_type")
          .eq("category", "primary-logo")
          .eq("kind", "image")
          .limit(1)
          .maybeSingle();

        if (!data?.storage_path) {
          return new Response(null, { status: 302, headers: { location: "/favicon.ico", "cache-control": "public, max-age=60" } });
        }

        const file = await supabaseAdmin.storage.from("project-assets").download(data.storage_path);
        if (file.error || !file.data) {
          return new Response(null, { status: 302, headers: { location: "/favicon.ico", "cache-control": "no-store" } });
        }

        return new Response(await file.data.arrayBuffer(), {
          headers: {
            "content-type": data.mime_type || "image/png",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
