import { z } from "zod";
import { getUser } from "@/lib/auth";
import { ApiError, audit, handle, jsonOk, parseJson, rateLimit } from "@/lib/api";
import { configured, env } from "@/lib/env";
import { priceFor, stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

const Body = z.object({
  interval: z.enum(["month", "year"]),
  // Accès immédiat à un contenu numérique : demande expresse d'exécution et renoncement au droit de rétractation.
  immediateAccessConsent: z.literal(true),
});

export const POST = handle("stripe.checkout", async (req: Request) => {
  const user = await getUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Connecte-toi pour continuer.");
  if (!configured.stripe()) throw new ApiError(503, "billing_unavailable", "Le paiement n'est pas encore activé sur cet environnement.");
  await rateLimit(`checkout:${user.id}`, 10, 3600);
  const body = await parseJson(req, Body);

  const db = supabaseAdmin();
  const { data: sub } = await db.from("subscriptions").select("stripe_customer_id, status").eq("user_id", user.id).single();
  if (sub && ["active", "trialing", "past_due"].includes(sub.status)) {
    throw new ApiError(409, "already_subscribed", "Tu as déjà un abonnement ECONOM. Plus. Gère-le depuis ton compte.");
  }

  let customerId = sub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id }, preferred_locales: ["fr"] });
    customerId = customer.id;
    await db.from("subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceFor(body.interval), quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    locale: "fr",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${env.appUrl}/app/premium/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/app/premium?annule=1`,
  });
  if (!session.url) throw new ApiError(502, "billing_error", "Impossible d'ouvrir le paiement. Réessaie.");

  await audit(user.id, "checkout.started", "subscription", undefined, { interval: body.interval, immediate_access_consent: true });
  await track("checkout_started", { userId: user.id, props: { interval: body.interval } });
  return jsonOk({ url: session.url });
});
