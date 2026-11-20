import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe/client";
import { processStripeEvent } from "@/lib/stripe/sync";
import { logError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) return new Response("Stripe non configuré", { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });
  const payload = await req.text(); // corps brut indispensable à la vérification
  let event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }
  try {
    const outcome = await processStripeEvent(event, { fetchSubscription: (id) => stripe().subscriptions.retrieve(id) });
    return Response.json({ received: true, outcome });
  } catch (err) {
    logError("stripe.webhook", err);
    return new Response("Traitement différé", { status: 500 }); // Stripe relivrera l'événement
  }
}
