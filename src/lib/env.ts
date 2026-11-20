import "server-only";

/** Variables serveur. Les secrets ne quittent jamais ce module côté serveur. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  stripePriceYearly: process.env.STRIPE_PRICE_YEARLY ?? "",
  stripeApiBase: process.env.STRIPE_API_BASE ?? "", // tests uniquement (stripe-mock)
  cronSecret: process.env.CRON_SECRET ?? "",
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
};

export const configured = {
  supabase: () => Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceKey),
  ai: () => Boolean(env.anthropicKey),
  stripe: () => Boolean(env.stripeSecretKey && env.stripeWebhookSecret && env.stripePriceMonthly && env.stripePriceYearly),
  email: () => Boolean(env.resendKey && env.emailFrom),
};
