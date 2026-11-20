import Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { processStripeEvent } from "@/lib/stripe/sync";
import { POST as webhookRoute } from "@/app/api/stripe/webhook/route";
import { consumeQuota, getPlan } from "@/lib/plan";
import { admin, createUser, deleteUser, type TestUser } from "../helpers";

const DAY = 86400;
const now = () => Math.floor(Date.now() / 1000);
let user: TestUser;
let seq = 0;
const uid = (p: string) => `${p}_test_${Date.now()}_${seq++}`;

/** État « chez Stripe » simulé : ce que renverrait subscriptions.retrieve. */
const remote = new Map<string, Stripe.Subscription>();
let failFetch = false;
const deps = {
  fetchSubscription: async (id: string) => {
    if (failFetch) throw new Error("stripe_unreachable");
    const s = remote.get(id);
    if (!s) throw new Error("no_such_subscription");
    return s;
  },
};

function subscription(over: Partial<Stripe.Subscription> & { periodEnd?: number; interval?: "month" | "year" } = {}): Stripe.Subscription {
  const { periodEnd = now() + 30 * DAY, interval = "month", ...rest } = over;
  const sub = {
    id: rest.id ?? uid("sub"), object: "subscription", customer: customerId, status: "active", cancel_at_period_end: false, cancel_at: null,
    metadata: { user_id: user.id },
    items: { data: [{ id: uid("si"), current_period_end: periodEnd, price: { id: interval === "year" ? "price_test_yearly" : "price_test_monthly", recurring: { interval } } }] },
    ...rest,
  } as unknown as Stripe.Subscription;
  remote.set(sub.id, sub);
  return sub;
}
const event = (type: string, object: unknown, created = now()) => ({ id: uid("evt"), object: "event", type, created, data: { object } }) as unknown as Stripe.Event;
const invoice = (subId: string, over: Record<string, unknown> = {}) => ({ id: uid("in"), object: "invoice", customer: customerId, amount_paid: 499, amount_due: 499, parent: { type: "subscription_details", subscription_details: { subscription: subId } }, ...over });
const state = async () => (await admin.from("subscriptions").select("*").eq("user_id", user.id).single()).data!;
let customerId: string;

beforeAll(async () => {
  user = await createUser("stripe");
});
afterAll(async () => {
  await deleteUser(user);
});
beforeEach(async () => {
  customerId = uid("cus");
  failFetch = false;
  remote.clear();
  await admin.from("subscriptions").update({ status: "free", stripe_customer_id: null, stripe_subscription_id: null, current_period_end: null, cancel_at_period_end: false, price_id: null, billing_interval: null }).eq("user_id", user.id);
  await admin.from("notifications").delete().eq("user_id", user.id);
  await admin.from("subscription_events").delete().eq("user_id", user.id);
});

