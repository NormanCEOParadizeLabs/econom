import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, cleanupProvider, createUser, deleteUser, seedOffer, setPlus, type TestUser } from "../helpers";

let a: TestUser, b: TestUser;
const providers: string[] = [];

beforeAll(async () => {
  [a, b] = await Promise.all([createUser("alice"), createUser("bob")]);
});
afterAll(async () => {
  await Promise.all([deleteUser(a), deleteUser(b)]);
  for (const p of providers) await cleanupProvider(p);
});

describe("création de compte", () => {
  it("crée profil, préférences et abonnement gratuit", async () => {
    const { data: profile } = await a.client.from("profiles").select("*").single();
    expect(profile.id).toBe(a.id);
    expect(profile.referral_code).toMatch(/^[A-Z0-9]{8}$/);
    const { data: sub } = await a.client.from("subscriptions").select("status").single();
    expect(sub!.status).toBe("free");
    expect((await a.client.rpc("my_plan")).data).toBe("free");
  });
});

describe("isolation entre utilisateurs", () => {
  it("un utilisateur ne lit ni ne modifie les données d'un autre", async () => {
    const { data: c } = await a.client.from("user_contracts").insert({ name: "Netflix", category: "streaming", price_cents: 1349 }).select("id").single();
    await admin.from("document_analyses").insert({ user_id: a.id, doc_type: "facture_mobile", extraction: { prix_mensuel: 24.99 }, confidence: "elevee" });
    await admin.from("notifications").insert({ user_id: a.id, kind: "system", title: "Privé" });
    await admin.from("comparison_results").insert({ user_id: a.id, category: "mobile", months: 12, input: {}, results: [] });

    for (const table of ["user_contracts", "document_analyses", "notifications", "comparison_results", "saving_opportunities", "realized_savings", "favorites", "uploaded_documents", "login_history", "usage_quotas"]) {
      const { data } = await b.client.from(table).select("*");
      expect(data, table).toEqual([]);
    }
    expect((await b.client.from("profiles").select("id")).data).toEqual([{ id: b.id }]);
    expect((await b.client.from("subscriptions").select("user_id")).data).toEqual([{ user_id: b.id }]);

    const upd = await b.client.from("user_contracts").update({ name: "piraté" }).eq("id", c!.id).select();
    expect(upd.data).toEqual([]);
    const del = await b.client.from("user_contracts").delete().eq("id", c!.id).select();
    expect(del.data).toEqual([]);
    const forged = await b.client.from("user_contracts").insert({ user_id: a.id, name: "X", category: "autre", price_cents: 100 });
    expect(forged.error).not.toBeNull();
    expect((await a.client.from("user_contracts").select("name").eq("id", c!.id).single()).data!.name).toBe("Netflix");
  });

  it("un visiteur anonyme ne lit aucune donnée privée", async () => {
    for (const table of ["profiles", "subscriptions", "user_contracts", "document_analyses", "notifications", "ai_usage_logs", "audit_logs", "stripe_events", "analytics_events", "admins", "admin_settings", "referrals"]) {
      const { data } = await anon().from(table).select("*").limit(1);
      expect(data ?? [], table).toEqual([]);
    }
  });
});

describe("élévation de privilèges", () => {
  it("impossible de s'attribuer Premium, un rôle admin ou du quota", async () => {
    await b.client.from("subscriptions").update({ status: "active", bonus_until: "2099-01-01" }).eq("user_id", b.id);
    await b.client.from("subscriptions").insert({ user_id: b.id, status: "active" });
    expect((await admin.from("subscriptions").select("status, bonus_until").eq("user_id", b.id).single()).data).toEqual({ status: "free", bonus_until: null });

    expect((await b.client.from("admins").insert({ user_id: b.id })).error).not.toBeNull();
    await b.client.auth.updateUser({ data: { role: "admin", is_admin: true } }); // métadonnées modifiables par l'utilisateur : sans effet
    expect((await b.client.rpc("is_admin")).data).toBe(false);
    expect((await b.client.rpc("admin_metrics")).error).not.toBeNull();

    expect((await b.client.rpc("consume_quota", { p_user: b.id, p_kind: "ai_analysis", p_limit: 9999 })).error).not.toBeNull();
    expect((await b.client.from("usage_quotas").insert({ user_id: b.id, period: "2026-11-01", kind: "ai_analysis", used: 0 })).error).not.toBeNull();
    expect((await b.client.from("profiles").update({ referral_code: "HACKED00" }).eq("id", b.id)).error).not.toBeNull();
    expect((await b.client.from("admin_settings").update({ value: {} }).eq("key", "plan_limits").select()).data ?? []).toEqual([]);
    expect((await b.client.from("offers").update({ monthly_cents: 1 }).neq("monthly_cents", -1).select()).data ?? []).toEqual([]);
    expect((await b.client.from("notifications").insert({ user_id: b.id, kind: "system", title: "x" })).error).not.toBeNull();
  });

  it("un administrateur déclaré dans la table admins obtient les métriques", async () => {
    await admin.from("admins").insert({ user_id: a.id });
    expect((await a.client.rpc("is_admin")).data).toBe(true);
    const { data, error } = await a.client.rpc("admin_metrics");
    expect(error).toBeNull();
    expect(data.users_total).toBeGreaterThanOrEqual(2);
    await admin.from("admins").delete().eq("user_id", a.id);
  });
});

