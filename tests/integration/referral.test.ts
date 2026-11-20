import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as openReferralLink } from "@/app/r/[code]/route";
import { consumeQuota, getPlan } from "@/lib/plan";
import { runComparison } from "@/lib/services/comparison";
import { claimReferral, grantDueRewards, qualifyReferral } from "@/lib/services/referral";
import { admin, cleanupProvider, createUser, deleteUser, seedOffer, type TestUser } from "../helpers";

const users: TestUser[] = [];
const mk = async (label: string, opts?: { email?: string; confirm?: boolean }) => {
  const u = await createUser(label, opts);
  users.push(u);
  return u;
};
let sponsor: TestUser, code: string, providerId: string;
const sub = async (id: string) => (await admin.from("subscriptions").select("*").eq("user_id", id).single()).data!;
const referral = async (id: string) => (await admin.from("referrals").select("status, rejected_reason").eq("referred_id", id).maybeSingle()).data;
const rewards = async (id: string) => (await admin.from("referral_rewards").select("tier, reward_type, amount").eq("user_id", id).order("tier")).data!;
const events = async (name: string, userId: string) => (await admin.from("analytics_events").select("id", { count: "exact", head: true }).eq("name", name).eq("user_id", userId)).count ?? 0;
/** Crée un filleul légitime, le rattache et le qualifie. */
async function qualifiedReferee(i: number, ip = `10.0.0.${i}`) {
  const u = await mk(`filleul${i}`);
  expect(await claimReferral(u.id, u.email, code, ip)).toBe("claimed");
  expect(await qualifyReferral(u.id)).toBe("qualified");
  return u;
}

beforeAll(async () => {
  sponsor = await mk("parrain", { email: `parrain.test.${Date.now()}@test.econom.local` });
  code = (await admin.from("profiles").select("referral_code").eq("id", sponsor.id).single()).data!.referral_code;
  ({ providerId } = await seedOffer({ name: "Forfait parrainage 100 Go", monthly_cents: 899, after_cents: 899 }));
});
afterAll(async () => {
  await Promise.all(users.map(deleteUser));
  await cleanupProvider(providerId);
});

