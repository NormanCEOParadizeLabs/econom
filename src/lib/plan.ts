import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Plan = "free" | "plus";

export interface PlanLimits {
  free_ai_analyses: number;
  plus_ai_analyses: number;
  free_ai_chat: number;
  plus_ai_chat: number;
  free_contracts: number;
}

const DEFAULT_LIMITS: PlanLimits = { free_ai_analyses: 3, plus_ai_analyses: 20, free_ai_chat: 15, plus_ai_chat: 200, free_contracts: 1 };

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabaseAdmin().from("admin_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ? ({ ...fallback, ...(data.value as object) } as T) : fallback;
}

export const getLimits = () => getSetting<PlanLimits>("plan_limits", DEFAULT_LIMITS);

/** Droits vérifiés en base à chaque opération protégée (jamais déduits de l'interface). */
export async function getPlan(userId: string): Promise<Plan> {
  const { data, error } = await supabaseAdmin().rpc("has_plus", { uid: userId });
  if (error) throw new Error("Vérification des droits impossible");
  return data === true ? "plus" : "free";
}

export type QuotaKind = "ai_analysis" | "ai_chat";

export async function quotaLimit(plan: Plan, kind: QuotaKind): Promise<number> {
  const l = await getLimits();
  if (kind === "ai_analysis") return plan === "plus" ? l.plus_ai_analyses : l.free_ai_analyses;
  return plan === "plus" ? l.plus_ai_chat : l.free_ai_chat;
}

/** Réserve une unité de quota de façon atomique. */
export async function consumeQuota(userId: string, kind: QuotaKind): Promise<{ ok: boolean; plan: Plan; limit: number; source: "monthly" | "bonus" }> {
  const plan = await getPlan(userId);
  const limit = await quotaLimit(plan, kind);
  const { data, error } = await supabaseAdmin().rpc("consume_quota", { p_user: userId, p_kind: kind, p_limit: limit });
  if (error) throw new Error("Quota indisponible");
  if (data === true) return { ok: true, plan, limit, source: "monthly" };
  if (kind === "ai_analysis") {
    // Quota mensuel épuisé : on puise dans les analyses offertes par le parrainage.
    const bonus = await supabaseAdmin().rpc("consume_bonus_analysis", { p_user: userId });
    if (bonus.data === true) return { ok: true, plan, limit, source: "bonus" };
  }
  return { ok: false, plan, limit, source: "monthly" };
}

export async function refundQuota(userId: string, kind: QuotaKind, source: "monthly" | "bonus" = "monthly") {
  if (source === "bonus") await supabaseAdmin().rpc("refund_bonus_analysis", { p_user: userId });
  else await supabaseAdmin().rpc("refund_quota", { p_user: userId, p_kind: kind });
}

export async function getUsage(userId: string): Promise<Record<QuotaKind, number>> {
  const period = new Date().toISOString().slice(0, 7) + "-01";
  const { data } = await supabaseAdmin().from("usage_quotas").select("kind, used").eq("user_id", userId).eq("period", period);
  const out: Record<QuotaKind, number> = { ai_analysis: 0, ai_chat: 0 };
  for (const r of data ?? []) out[r.kind as QuotaKind] = r.used;
  return out;
}
