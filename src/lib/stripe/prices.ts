import "server-only";
import { configured, env } from "@/lib/env";
import { stripe } from "@/lib/stripe/client";
import { euro } from "@/lib/format";

let cache: { at: number; value: { monthly: string; yearly: string } } | null = null;
const FALLBACK = { monthly: "4,99 €", yearly: "39,99 €" };

/** Prix affichés = prix réellement configurés dans Stripe (source de vérité de la facturation). */
export async function getDisplayPrices(): Promise<{ monthly: string; yearly: string }> {
  if (!configured.stripe()) return FALLBACK;
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.value;
  try {
    const [m, y] = await Promise.all([stripe().prices.retrieve(env.stripePriceMonthly), stripe().prices.retrieve(env.stripePriceYearly)]);
    if (m.unit_amount == null || y.unit_amount == null) return FALLBACK;
    cache = { at: Date.now(), value: { monthly: euro(m.unit_amount).replace(" ", " "), yearly: euro(y.unit_amount).replace(" ", " ") } };
    return cache.value;
  } catch {
    return FALLBACK;
  }
}