describe("lien de parrainage /r/CODE", () => {
  const open = (c: string, ua = "Mozilla/5.0 (iPhone)") => openReferralLink(new NextRequest(`http://localhost:3000/r/${c}`, { headers: { "user-agent": ua, "x-forwarded-for": "203.0.113.9" } }), { params: Promise.resolve({ code: c }) });
  it("mémorise le parrain dans un cookie httpOnly et ouvre la page d'invitation", async () => {
    const res = await open(code.toLowerCase());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/invitation");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`econom_ref=${code}`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });
  it("code inconnu ou mal formé : redirection sans attribution", async () => {
    for (const bad of ["ZZZZZZZZ", "abc", "<script>"]) {
      const res = await open(bad);
      expect(res.status).toBe(307);
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });
  it("les robots d'aperçu (WhatsApp, etc.) ne comptent pas comme une ouverture", async () => {
    const count = async () => (await admin.from("analytics_events").select("id", { count: "exact", head: true }).eq("name", "referral_link_opened")).count ?? 0;
    const before = await count();
    await open(code, "WhatsApp/2.23 A");
    expect(await count()).toBe(before);
    await open(code);
    expect(await count()).toBe(before + 1);
  });
});

describe("attribution", () => {
  it("refuse l'auto-parrainage, y compris par alias d'e-mail", async () => {
    expect(await claimReferral(sponsor.id, sponsor.email, code)).toBe("self");
    const [local, domain] = sponsor.email.split("@");
    const alias = await mk("alias", { email: `${local.replace(/\./g, "")}+bis@${domain}` });
    expect(await claimReferral(alias.id, alias.email, code)).toBe("self");
    expect(await referral(alias.id)).toBeNull();
  });
  it("refuse un code invalide, un second parrain et un compte ancien", async () => {
    const u = await mk("nouveau");
    expect(await claimReferral(u.id, u.email, "NOPE0000")).toBe("invalid_code");
    expect(await claimReferral(u.id, u.email, code)).toBe("claimed");
    expect(await claimReferral(u.id, u.email, code)).toBe("already");
    const old = await mk("ancien");
    await admin.from("profiles").update({ created_at: new Date(Date.now() - 3 * 864e5).toISOString() }).eq("id", old.id);
    expect(await claimReferral(old.id, old.email, code)).toBe("too_late");
  });
});

describe("qualification et récompenses", () => {
  it("un filleul sans e-mail confirmé ou sans rattachement n'est pas qualifié", async () => {
    const unconfirmed = await mk("nonconfirme", { confirm: false });
    await claimReferral(unconfirmed.id, unconfirmed.email, code, "10.1.0.1");
    expect(await qualifyReferral(unconfirmed.id)).toBe("pending");
    expect((await referral(unconfirmed.id))!.status).toBe("pending");
    const stranger = await mk("sansparrain");
    expect(await qualifyReferral(stranger.id)).toBe("none");
  });
  it("adresse e-mail jetable : parrainage refusé", async () => {
    const u = await mk("jetable", { email: `spam-${Date.now()}@yopmail.com` });
    await claimReferral(u.id, u.email, code, "10.2.0.1");
    expect(await qualifyReferral(u.id)).toBe("rejected");
    expect(await referral(u.id)).toEqual({ status: "rejected", rejected_reason: "adresse e-mail jetable" });
  });

  it("boucle complète : diagnostic du filleul → qualification → 1er palier (3 analyses bonus)", async () => {
    await admin.from("referral_rewards").delete().eq("user_id", sponsor.id);
    const friend = await mk("ami");
    expect(await claimReferral(friend.id, friend.email, code, "10.0.0.1")).toBe("claimed");
    expect((await referral(friend.id))!.status).toBe("pending");
    // Le filleul termine un vrai diagnostic : la qualification découle du moteur de comparaison, pas d'un clic.
    const out = await runComparison({ category: "mobile", months: 12, currentMonthlyEuros: 29.99, exitFeeEuros: 0, priceChange: null, needs: { minDataGb: 50 }, save: true }, friend.id);
    expect(out.best).not.toBeNull();
    expect(out.best!.net12Cents).toBeGreaterThanOrEqual((2999 - 899) * 12 - 1);
    expect((await referral(friend.id))!.status).toBe("qualified");
    expect(await rewards(sponsor.id)).toEqual([{ tier: 1, reward_type: "bonus_analyses", amount: 3 }]);
    expect((await sub(sponsor.id)).bonus_analyses).toBe(3);
    expect(await events("referral_qualified", sponsor.id)).toBe(1);
    expect(await events("referral_reward_granted", sponsor.id)).toBe(1);
    const { data: notif } = await admin.from("notifications").select("title").eq("user_id", sponsor.id).eq("kind", "referral");
    expect(notif).toHaveLength(1);
  });

  it("une comparaison sans aucune offre compatible ne qualifie pas", async () => {
    const u = await mk("sansresultat");
    await claimReferral(u.id, u.email, code, "10.3.0.1");
    await runComparison({ category: "mobile", months: 12, currentMonthlyEuros: 20, exitFeeEuros: 0, priceChange: null, needs: { minDataGb: 9999 }, save: true }, u.id);
    expect((await referral(u.id))!.status).toBe("pending");
  });

  it("jamais de double récompense : appels répétés et concurrents", async () => {
    const before = await sub(sponsor.id);
    const friend = (await admin.from("referrals").select("referred_id").eq("referrer_id", sponsor.id).eq("status", "qualified").limit(1).single()).data!;
    expect(await qualifyReferral(friend.referred_id)).toBe("none");
    await Promise.all([grantDueRewards(sponsor.id), grantDueRewards(sponsor.id), grantDueRewards(sponsor.id)]);
    expect(await rewards(sponsor.id)).toHaveLength(1);
    expect((await sub(sponsor.id)).bonus_analyses).toBe(before.bonus_analyses);
    const racer = await mk("course");
    await claimReferral(racer.id, racer.email, code, "10.0.0.2");
    const results = await Promise.all(Array.from({ length: 5 }, () => qualifyReferral(racer.id)));
    expect(results.filter((r) => r === "qualified")).toHaveLength(1);
  });

  it("3 filleuls : 7 jours de Plus offerts, sans abonnement payant ni client Stripe", async () => {
    await qualifiedReferee(3);
    const s = await sub(sponsor.id);
    expect(await rewards(sponsor.id)).toEqual([{ tier: 1, reward_type: "bonus_analyses", amount: 3 }, { tier: 3, reward_type: "plus_days", amount: 7 }]);
    expect(await getPlan(sponsor.id)).toBe("plus");
    expect(s).toMatchObject({ status: "free", stripe_customer_id: null, stripe_subscription_id: null, price_id: null });
    const days = (new Date(s.bonus_until).getTime() - Date.now()) / 864e5;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it("5 filleuls : rapport d'optimisation avancé débloqué", async () => {
    await qualifiedReferee(4);
    await qualifiedReferee(5);
    expect((await rewards(sponsor.id)).map((r) => r.reward_type)).toEqual(["bonus_analyses", "plus_days", "advanced_report"]);
    expect((await sub(sponsor.id)).advanced_report).toBe(true);
  });

  it("comptes multiples depuis la même origine : refusés au-delà du seuil", async () => {
    const farm = await mk("fermier");
    const farmCode = (await admin.from("profiles").select("referral_code").eq("id", farm.id).single()).data!.referral_code;
    const outcomes: string[] = [];
    for (let i = 0; i < 4; i++) {
      const u = await mk(`clone${i}`);
      await claimReferral(u.id, u.email, farmCode, "198.51.100.7");
      outcomes.push(await qualifyReferral(u.id));
    }
    expect(outcomes).toEqual(["qualified", "qualified", "rejected", "rejected"]);
    expect(await rewards(farm.id)).toEqual([{ tier: 1, reward_type: "bonus_analyses", amount: 3 }]);
    const { data: stored } = await admin.from("referrals").select("ip_hash").eq("referrer_id", farm.id).limit(1).single();
    expect(stored!.ip_hash).toMatch(/^[0-9a-f]{32}$/); // empreinte, jamais l'adresse IP
    expect(stored!.ip_hash).not.toContain("198.51");
  });

  it("plafond mensuel du parrain : le filleul reste en attente, sans récompense", async () => {
    const { data: s } = await admin.from("admin_settings").select("value").eq("key", "referral_rewards").single();
    await admin.from("admin_settings").update({ value: { ...s!.value, max_qualified_per_month: 1 } }).eq("key", "referral_rewards");
    try {
      const u = await mk("auplafond");
      await claimReferral(u.id, u.email, code, "10.9.0.1");
      expect(await qualifyReferral(u.id)).toBe("pending");
    } finally {
      await admin.from("admin_settings").update({ value: s!.value }).eq("key", "referral_rewards");
    }
  });

  it("les paliers sont configurables depuis l'administration", async () => {
    const { data: s } = await admin.from("admin_settings").select("value").eq("key", "referral_rewards").single();
    await admin.from("admin_settings").update({ value: { ...s!.value, tiers: [{ qualified: 1, type: "plus_days", amount: 2 }] } }).eq("key", "referral_rewards");
    try {
      const other = await mk("parrain2");
      const otherCode = (await admin.from("profiles").select("referral_code").eq("id", other.id).single()).data!.referral_code;
      const u = await mk("filleulconfig");
      await claimReferral(u.id, u.email, otherCode, "10.8.0.1");
      await qualifyReferral(u.id);
      expect(await rewards(other.id)).toEqual([{ tier: 1, reward_type: "plus_days", amount: 2 }]);
    } finally {
      await admin.from("admin_settings").update({ value: s!.value }).eq("key", "referral_rewards");
    }
  });

  it("les analyses bonus sont utilisées une fois le quota mensuel épuisé", async () => {
    const u = await mk("bonus");
    await admin.from("subscriptions").update({ bonus_analyses: 2 }).eq("user_id", u.id);
    const sources = [];
    for (let i = 0; i < 6; i++) { const q = await consumeQuota(u.id, "ai_analysis"); sources.push(q.ok ? q.source : "refus"); }
    expect(sources).toEqual(["monthly", "monthly", "monthly", "bonus", "bonus", "refus"]);
    expect((await sub(u.id)).bonus_analyses).toBe(0);
  });

  it("un utilisateur ne peut pas s'attribuer de récompense ni modifier un parrainage", async () => {
    const u = await mk("tricheur");
    expect((await u.client.from("referral_rewards").insert({ user_id: u.id, tier: 1, reward_type: "plus_days", amount: 365 })).error).not.toBeNull();
    expect((await u.client.rpc("grant_referral_reward", { p_user: u.id, p_tier: 1, p_type: "plus_days", p_amount: 365 })).error).not.toBeNull();
    expect((await u.client.rpc("consume_bonus_analysis", { p_user: u.id })).error).not.toBeNull();
    await u.client.from("subscriptions").update({ bonus_analyses: 99, advanced_report: true }).eq("user_id", u.id);
    expect(await sub(u.id)).toMatchObject({ bonus_analyses: 0, advanced_report: false });
    expect((await u.client.from("referrals").insert({ referrer_id: u.id, referred_id: sponsor.id, status: "qualified" })).error).not.toBeNull();
    expect((await u.client.from("referral_rewards").select("*")).data).toEqual([]);
  });
});
