import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/plan";

const normalizeEmail = (e: string) => {
  const [local, domain] = e.toLowerCase().split("@");
  return `${(local ?? "").split("+")[0].replace(/\./g, "")}@${domain ?? ""}`;
};

/** Associe un nouveau compte à son parrain. Anti-fraude : pas d'auto-parrainage, un seul parrain, compte récent uniquement. */
export async function claimReferral(userId: string, email: string, code: string): Promise<boolean> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(clean)) return false;
  const db = supabaseAdmin();
  const { data: referrer } = await db.from("profiles").select("id").eq("referral_code", clean).maybeSingle();
  if (!referrer || referrer.id === userId) return false;
  const { data: me } = await db.from("profiles").select("created_at").eq("id", userId).single();
  if (!me || Date.now() - new Date(me.created_at).getTime() > 24 * 3600 * 1000) return false;
  const { data: refUser } = await db.auth.admin.getUserById(referrer.id);
  if (refUser.user?.email && normalizeEmail(refUser.user.email) === normalizeEmail(email)) return false; // alias du même e-mail
  const { error } = await db.from("referrals").insert({ referrer_id: referrer.id, referred_id: userId });
  return !error;
}

/** Un filleul devient « actif » à sa première comparaison enregistrée ou analyse validée ; le parrain est récompensé par paliers. */
export async function qualifyReferral(userId: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: ref } = await db.from("referrals").update({ status: "qualified", qualified_at: new Date().toISOString() }).eq("referred_id", userId).eq("status", "pending").select("referrer_id").maybeSingle();
  if (!ref) return;
  const { data: authUser } = await db.auth.admin.getUserById(userId);
  if (!authUser.user?.email_confirmed_at) {
    await db.from("referrals").update({ status: "pending", qualified_at: null }).eq("referred_id", userId);
    return;
  }
  const rules = await getSetting("referral", { qualified_needed: 3, bonus_days: 30 });
  const { data: qualified } = await db.from("referrals").select("id").eq("referrer_id", ref.referrer_id).eq("status", "qualified").order("qualified_at").limit(rules.qualified_needed);
  if (!qualified || qualified.length < rules.qualified_needed) return;
  const { data: claimed } = await db.from("referrals").update({ status: "rewarded" }).in("id", qualified.map((q) => q.id)).eq("status", "qualified").select("id");
  if (!claimed || claimed.length < rules.qualified_needed) return; // une autre requête a déjà attribué la récompense
  const { data: sub } = await db.from("subscriptions").select("bonus_until").eq("user_id", ref.referrer_id).single();
  const base = Math.max(Date.now(), sub?.bonus_until ? new Date(sub.bonus_until).getTime() : 0);
  const until = new Date(base + rules.bonus_days * 864e5).toISOString();
  await db.from("subscriptions").update({ bonus_until: until }).eq("user_id", ref.referrer_id);
  await db.from("notifications").insert({
    user_id: ref.referrer_id, kind: "referral", title: `${rules.bonus_days} jours d'ECONOM. Plus offerts`,
    body: `${rules.qualified_needed} de tes filleuls sont actifs : tes avantages Plus sont débloqués.`, link: "/app/parrainage", dedupe_key: `referral-reward-${claimed[0].id}`,
  });
}