describe("webhooks Stripe → droits Premium", () => {
  it("1–2. nouveau souscripteur, paiement réussi", async () => {
    expect(await getPlan(user.id)).toBe("free");
    const sub = subscription({ interval: "year", periodEnd: now() + 365 * DAY });
    const session = { id: uid("cs"), object: "checkout.session", mode: "subscription", customer: customerId, client_reference_id: user.id, subscription: sub.id };
    expect(await processStripeEvent(event("checkout.session.completed", session), deps)).toBe("processed");
    await processStripeEvent(event("customer.subscription.created", sub), deps);
    await processStripeEvent(event("invoice.paid", invoice(sub.id, { amount_paid: 3999 })), deps);
    const s = await state();
    expect(s).toMatchObject({ status: "active", stripe_customer_id: customerId, stripe_subscription_id: sub.id, billing_interval: "year", price_id: "price_test_yearly" });
    expect(await getPlan(user.id)).toBe("plus");
    const { data: ev } = await admin.from("subscription_events").select("type, amount_cents, to_status").eq("user_id", user.id).order("id");
    expect(ev).toEqual([
      { type: "checkout.session.completed", amount_cents: null, to_status: "active" },
      { type: "invoice.paid", amount_cents: 3999, to_status: null },
    ]);
  });

  it("3. paiement refusé à la souscription : aucun droit, notification envoyée", async () => {
    await admin.from("subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
    const sub = subscription({ status: "incomplete" });
    await processStripeEvent(event("customer.subscription.created", sub), deps);
    await processStripeEvent(event("invoice.payment_failed", invoice(sub.id)), deps);
    expect((await state()).status).toBe("incomplete");
    expect(await getPlan(user.id)).toBe("free");
    const { data: n } = await admin.from("notifications").select("title").eq("user_id", user.id);
    expect(n).toEqual([{ title: "Paiement refusé" }]);
  });

  it("4. renouvellement : la période est prolongée", async () => {
    const sub = subscription({ periodEnd: now() + 2 * DAY });
    await processStripeEvent(event("customer.subscription.created", sub), deps);
    const before = new Date((await state()).current_period_end).getTime();
    subscription({ id: sub.id, periodEnd: now() + 32 * DAY });
    await processStripeEvent(event("invoice.paid", invoice(sub.id)), deps);
    expect(new Date((await state()).current_period_end).getTime()).toBeGreaterThan(before + 29 * DAY * 1000);
    expect(await getPlan(user.id)).toBe("plus");
  });

  it("5–6. annulation en fin de période (droits conservés) puis expiration (droits retirés)", async () => {
    const sub = subscription();
    await processStripeEvent(event("customer.subscription.created", sub), deps);
    subscription({ id: sub.id, cancel_at_period_end: true });
    await processStripeEvent(event("customer.subscription.updated", sub), deps);
    expect(await state()).toMatchObject({ status: "active", cancel_at_period_end: true });
    expect(await getPlan(user.id)).toBe("plus");
    subscription({ id: sub.id, status: "canceled" });
    await processStripeEvent(event("customer.subscription.deleted", sub), deps);
    expect(await state()).toMatchObject({ status: "canceled", cancel_at_period_end: false });
    expect(await getPlan(user.id)).toBe("free");
  });

  it("annulation programmée via cancel_at (portail client récent)", async () => {
    const sub = subscription({ cancel_at: now() + 30 * DAY });
    await processStripeEvent(event("customer.subscription.updated", sub), deps);
    expect((await state()).cancel_at_period_end).toBe(true);
  });

  it("échec de renouvellement : paiement en retard puis impayé", async () => {
    const sub = subscription();
    await processStripeEvent(event("customer.subscription.created", sub), deps);
    subscription({ id: sub.id, status: "past_due" });
    await processStripeEvent(event("invoice.payment_failed", invoice(sub.id)), deps);
    expect((await state()).status).toBe("past_due");
    expect(await getPlan(user.id)).toBe("plus"); // accès maintenu pendant les relances
    subscription({ id: sub.id, status: "unpaid" });
    await processStripeEvent(event("customer.subscription.updated", sub), deps);
    expect(await getPlan(user.id)).toBe("free");
  });

  it("7. mise à jour du moyen de paiement : événement ignoré, droits inchangés", async () => {
    const sub = subscription();
    await processStripeEvent(event("customer.subscription.created", sub), deps);
    expect(await processStripeEvent(event("payment_method.attached", { id: "pm_x", customer: customerId }), deps)).toBe("ignored");
    expect(await processStripeEvent(event("customer.updated", { id: customerId }), deps)).toBe("ignored");
    expect(await getPlan(user.id)).toBe("plus");
  });

  it("changement de formule mensuel → annuel", async () => {
    const sub = subscription();
    await processStripeEvent(event("customer.subscription.created", sub), deps);
    subscription({ id: sub.id, interval: "year", periodEnd: now() + 365 * DAY });
    await processStripeEvent(event("customer.subscription.updated", sub), deps);
    expect(await state()).toMatchObject({ billing_interval: "year", price_id: "price_test_yearly", status: "active" });
  });

  it("8. webhook reçu deux fois : appliqué une seule fois", async () => {
    const sub = subscription();
    const e = event("invoice.paid", invoice(sub.id));
    expect(await processStripeEvent(e, deps)).toBe("processed");
    expect(await processStripeEvent(e, deps)).toBe("duplicate");
    const results = await Promise.all([1, 2, 3].map(() => processStripeEvent(event("invoice.paid", invoice(sub.id)), deps)));
    expect(results).toEqual(["processed", "processed", "processed"]); // événements distincts
    const { data } = await admin.from("subscription_events").select("id").eq("user_id", user.id).eq("stripe_event_id", e.id);
    expect(data).toHaveLength(1);
  });

  it("8 bis. même événement livré en parallèle : un seul traitement", async () => {
    const sub = subscription();
    const e = event("invoice.paid", invoice(sub.id));
    const results = await Promise.all([processStripeEvent(e, deps), processStripeEvent(e, deps), processStripeEvent(e, deps)]);
    expect(results.filter((r) => r === "processed")).toHaveLength(1);
    expect((await admin.from("subscription_events").select("id").eq("stripe_event_id", e.id)).data).toHaveLength(1);
  });

  it("9. échec temporaire : l'événement reste rejouable et la relivraison aboutit", async () => {
    const sub = subscription();
    const e = event("customer.subscription.created", sub);
    failFetch = true;
    await expect(processStripeEvent(e, deps)).rejects.toThrow();
    expect((await admin.from("stripe_events").select("status").eq("id", e.id).single()).data!.status).toBe("failed");
    expect(await getPlan(user.id)).toBe("free");
    failFetch = false;
    expect(await processStripeEvent(e, deps)).toBe("processed");
    expect(await getPlan(user.id)).toBe("plus");
  });

  it("événements désordonnés : un ancien « active » arrivant après la suppression ne rend pas les droits", async () => {
    const sub = subscription();
    const createdEvt = event("customer.subscription.created", { ...sub }, now() - 100);
    const updatedEvt = event("customer.subscription.updated", { ...sub }, now() - 50);
    await processStripeEvent(createdEvt, deps);
    subscription({ id: sub.id, status: "canceled" });
    await processStripeEvent(event("customer.subscription.deleted", sub, now()), deps);
    await processStripeEvent(updatedEvt, deps); // arrive en retard, contenu périmé « active »
    expect((await state()).status).toBe("canceled");
    expect(await getPlan(user.id)).toBe("free");
  });

  it("un second abonnement abandonné n'annule pas l'abonnement actif", async () => {
    const good = subscription();
    await processStripeEvent(event("customer.subscription.created", good), deps);
    const abandoned = subscription({ status: "incomplete_expired" });
    await processStripeEvent(event("customer.subscription.updated", abandoned), deps);
    expect(await state()).toMatchObject({ status: "active", stripe_subscription_id: good.id });
  });

  it("événement pour un client inconnu : traité sans effet ni erreur", async () => {
    const sub = subscription({ customer: "cus_unknown", metadata: {} } as never);
    expect(await processStripeEvent(event("customer.subscription.created", sub), deps)).toBe("processed");
    expect((await state()).status).toBe("free");
  });

  it("10. accès Premium sans abonnement : quotas gratuits appliqués côté serveur", async () => {
    await admin.from("usage_quotas").delete().eq("user_id", user.id);
    const tries = [];
    for (let i = 0; i < 5; i++) tries.push((await consumeQuota(user.id, "ai_analysis")).ok);
    expect(tries).toEqual([true, true, true, false, false]);
    await user.client.from("subscriptions").update({ status: "active" }).eq("user_id", user.id); // tentative côté client
    expect(await getPlan(user.id)).toBe("free");
  });
});

describe("route webhook : signature", () => {
  const stripe = new Stripe("sk_test_local_placeholder");
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  const post = (payload: string, signature?: string) =>
    webhookRoute(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: signature ? { "stripe-signature": signature } : {} }));

  it("refuse une requête sans signature, mal signée ou altérée", async () => {
    const payload = JSON.stringify(event("customer.created", { id: "cus_1" }));
    expect((await post(payload)).status).toBe(400);
    expect((await post(payload, "t=1,v1=deadbeef")).status).toBe(400);
    expect((await post(payload, stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_autre" }))).status).toBe(400);
    const good = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect((await post(payload.replace("cus_1", "cus_2"), good)).status).toBe(400);
    const old = stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: now() - 3600 });
    expect((await post(payload, old)).status).toBe(400); // rejeu d'une ancienne requête
  });
  it("accepte un événement correctement signé, et reste idempotente", async () => {
    const payload = JSON.stringify(event("customer.created", { id: "cus_1" }));
    const sig = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const r1 = await post(payload, sig);
    expect(r1.status).toBe(200);
    expect((await r1.json()).outcome).toBe("ignored");
    expect((await (await post(payload, sig)).json()).outcome).toBe("duplicate");
  });
});
