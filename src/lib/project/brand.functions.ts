import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Public read: the site origin plus the id of the logo chosen as the main logo.
 * Used so the icon and share image metadata follow the team's chosen logo.
 */
export const getBrandHead = createServerFn({ method: "GET" }).handler(async () => {
  const req = getRequest();
  const url = new URL(req.url);
  const sandboxHost = url.hostname === "localhost" ? req.headers.get("x-forwarded-host") : null;
  const origin = sandboxHost ? `https://${sandboxHost}` : url.origin;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("project_assets")
    .select("id")
    .eq("category", "primary-logo")
    .eq("kind", "image")
    .limit(1)
    .maybeSingle();

  return { origin, logoId: (data?.id as string | undefined) ?? "" };
});
