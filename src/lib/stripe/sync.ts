import "server-only";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";

const STATUSES = ["trialing", "active", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"] as const;
type BillingStatus = (typeof STATUSES)[number] | "free";
const ENTITLED = new Set<BillingStatus>(["active", "trialing", "past_due"]);

export interface WebhookDeps {
  /** Récupère l'état courant de l'abonnement chez Stripe : rend le traitement insensible à l'ordre des événements. */
  fetchSubscription: (id: string) => Promise<Stripe.Subscription>;
}

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

const idOf = (x: string | { id: string } | null | undefined): string | null => (!x ? null : typeof x === "string" ? x : x.id);

async function findUserId(customerId: string | null, hinted?: string | null): Promise<string | null> {
  const db = supabaseAdmin();
  if (hinted && /^[0-9a-f-]{36}$/i.test(hinted)) {
    const { data } = await db.from("subscriptions").select("user_id").eq("user_id", hinted).maybeSingle();
    if (data) return data.user_id;
  }
  if (customerId) {
    const { data } = await db.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    if (data) return data.user_id;
  }
  return null;
}

/** Applique l'état d'un abonnement Stripe aux droits de l'utilisateur. */
export async function applySubscription(sub: Stripe.Subscription, stripeEventId: string | null, eventType: string): Promise<boolean> {
  const db = supabaseAdmin();
  const customerId = idOf(sub.customer);
  const userId = await findUserId(customerId, sub.metadata?.user_id);
  if (!userId) return false;

  const { data: row } = await db.from("subscriptions").select("status, stripe_subscription_id").eq("user_id", userId).single();
  const status = (STATUSES as readonly string[]).includes(sub.status) ? (sub.status as BillingStatus) : "incomplete";

  // Un abonnement secondaire abandonné ou expiré ne doit pas retirer les droits d'un abonnement actif distinct.
  if (row?.stripe_subscription_id && row.stripe_subscription_id !== sub.id && ENTITLED.has(row.status as BillingStatus) && !ENTITLED.has(status)) {
    return false;
  }

  const item = sub.items?.data?.[0];
  const periodEnd = Math.max(0, ...(sub.items?.data ?? []).map((i) => i.current_period_end ?? 0));
  const ended = status === "canceled" || status === "incomplete_expired";
  const patch = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status,
    price_id: item?.price?.id ?? null,
    billing_interval: item?.price?.recurring?.interval === "year" ? "year" : item?.price?.recurring?.interval === "month" ? "month" : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !ended && (sub.cancel_at_period_end || sub.cancel_at != null),
    last_stripe_event_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("subscriptions").update(patch).eq("user_id", userId);
  if (error) throw new Error("subscription_sync_failed");

  if (row?.status !== status) {
    await db.from("subscription_events").insert({ user_id: userId, stripe_event_id: stripeEventId, type: eventType, from_status: row?.status ?? "free", to_status: status });
    const wasEntitled = ENTITLED.has((row?.status ?? "free") as BillingStatus);
    if (!wasEntitled && ENTITLED.has(status)) {
      await track("subscription_activated", { userId, props: { interval: patch.billing_interval ?? "?" } });
      await track("premium_converted", { userId, props: { interval: patch.billing_interval ?? "?" } });
    }
    if (wasEntitled && ended) await track("subscription_cancelled", { userId });
  }
  return true;
}

async function notify(userId: string, title: string, body: string, dedupe: string) {
  await supabaseAdmin().from("notifications").upsert(
    { user_id: userId, kind: "billing", title, body, link: "/app/compte", dedupe_key: dedupe },
    { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
  );
}

/**
 * Traite un événement Stripe déjà authentifié (signature vérifiée par l'appelant).
 * Idempotent : un identifiant d'événement n'est appliqué qu'une fois ; un échec laisse l'événement rejouable.
 */
export async function processStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<WebhookOutcome> {
  const db = supabaseAdmin();
  const created = new Date(event.created * 1000).toISOString();

  const { error: insertError } = await db.from("stripe_events").insert({ id: event.id, type: event.type, stripe_created: created });
  if (insertError) {
    if (insertError.code !== "23505") throw new Error("stripe_event_store_failed");
    const { data: existing } = await db.from("stripe_events").select("status, received_at").eq("id", event.id).single();
    const stale = existing && Date.now() - new Date(existing.received_at).getTime() > 60_000;
    if (existing?.status === "processed" || existing?.status === "ignored") return "duplicate";
    if (existing?.status === "processing" && !stale) return "duplicate"; // livraison concurrente en cours
    // Tentative précédente échouée : on la reprend, à condition d'être seul à le faire.
    const { data: claimed } = await db.from("stripe_events").update({ status: "processing", received_at: new Date().toISOString(), error: null }).eq("id", event.id).eq("status", existing!.status).select("id");
    if (!claimed?.length) return "duplicate";
  }

  if (!HANDLED.has(event.type)) {
    await db.from("stripe_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("id", event.id);
    return "ignored";
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const customerId = idOf(session.customer);
        const userId = await findUserId(null, session.client_reference_id);
        if (userId && customerId) await db.from("subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", userId);
        const subId = idOf(session.subscription);
        if (subId) await applySubscription(await deps.fetchSubscription(subId), event.id, event.type);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // L'objet de l'événement peut être périmé : on relit l'état courant.
        const fresh = await deps.fetchSubscription(event.data.object.id);
        await applySubscription(fresh, event.id, event.type);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = idOf(invoice.parent?.subscription_details?.subscription);
        const userId = await findUserId(idOf(invoice.customer));
        if (subId) await applySubscription(await deps.fetchSubscription(subId), event.id, event.type);
        if (userId) {
          if (event.type === "invoice.paid") {
            await db.from("subscription_events").insert({ user_id: userId, stripe_event_id: event.id, type: "invoice.paid", amount_cents: invoice.amount_paid });
          } else {
            await db.from("subscription_events").insert({ user_id: userId, stripe_event_id: event.id, type: "invoice.payment_failed", amount_cents: invoice.amount_due });
            await notify(userId, "Paiement refusé", "Le paiement de ton abonnement ECONOM. Plus a échoué. Mets à jour ton moyen de paiement pour conserver tes avantages.", `invoice-failed-${invoice.id}`);
          }
        }
        break;
      }
    }
    await db.from("stripe_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", event.id);
    return "processed";
  } catch (err) {
    await db.from("stripe_events").update({ status: "failed", error: (err as Error).message?.slice(0, 200) ?? "error" }).eq("id", event.id);
    throw err;
  }
}
