import "server-only";
import { createHmac } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/plan";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics";

export interface RewardTier {
  qualified: number;
  type: "bonus_analyses" | "plus_days" | "advanced_report";
  amount: number;
}
export interface ReferralRules {
  tiers: RewardTier[];
  max_qualified_per_month: number;
  max_same_ip: number;
  attribution_days: number;
}
export const DEFAULT_RULES: ReferralRules = {
  tiers: [
    { qualified: 1, type: "bonus_analyses", amount: 3 },
    { qualified: 3, type: "plus_days", amount: 7 },
    { qualified: 5, type: "advanced_report", amount: 1 },
  ],
  max_qualified_per_month: 15,
  max_same_ip: 2,
  attribution_days: 30,
};
export const getReferralRules = () => getSetting<ReferralRules>("referral_rewards", DEFAULT_RULES);

export const REF_COOKIE = "econom_ref";
export const isReferralCode = (c: unknown): c is string => typeof c === "string" && /^[A-Z0-9]{8}$/.test(c);

export function rewardLabel(t: RewardTier): string {
  if (t.type === "bonus_analyses") return `${t.amount} analyses IA supplémentaires`;
  if (t.type === "plus_days") return `${t.amount} jours d'ECONOM. Plus offerts`;
  return "Rapport d'optimisation avancé";
}

const DISPOSABLE = new Set(["mailinator.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "temp-mail.org", "throwawaymail.com", "maildrop.cc", "dispostable.com", "fakeinbox.com"]);

export const normalizeEmail = (e: string) => {
  const [local, domain] = e.toLowerCase().trim().split("@");
  return `${(local ?? "").split("+")[0].replace(/\./g, "")}@${domain ?? ""}`;
};

/** Empreinte non réversible de l'adresse IP : sert uniquement à repérer les inscriptions en série. */
export function hashIp(ip: string): string | null {
  if (!ip || ip === "unknown") return null;
  return createHmac("sha256", env.supabaseServiceKey || "econom").update(ip).digest("hex").slice(0, 32);
}

export async function referrerIdForCode(code: string): Promise<string | null> {
  if (!isReferralCode(code)) return null;
  const { data } = await supabaseAdmin().from("profiles").select("id").eq("referral_code", code).maybeSingle();
  return data?.id ?? null;
}

export type ClaimResult = "claimed" | "invalid_code" | "self" | "too_late" | "already" | "error";

/** Associe un nouveau compte à son parrain. Les contrôles anti-fraude définitifs ont lieu à la qualification. */
export async function claimReferral(userId: string, email: string, code: string, ip?: string): Promise<ClaimResult> {
  const clean = code.trim().toUpperCase();
  const referrerId = await referrerIdForCode(clean);
  if (!referrerId) return "invalid_code";
  if (referrerId === userId) return "self";
  const db = supabaseAdmin();
  const { data: me } = await db.from("profiles").select("created_at").eq("id", userId).single();
  if (!me || Date.now() - new Date(me.created_at).getTime() > 24 * 3600 * 1000) return "too_late"; // nouveaux comptes uniquement
  const { data: refUser } = await db.auth.admin.getUserById(referrerId);
  if (refUser.user?.email && normalizeEmail(refUser.user.email) === normalizeEmail(email)) return "self"; // alias du même e-mail
  const { error } = await db.from("referrals").insert({ referrer_id: referrerId, referred_id: userId, ip_hash: ip ? hashIp(ip) : null });
  if (error) return error.code === "23505" ? "already" : "error";
  await track("referral_account_created", { userId });
  return "claimed";
}

async function reject(referredId: string, reason: string) {
  await supabaseAdmin().from("referrals").update({ status: "rejected", rejected_reason: reason }).eq("referred_id", referredId).eq("status", "pending");
}

/**
 * Qualification d'un filleul : appelée quand il termine un diagnostic valide (comparaison enregistrée ou facture validée).
 * Conditions : e-mail confirmé, adresse non jetable, pas d'inscriptions en série depuis la même origine, plafond mensuel du parrain.
 */
export async function qualifyReferral(userId: string): Promise<"qualified" | "none" | "pending" | "rejected"> {
  const db = supabaseAdmin();
  const { data: ref } = await db.from("referrals").select("id, referrer_id, ip_hash, status").eq("referred_id", userId).maybeSingle();
  if (!ref || ref.status !== "pending") return "none";
  const { data: authUser } = await db.auth.admin.getUserById(userId);
  const email = authUser.user?.email ?? "";
  if (!authUser.user?.email_confirmed_at) return "pending"; // sera retenté au prochain diagnostic
  if (DISPOSABLE.has(email.split("@")[1] ?? "")) {
    await reject(userId, "adresse e-mail jetable");
    return "rejected";
  }
  const rules = await getReferralRules();
  if (ref.ip_hash) {
    const { count } = await db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", ref.referrer_id).eq("ip_hash", ref.ip_hash).eq("status", "qualified");
    if ((count ?? 0) >= rules.max_same_ip) {
      await reject(userId, "trop de comptes depuis la même origine");
      return "rejected";
    }
  }
  const monthStart = new Date().toISOString().slice(0, 7) + "-01T00:00:00Z";
  const { count: monthCount } = await db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", ref.referrer_id).eq("status", "qualified").gte("qualified_at", monthStart);
  if ((monthCount ?? 0) >= rules.max_qualified_per_month) return "pending"; // plafond atteint : retenté plus tard, jamais perdu

  // Passage atomique pending → qualified : deux requêtes concurrentes ne qualifient qu'une fois.
  const { data: done } = await db.from("referrals").update({ status: "qualified", qualified_at: new Date().toISOString() }).eq("id", ref.id).eq("status", "pending").select("id");
  if (!done?.length) return "none";
  await track("referral_qualified", { userId: ref.referrer_id });
  await grantDueRewards(ref.referrer_id, rules);
  return "qualified";
}

/** Attribue chaque palier atteint et pas encore accordé. Idempotent (contrainte d'unicité en base). */
export async function grantDueRewards(referrerId: string, rules?: ReferralRules): Promise<RewardTier[]> {
  const db = supabaseAdmin();
  const r = rules ?? (await getReferralRules());
  const { count } = await db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", referrerId).eq("status", "qualified");
  const granted: RewardTier[] = [];
  for (const tier of r.tiers.filter((t) => t.qualified <= (count ?? 0)).sort((a, b) => a.qualified - b.qualified)) {
    const { data } = await db.rpc("grant_referral_reward", { p_user: referrerId, p_tier: tier.qualified, p_type: tier.type, p_amount: tier.amount });
    if (data === true) {
      granted.push(tier);
      await track("referral_reward_granted", { userId: referrerId, props: { tier: tier.qualified, type: tier.type } });
      await db.from("notifications").upsert(
        { user_id: referrerId, kind: "referral", title: "Récompense de parrainage débloquée", body: `${tier.qualified} filleul${tier.qualified > 1 ? "s" : ""} qualifié${tier.qualified > 1 ? "s" : ""} : ${rewardLabel(tier)}.`, link: "/app/parrainage", dedupe_key: `referral-tier-${tier.qualified}-${tier.type}` },
        { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
      );
    }
  }
  return granted;
}
