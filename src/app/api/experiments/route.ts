import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const revalidate = 60;

/** Expériences en cours (libellés et emplacements uniquement — jamais de montants). */
export async function GET() {
  const { data } = await supabaseAdmin().from("experiments").select("key, variants").eq("status", "running");
  return Response.json({ experiments: (data ?? []).map((e) => ({ key: e.key, variants: (e.variants as { key: string; label: string }[]).map((v) => ({ key: v.key, label: v.label })) })) }, { headers: { "Cache-Control": "public, max-age=60" } });
}
