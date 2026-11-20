import { getUser } from "@/lib/auth";
import { ApiError, audit, handle, rateLimit } from "@/lib/api";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TABLES = ["profiles", "user_preferences", "subscriptions", "subscription_events", "usage_quotas", "user_contracts", "uploaded_documents", "document_analyses", "comparison_results", "saving_opportunities", "realized_savings", "favorites", "notifications", "referrals", "login_history"];

/** Export RGPD (droit d'accès et portabilité) : toutes les données du compte, au format JSON. Lecture sous RLS. */
export const GET = handle("account.export", async () => {
  const user = await getUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Connecte-toi pour continuer.");
  await rateLimit(`export:${user.id}`, 5, 3600);
  const supabase = await supabaseServer();
  const out: Record<string, unknown> = { exporte_le: new Date().toISOString(), compte: { id: user.id, email: user.email, cree_le: user.created_at } };
  for (const t of TABLES) out[t] = (await supabase.from(t).select("*").limit(5000)).data ?? [];
  await audit(user.id, "account.export");
  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="econom-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "no-store" },
  });
});