describe("catalogue public", () => {
  it("seules les offres vérifiées, non expirées et hors démonstration sont visibles", async () => {
    const ok = await seedOffer();
    const draft = await seedOffer({ status: "draft", verified_at: null, valid_until: null });
    const expired = await seedOffer({ valid_until: "2020-01-01" });
    const demo = await seedOffer({ is_demo: true });
    providers.push(ok.providerId, draft.providerId, expired.providerId, demo.providerId);
    const { data } = await anon().from("offers").select("id").in("id", [ok.offerId, draft.offerId, expired.offerId, demo.offerId]);
    expect(data).toEqual([{ id: ok.offerId }]);
    await admin.from("offers").update({ monthly_cents: 1099, after_cents: 1099 }).eq("id", ok.offerId);
    const { data: hist } = await admin.from("offer_price_history").select("monthly_cents").eq("offer_id", ok.offerId).order("id");
    expect(hist!.map((h) => h.monthly_cents)).toEqual([999, 1099]);
  });
  it("une offre ne peut pas être « vérifiée » sans date de vérification", async () => {
    const { data: p } = await admin.from("providers").insert({ slug: "t-nodate-" + Date.now(), name: "X" }).select("id").single();
    providers.push(p!.id);
    const { error } = await admin.from("offers").insert({ provider_id: p!.id, category: "mobile", name: "x", monthly_cents: 1, after_cents: 1, url: "https://example.org", status: "verified" });
    expect(error).not.toBeNull();
  });
});

describe("droits Premium appliqués en base", () => {
  it("formule gratuite : un seul abonnement suivi ; Plus : sans limite", async () => {
    const second = await a.client.from("user_contracts").insert({ name: "Spotify", category: "musique", price_cents: 1099 });
    expect(second.error?.message).toContain("PLAN_LIMIT_CONTRACTS");
    await setPlus(a.id);
    expect((await a.client.rpc("my_plan")).data).toBe("plus");
    expect((await a.client.from("user_contracts").insert({ name: "Spotify", category: "musique", price_cents: 1099 })).error).toBeNull();
  });
  it("états d'abonnement → droits", async () => {
    const plus = async () => (await admin.rpc("has_plus", { uid: b.id })).data;
    const set = (patch: Record<string, unknown>) => admin.from("subscriptions").update({ status: "free", current_period_end: null, cancel_at_period_end: false, bonus_until: null, ...patch }).eq("user_id", b.id);
    const future = new Date(Date.now() + 864e5 * 10).toISOString();
    const past = new Date(Date.now() - 864e5 * 10).toISOString();
    await set({});
    expect(await plus()).toBe(false);
    await set({ status: "active", current_period_end: future });
    expect(await plus()).toBe(true);
    await set({ status: "active", current_period_end: future, cancel_at_period_end: true }); // annulé mais encore valide
    expect(await plus()).toBe(true);
    await set({ status: "past_due", current_period_end: future }); // paiement en retard : accès maintenu pendant les relances
    expect(await plus()).toBe(true);
    await set({ status: "active", current_period_end: past }); // période expirée sans renouvellement confirmé
    expect(await plus()).toBe(false);
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
      await set({ status, current_period_end: future });
      expect(await plus(), status).toBe(false);
    }
    await set({ bonus_until: future }); // avantage parrainage
    expect(await plus()).toBe(true);
    await set({ bonus_until: past });
    expect(await plus()).toBe(false);
  });
  it("quota atomique : jamais plus que la limite, même en concurrence", async () => {
    const calls = await Promise.all(Array.from({ length: 10 }, () => admin.rpc("consume_quota", { p_user: b.id, p_kind: "ai_analysis", p_limit: 3 })));
    expect(calls.filter((c) => c.data === true)).toHaveLength(3);
  });
  it("suppression du compte : toutes les données privées disparaissent", async () => {
    const c = await createUser("carol");
    await c.client.from("user_contracts").insert({ name: "Canal+", category: "streaming", price_cents: 2499 });
    await admin.auth.admin.deleteUser(c.id);
    for (const table of ["profiles", "user_contracts", "subscriptions", "user_preferences"]) {
      const col = table === "profiles" ? "id" : "user_id";
      expect((await admin.from(table).select("*").eq(col, c.id)).data, table).toEqual([]);
    }
  });
});
