import { configured } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Vérification de santé : aucun secret, uniquement l'état des dépendances. */
export async function GET() {
  let database = false;
  if (configured.supabase()) {
    try {
      const { error } = await supabaseAdmin().from("admin_settings").select("key").limit(1);
      database = !error;
    } catch {
      database = false;
    }
  }
  const body = { ok: database, version: process.env.npm_package_version ?? "1.0.0", database, ai: configured.ai(), billing: configured.stripe(), email: configured.email(), time: new Date().toISOString() };
  return Response.json(body, { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
