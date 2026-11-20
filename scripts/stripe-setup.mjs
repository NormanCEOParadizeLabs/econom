// Crée dans Stripe le produit ECONOM. Plus, ses deux tarifs, la configuration du portail client et le point de terminaison webhook.
// Usage (mode Test) : STRIPE_SECRET_KEY=sk_test_… APP_URL=https://ton-app.onrender.com node scripts/stripe-setup.mjs
// Idempotent : réutilise le produit et les tarifs existants (repérés par lookup_key).
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
if (!key.startsWith("sk_test_") && process.env.ALLOW_LIVE !== "1") throw new Error("Clé de production refusée : utilise une clé sk_test_ (ou ALLOW_LIVE=1 en connaissance de cause).");
const stripe = new Stripe(key);
const MONTHLY = Number(process.env.PRICE_MONTHLY_CENTS ?? 499);
const YEARLY = Number(process.env.PRICE_YEARLY_CENTS ?? 3999);

const products = await stripe.products.search({ query: "metadata['app']:'econom-plus'" });
const product = products.data[0] ?? (await stripe.products.create({ name: "ECONOM. Plus", description: "Analyses IA étendues, suivi illimité des abonnements, alertes d'échéance, historique complet.", metadata: { app: "econom-plus" } }));

async function price(lookup_key, unit_amount, interval) {
  const found = await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 });
  if (found.data[0] && found.data[0].unit_amount === unit_amount) return found.data[0];
  return stripe.prices.create({ product: product.id, currency: "eur", unit_amount, recurring: { interval }, tax_behavior: "inclusive", lookup_key, transfer_lookup_key: true, nickname: interval === "month" ? "Mensuel" : "Annuel" });
}
const monthly = await price("econom_plus_monthly", MONTHLY, "month");
const yearly = await price("econom_plus_yearly", YEARLY, "year");

// Portail client : factures, moyen de paiement, changement de formule, résiliation en fin de période.
const portal = await stripe.billingPortal.configurations.create({
  business_profile: { headline: "Gère ton abonnement ECONOM. Plus", ...(appUrl ? { privacy_policy_url: `${appUrl}/confidentialite`, terms_of_service_url: `${appUrl}/cgv` } : {}) },
  features: {
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ["email", "address"] },
    subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "unused", "missing_features", "other"] } },
    subscription_update: { enabled: true, default_allowed_updates: ["price"], proration_behavior: "create_prorations", products: [{ product: product.id, prices: [monthly.id, yearly.id] }] },
  },
  ...(appUrl ? { default_return_url: `${appUrl}/app/compte` } : {}),
});

let webhookSecret = "(définis APP_URL pour créer le webhook)";
if (appUrl.startsWith("https://")) {
  const hook = await stripe.webhookEndpoints.create({
    url: `${appUrl}/api/stripe/webhook`,
    enabled_events: ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed"],
  });
  webhookSecret = hook.secret;
}
console.log(`\nÀ saisir dans les secrets de l'hébergeur :\nSTRIPE_PRICE_MONTHLY=${monthly.id}\nSTRIPE_PRICE_YEARLY=${yearly.id}\nSTRIPE_WEBHOOK_SECRET=${webhookSecret}\n\nProduit : ${product.id} · Portail : ${portal.id}`);
