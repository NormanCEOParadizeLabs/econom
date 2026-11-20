import { z } from "zod";
import { getUser } from "@/lib/auth";
import { clientIp, handle, jsonOk, parseJson, rateLimit } from "@/lib/api";
import { EVENT_NAMES, track } from "@/lib/analytics";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CLIENT_EVENTS = EVENT_NAMES.filter((n) => !["subscription_activated", "subscription_cancelled", "account_created", "checkout_started", "referral_link_opened", "referral_account_created", "referral_qualified", "referral_reward_granted", "premium_converted", "challenge_created", "challenge_joined", "diagnostic_completed", "saving_opportunity_found"].includes(n));
const Body = z.object({
  name: z.enum(CLIENT_EVENTS as [string, ...string[]]),
  anonId: z.string().max(40).optional(),
  source: z.string().max(40).optional(),
  campaign: z.string().max(60).optional(),
  props: z.record(z.string().max(30), z.union([z.string().max(60), z.number(), z.boolean()])).optional(),
});

export const POST = handle("events", async (req: Request) => {
  await rateLimit(`events:${clientIp(req)}`, 120, 60);
  const body = await parseJson(req, Body, 2000);
  const user = await getUser();
  // Sans accord explicite, l'événement est compté de façon anonyme (aucun lien avec le compte).
  let userId: string | null = null;
  if (user) {
    const { data } = await supabaseAdmin().from("user_preferences").select("analytics_consent").eq("user_id", user.id).maybeSingle();
    if (data?.analytics_consent) userId = user.id;
  }
  await track(body.name as (typeof EVENT_NAMES)[number], { userId, source: body.source, campaign: body.campaign, props: body.props });
  return jsonOk({ ok: true });
});
