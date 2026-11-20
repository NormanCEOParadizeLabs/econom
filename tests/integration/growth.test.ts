import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AiUnavailableError, setAiClientForTests, type AiClient } from "@/lib/ai/client";
import {
  auditScript, buildFacts, extractEuroAmounts, factsFromOffers, generateGrowthScript, GROWTH_TEMPLATES, GrowthScriptSchema, NO_VERIFIED_OFFER,
  type GrowthFact, type GrowthScript, type OfferLoader,
} from "@/lib/ai/growth";
import { loadPublicOffers } from "@/lib/catalog";
import { compare, offerCost } from "@/lib/engine";
import { admin, cleanupProvider, createUser, deleteUser, seedOffer, type TestUser } from "../helpers";

let user: TestUser;
const providers: string[] = [];
const FIXE = "Forfait Growth fixe 100 Go";
const PROMO = "Forfait Growth promo 80 Go";
const BOX = "Box Growth fibre";
/** Catalogue public réel, restreint aux offres semées ici : d'autres suites peuvent semer les leurs en parallèle. */
const mine: OfferLoader = async (category) => (await loadPublicOffers(category)).filter((o) => [FIXE, PROMO, BOX].includes(o.name));
const facts30 = () => buildFacts("forfait-30", mine);
const usage = { input_tokens: 2000, output_tokens: 900 };
const parseMock = vi.fn();
const mock = { messages: { parse: parseMock, create: vi.fn() } } as unknown as AiClient;

/** Script conforme : ne cite que des montants présents dans les faits. */
function scriptFrom(facts: GrowthFact[], over: Partial<GrowthScript> = {}): GrowthScript {
  const fixe = facts.find((f) => f.texte.includes(FIXE) && f.id.startsWith("offre-"))!;
  return {
    titre: "Tu paies encore 30 € ton forfait ?",
    hook: "Tu paies encore 30 € ton forfait ?",
    variantes_hook: ["30 € par mois pour un forfait ?", "Ton forfait est-il trop cher ?", "Regarde ce que ton forfait te coûte."],
    duree_secondes: 22,
    deroule: [
      { temps: "0-2 s", plan_visuel: "Screencast : écran d'accueil du diagnostic.", voix_off: "Tu paies encore 30 € ton forfait ?", caption: "30 € par mois ? (exemple)" },
      { temps: "2-14 s", plan_visuel: "Screencast : résultat du comparateur.", voix_off: "Exemple : cette offre vérifiée est à 9,99 € par mois.", caption: "9,99€ / mois" },
      { temps: "14-22 s", plan_visuel: "Texte à l'écran.", voix_off: "Économie potentielle : 300,12 euros sur 12 mois dans cet exemple.", caption: "Économie potentielle" },
    ],
    demonstration_app: "Ouvre le diagnostic, saisis le prix d'exemple, affiche le classement.",
    cta: "Fais ton diagnostic gratuit sur ECONOM.",
    variantes_montage: ["Zoom sur le résultat dès la première seconde.", "Écran partagé avant / après."],
    captions_publication: ["Ton forfait mérite deux minutes. Exemple chiffré, offres vérifiées."],
    faits_utilises: [fixe.id, "exemple-mobile-12"],
    mention_partenariat: "",
    format_sans_visage: true,
    ...over,
  };
}

beforeAll(async () => {
  user = await createUser("growth");
  const fixe = await seedOffer({ name: FIXE, monthly_cents: 999, after_cents: 999, url: "https://example.org/fixe" });
  const promo = await seedOffer({ name: PROMO, monthly_cents: 499, intro_months: 12, after_cents: 1599, data_gb: 80, url: "https://example.org/promo" });
  const box = await seedOffer({ category: "internet", name: BOX, monthly_cents: 2499, after_cents: 2499, data_gb: null, roaming_gb: null, five_g: false, technology: "fibre", download_mbps: 1000, url: "https://example.org/box" });
  providers.push(fixe.providerId, promo.providerId, box.providerId);
  const { error } = await admin.from("offer_sources").insert({ offer_id: fixe.offerId, url: "https://example.org/source-fixe", label: "Fiche tarifaire", checked_at: "2026-11-18" });
  if (error) throw new Error(error.message);
});
afterAll(async () => {
  setAiClientForTests(null);
  await admin.from("ai_usage_logs").delete().eq("user_id", user.id);
  await deleteUser(user);
  for (const p of providers) await cleanupProvider(p);
});
beforeEach(() => {
  parseMock.mockReset();
  setAiClientForTests(mock);
});
afterEach(() => setAiClientForTests(null));

const generate = (templateKey = "forfait-30", paid = false) => generateGrowthScript({ templateKey, userId: user.id, paid }, { loadOffers: mine });

