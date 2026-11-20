import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.stripeSecretKey) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!client) {
    const opts: ConstructorParameters<typeof Stripe>[1] = { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: "ECONOM." } };
    if (env.stripeApiBase) {
      // Tests uniquement : stripe-mock local.
      const u = new URL(env.stripeApiBase);
      Object.assign(opts, { host: u.hostname, port: Number(u.port), protocol: u.protocol.replace(":", "") });
    }
    client = new Stripe(env.stripeSecretKey, opts);
  }
  return client;
}

export function priceFor(interval: "month" | "year"): string {
  return interval === "year" ? env.stripePriceYearly : env.stripePriceMonthly;
}
