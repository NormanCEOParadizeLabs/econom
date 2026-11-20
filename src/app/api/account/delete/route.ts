import { z } from "zod";
import { getUser } from "@/lib/auth";
import { ApiError, audit, handle, jsonOk, logError, parseJson, rateLimit } from "@/lib/api";
import { configured } from "@/lib/env";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({ confirm: z.literal("SUPPRIMER"), password: z.string().min(1).max(72) });

/** Suppression définitive du compte : résiliation Stripe, puis effacement en cascade de toutes les données. */
export const POST = handle("account.delete", async (req: Request) => {
  const user = await getUser();
  if (!user?.email) throw new ApiError(401, "unauthenticated", "Connecte-toi pour continuer.");
  await rateLimit(`delete:${user.id}`, 5, 3600);
  const body = await parseJson(req, Body);
  const supabase = await supabaseServer();
  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: body.password });
  if (authError) throw new ApiError(403, "wrong_password", "Mot de passe incorrect.");

  const db = supabaseAdmin();
  const { data: sub } = await db.from("subscriptions").select("stripe_subscription_id, stripe_customer_id, status").eq("user_id", user.id).maybeSingle();
  if (sub?.stripe_subscription_id && ["active", "trialing", "past_due", "unpaid", "paused"].includes(sub.status)) {
    if (!configured.stripe()) throw new ApiError(503, "billing_unavailable", "Impossible de résilier ton abonnement pour le moment. Réessaie plus tard ou contacte-nous.");
    try {
      await stripe().subscriptions.cancel(sub.stripe_subscription_id);
    } catch (err) {
      logError("account.delete.stripe", err);
      throw new ApiError(502, "billing_error", "La résiliation de ton abonnement a échoué. Ton compte n'a pas été supprimé : réessaie dans un instant.");
    }
  }
  await audit(null, "account.deleted", "user", undefined, { had_subscription: Boolean(sub?.stripe_subscription_id) });
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new ApiError(500, "delete_failed", "Suppression impossible pour le moment. Réessaie.");
  await supabase.auth.signOut().catch(() => {});
  return jsonOk({ ok: true });
});