describe("faits déterministes", () => {
  it("8 modèles à clé stable, dont un seul sans catalogue", () => {
    expect(GROWTH_TEMPLATES.map((t) => t.key)).toEqual(["forfait-30", "defi-50", "trois-abonnements", "deux-fois-plus-cher", "avant-apres", "bons-plans-ville", "je-teste", "promo-deux-ans"]);
    expect(GROWTH_TEMPLATES.filter((t) => !t.usesCatalog).map((t) => t.key)).toEqual(["bons-plans-ville"]);
  });

  it("les faits de buildFacts correspondent aux calculs du moteur", async () => {
    const facts = await facts30();
    const offers = await mine("mobile");
    expect(offers).toHaveLength(2);
    for (const months of [12, 24] as const) {
      const best = compare({ category: "mobile", current: { monthlyCents: 3000 }, needs: {}, months, offers }).results[0];
      const fact = facts.find((f) => f.id === `exemple-mobile-${months}`)!;
      expect(fact.texte).toContain(best.offer.name);
      expect(fact.texte).toContain("FICTIF");
      expect(fact.montants).toEqual([30, months * 30, best.switchCostCents / 100, best.netSavingCents / 100, best.monthlyEquivalentSavingCents / 100]);
    }
    // Valeurs attendues calculées à la main : 12 mois → promo (12 × 4,99 = 59,88) ; 24 mois → fixe (24 × 9,99 = 239,76).
    expect(facts.find((f) => f.id === "exemple-mobile-12")!.montants).toContain(300.12);
    expect(facts.find((f) => f.id === "exemple-mobile-24")!.montants).toContain(480.24);
    const fixe = facts.find((f) => f.texte.includes(FIXE) && f.id.startsWith("offre-"))!;
    expect(fixe.montants).toEqual([9.99]);
    expect(fixe.texte).toContain("https://example.org/source-fixe");
    expect(fixe.texte).toContain("18/11/2026");
    expect(fixe.sources).toEqual([expect.objectContaining({ url: "https://example.org/source-fixe", checkedAt: "2026-11-18" })]);
    expect(facts.filter((f) => f.id.startsWith("offre-")).length).toBeLessThanOrEqual(6);
  });

  it("promo-deux-ans : coût total sur 24 mois avec et sans promotion, comme le moteur", async () => {
    const facts = await buildFacts("promo-deux-ans", mine);
    const offers = await mine("mobile");
    const promo = offers.find((o) => o.name === PROMO)!;
    const fixe = offers.find((o) => o.name === FIXE)!;
    const total = offerCost(promo, 24).totalCents;
    expect(total).toBe(12 * 499 + 12 * 1599);
    const appel = facts.find((f) => f.id === "promo-prix-appel")!;
    expect(appel.montants).toEqual([4.99, 15.99, (499 * 24) / 100, total / 100, (total - 499 * 24) / 100]);
    const vs = facts.find((f) => f.id === "promo-24")!;
    expect(vs.montants).toEqual([total / 100, offerCost(fixe, 24).totalCents / 100, 9.99, 12]);
    expect(vs.texte).toContain("plus cher sur 24 mois");
  });

  it("catalogue vide : erreur explicite pour un modèle chiffré, pas pour un modèle sans montant", () => {
    expect(() => factsFromOffers("forfait-30", [], [])).toThrow(NO_VERIFIED_OFFER);
    expect(() => factsFromOffers("inconnu", [], [])).toThrow("Modèle de script inconnu");
    expect(factsFromOffers("bons-plans-ville", [], []).flatMap((f) => f.montants)).toEqual([]);
  });

  it("extraction des montants : « 12,99 € », « 30€ », « 17 euros », « 1 200 € »", () => {
    expect(extractEuroAmounts("12,99 € puis 30€, 17 euros et 1 200 €. 10 minutes, 100 Go, 24 mois.")).toEqual([1299, 3000, 1700, 120000]);
  });
});

