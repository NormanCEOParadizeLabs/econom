import { z } from "zod";
import { getUser } from "@/lib/auth";
import { clientIp, handle, jsonOk, parseJson, rateLimit } from "@/lib/api";
import { EVENT_NAMES, track } from "@/lib/analytics";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CLIENT_EVENTS = EVENT_NAMES.filter((n) => !["subscription_activated", "subscription_cancelled", "account_created", "checkout_started"].includes(n));
const Body = z.object({
  name: z.enum(CLIENT_EVENTS as [string, ...string[]]),
  anonId: z.string().max(40).optional(),
  source: z.string().max(40).optional(),
  props: z.record(z.string().max(30), z.union([z.string().max(60), z.number(), z.boolean()])).optional(),
});

export const POST = handle("events", async (req: Request) => {
  await rateLimit(`events:${clientIp(req)}`, 120, 60);
  const body = await parseJson(req, Body, 2000);
  const user = await getUser();
  if (user) {
    // Mesure d'audience des comptes : uniquement avec accord explicite.
    const { data } = await supabaseAdmin().from("user_preferences").select("analytics_consent").eq("user_id", user.id).maybeSingle();
    if (!data?.analytics_consent) return jsonOk({ ok: true, recorded: false });
  }
  await track(body.name as (typeof EVENT_NAMES)[number], { userId: user?.id, anonId: user ? null : body.anonId, source: body.source, props: body.props });
  return jsonOk({ ok: true, recorded: true });
});
