import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const EVENT_NAMES = [
  "app_opened", "onboarding_completed", "account_created", "invoice_scan_started", "invoice_scan_completed",
  "comparison_completed", "offer_viewed", "offer_clicked", "saving_confirmed", "deal_viewed", "premium_paywall_viewed",
  "checkout_started", "subscription_activated", "subscription_cancelled", "referral_shared",
  "diagnostic_completed", "saving_opportunity_found", "savings_card_generated", "share_link_copied", "share_sheet_opened", "share_completed",
  "referral_link_opened", "referral_account_created", "referral_qualified", "referral_reward_granted", "challenge_created", "challenge_joined",
  "premium_viewed", "premium_converted", "experiment_exposed", "deal_shared",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Événements produit minimalistes : pas d'IP, pas de contenu, propriétés numériques ou courtes uniquement. */
export async function track(name: EventName, opts: { userId?: string | null; anonId?: string | null; source?: string | null; campaign?: string | null; props?: Record<string, string | number | boolean> } = {}) {
  try {
    await supabaseAdmin().from("analytics_events").insert({
      name,
      user_id: opts.userId ?? null,
      anon_id: opts.anonId?.slice(0, 40) ?? null,
      source: opts.source?.slice(0, 40) ?? null,
      campaign: opts.campaign?.replace(/[^a-z0-9-]/gi, "").toLowerCase().slice(0, 60) || null,
      props: opts.props ?? {},
    });
  } catch {
    // L'analytics ne doit jamais casser un parcours.
  }
}