describe("génération de script", () => {
  it("script conforme : needsReview false, sources citées, appel journalisé", async () => {
    const facts = await facts30();
    parseMock.mockResolvedValue({ parsed_output: scriptFrom(facts), stop_reason: "end_turn", usage });
    const r = await generate();
    expect(r.issues).toEqual([]);
    expect(r.needsReview).toBe(false);
    expect(r.script.format_sans_visage).toBe(true);
    expect(r.sources.map((s) => s.url)).toContain("https://example.org/source-fixe");
    expect(r.sources.every((s) => s.url.startsWith("https://") && s.label.length > 0)).toBe(true);
    expect(r.sources.find((s) => s.url === "https://example.org/source-fixe")!.checkedAt).toBe("2026-11-18");

    const req = parseMock.mock.calls[0][0];
    expect(req.system).toContain("économie potentielle");
    expect(req.system).toContain("SANS VISAGE");
    expect(req.output_config).toMatchObject({ effort: "low" });
    expect(req.output_config.format).toBeDefined();
    expect(req.tools).toBeUndefined();
    expect(req.messages[0].content).toContain("exemple-mobile-12");
    expect(req.messages[0].content).toContain("Collaboration rémunérée : non");
    const { data: log } = await admin.from("ai_usage_logs").select("kind, status, input_tokens").eq("user_id", user.id).order("id", { ascending: false }).limit(1).single();
    expect(log).toMatchObject({ kind: "chat", status: "ok", input_tokens: 2000 });
  });

  it("montant inventé : signalé, needsReview true", async () => {
    const facts = await facts30();
    const bad = scriptFrom(facts);
    bad.deroule[1].voix_off = "Tu peux économiser 480 € par an, voire 17 euros de plus.";
    parseMock.mockResolvedValue({ parsed_output: bad, stop_reason: "end_turn", usage });
    const r = await generate();
    expect(r.needsReview).toBe(true);
    expect(r.issues).toEqual(["Montant absent des faits vérifiés : 480,00 €", "Montant absent des faits vérifiés : 17,00 €"]);
  });

  it("terme « garanti », fait inconnu, pourcentage : signalés", async () => {
    const facts = await facts30();
    parseMock.mockResolvedValue({ parsed_output: scriptFrom(facts, { cta: "Économie garantie, -50 % : fais ton diagnostic.", faits_utilises: ["offre-99"] }), stop_reason: "end_turn", usage });
    const r = await generate();
    expect(r.needsReview).toBe(true);
    expect(r.issues).toContain("Terme interdit : « garanti »");
    expect(r.issues).toContain("Faits cités inconnus : offre-99");
    expect(r.issues.some((i) => i.startsWith("Pourcentage"))).toBe(true);
  });

  it("autres termes interdits et collaboration rémunérée sans mention", async () => {
    const facts = await facts30();
    const s = scriptFrom(facts, { captions_publication: ["Des millions d'utilisateurs, lis les avis clients et ce témoignage."] });
    expect(auditScript(s, facts)).toEqual(["Terme interdit : « témoignage »", "Terme interdit : « avis clients »", "Terme interdit : « millions d'utilisateurs »"]);
    expect(auditScript(scriptFrom(facts), facts, { paid: true })).toEqual(["Mention « Collaboration commerciale » absente alors que la collaboration est rémunérée"]);

    parseMock.mockResolvedValue({ parsed_output: scriptFrom(facts, { mention_partenariat: "Collaboration commerciale" }), stop_reason: "end_turn", usage });
    const r = await generate("forfait-30", true);
    expect(r.needsReview).toBe(false);
    expect(parseMock.mock.calls[0][0].messages[0].content).toContain("Collaboration rémunérée : oui");
  });

  it("catalogue vide : erreur explicite, aucun appel au modèle", async () => {
    await expect(generateGrowthScript({ templateKey: "forfait-30", userId: user.id, paid: false }, { loadOffers: async () => [] })).rejects.toThrow(NO_VERIFIED_OFFER);
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("modèle sans catalogue : tout montant est signalé", async () => {
    const facts = await facts30();
    parseMock.mockResolvedValue({ parsed_output: scriptFrom(facts, { faits_utilises: [] }), stop_reason: "end_turn", usage });
    const r = await generateGrowthScript({ templateKey: "bons-plans-ville", userId: user.id, paid: false }, { loadOffers: async () => [] });
    expect(r.needsReview).toBe(true);
    expect(r.issues).toContain("Montant absent des faits vérifiés : 30,00 €");
    expect(r.sources).toEqual([]);
  });

  it("sortie hors schéma : erreur invalid_output ; refus : erreur refused", async () => {
    const facts = await facts30();
    const good = scriptFrom(facts);
    expect(GrowthScriptSchema.safeParse(good).success).toBe(true);
    for (const bad of [null, { titre: "x" }, { ...good, duree_secondes: 90 }, { ...good, variantes_hook: ["une seule"] }, { ...good, format_sans_visage: "oui" }]) {
      parseMock.mockResolvedValueOnce({ parsed_output: bad, stop_reason: "end_turn", usage });
      const e = await generate().catch((err: unknown) => err);
      expect(e).toBeInstanceOf(AiUnavailableError);
      expect((e as AiUnavailableError).reason).toBe("invalid_output");
    }
    parseMock.mockResolvedValueOnce({ parsed_output: null, stop_reason: "refusal", usage });
    await expect(generate()).rejects.toMatchObject({ reason: "refused" });
    parseMock.mockRejectedValueOnce(new Error("réseau"));
    await expect(generate()).rejects.toMatchObject({ reason: "api_error" });
    const { data: logs } = await admin.from("ai_usage_logs").select("status").eq("user_id", user.id).order("id", { ascending: false }).limit(3);
    expect(logs!.map((l) => l.status)).toEqual(["error", "refused", "invalid_output"]);
  });

  it("IA non configurée : erreur not_configured, sans plantage", async () => {
    setAiClientForTests(null);
    const before = process.env.ANTHROPIC_API_KEY;
    if (before) return; // clé réelle présente : on ne déclenche pas d'appel réseau
    await expect(generate()).rejects.toMatchObject({ reason: "not_configured" });
  });
});
