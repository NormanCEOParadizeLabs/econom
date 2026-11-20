import "server-only";
import { cache } from "react";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { getLimits, getPlan, getUsage } from "@/lib/plan";

/** Contexte de l'utilisateur connecté pour les pages : profil, formule vérifiée en base, quotas. */
export const getMe = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await supabaseServer();
  const [{ data: profile }, { data: sub }, plan, usage, limits] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("subscriptions").select("status, billing_interval, current_period_end, cancel_at_period_end, bonus_until, stripe_customer_id").eq("user_id", user.id).single(),
    getPlan(user.id),
    getUsage(user.id),
    getLimits(),
  ]);
  return {
    user, profile, sub, plan, usage, limits,
    quota: {
      analyses: { used: usage.ai_analysis, limit: plan === "plus" ? limits.plus_ai_analyses : limits.free_ai_analyses },
      chat: { used: usage.ai_chat, limit: plan === "plus" ? limits.plus_ai_chat : limits.free_ai_chat },
    },
  };
});
