import { getUser } from "@/lib/auth";
import { ApiError, handle, jsonOk, rateLimit } from "@/lib/api";
import { configured, env } from "@/lib/env";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export const POST = handle("stripe.portal", async () => {
  const user = await getUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Connecte-toi pour continuer.");
  if (!configured.stripe()) throw new ApiError(503, "billing_unavailable", "Le paiement n'est pas encore activé sur cet environnement.");
  await rateLimit(`portal:${user.id}`, 20, 3600);
  const { data: sub } = await supabaseAdmin().from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).single();
  if (!sub?.stripe_customer_id) throw new ApiError(404, "no_customer", "Aucun abonnement à gérer pour le moment.");
  const session = await stripe().billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${env.appUrl}/app/compte`, locale: "fr" });
  return jsonOk({ url: session.url });
});
