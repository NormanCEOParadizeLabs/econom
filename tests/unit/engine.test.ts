import { describe, expect, it } from "vitest";
import { compare, eurosToCents, findPotentialDuplicates, monthlyEquivalentCents, offerCost, distanceKm, type CatalogOffer } from "@/lib/engine";

const base: CatalogOffer = {
  id: "o1", provider: "Test", category: "mobile", name: "Data 100", monthlyCents: 999, introMonths: 0, afterCents: 999,
  commitmentMonths: 0, activationFeeCents: 0, simFeeCents: 0, terminationFeeCents: 0, dataGb: 100, roamingGb: 30, fiveG: true,
  hostNetwork: "Orange", technology: null, downloadMbps: null, uploadMbps: null, hasTv: false, hasPhone: false, conditions: null,
  promoConditions: null, url: "https://example.org", isPartner: false, isDemo: false, status: "verified", verifiedAt: "2026-11-20", validUntil: "2027-01-01",
};
const today = "2026-11-20";
const run = (offers: CatalogOffer[], over: Partial<Parameters<typeof compare>[0]> = {}) =>
  compare({ category: "mobile", current: { monthlyCents: 2499 }, needs: {}, months: 12, offers, today, ...over });

describe("coût d'une offre", () => {
  it("prix simple sur 12 et 24 mois", () => {
    expect(offerCost(base, 12).totalCents).toBe(999 * 12);
    expect(offerCost(base, 24).totalCents).toBe(999 * 24);
  });
  it("promotion temporaire puis prix qui augmente", () => {
    const o = { ...base, introMonths: 12, afterCents: 1999 };
    expect(offerCost(o, 12).totalCents).toBe(999 * 12);
    expect(offerCost(o, 24).totalCents).toBe(999 * 12 + 1999 * 12);
    expect(offerCost({ ...o, introMonths: 6 }, 12).totalCents).toBe(999 * 6 + 1999 * 6);
  });
  it("frais d'activation et carte SIM comptés une seule fois", () => {
    const c = offerCost({ ...base, activationFeeCents: 4800, simFeeCents: 1000 }, 24);
    expect(c.oneTimeCents).toBe(5800);
    expect(c.totalCents).toBe(999 * 24 + 5800);
  });
  it("rejette un horizon ou un montant invalide", () => {
    // @ts-expect-error horizon invalide
    expect(() => offerCost(base, 18)).toThrow();
    expect(() => offerCost({ ...base, monthlyCents: -1 }, 12)).toThrow();
    expect(() => offerCost({ ...base, monthlyCents: 9.5 }, 12)).toThrow();
  });
});

describe("comparaison", () => {
  it("économie nette = maintien − changement", () => {
    const [r] = run([base]).results;
    expect(r.currentCostCents).toBe(2499 * 12);
    expect(r.netSavingCents).toBe((2499 - 999) * 12);
    expect(r.monthlyEquivalentSavingCents).toBe(1500);
    expect(r.isSaving).toBe(true);
    expect(r.breakEvenMonth).toBe(1);
  });
  it("frais de résiliation de l'offre actuelle déduits", () => {
    const [r] = run([{ ...base, simFeeCents: 1000 }], { current: { monthlyCents: 2499, exitFeeCents: 4000 } }).results;
    expect(r.switchCostCents).toBe(999 * 12 + 1000 + 4000);
    expect(r.netSavingCents).toBe(2499 * 12 - 999 * 12 - 5000);
    expect(r.breakEvenMonth).toBe(4); // 5000 / 1500 → rentable au 4e mois
  });
  it("économie négative : jamais présentée comme un gain", () => {
    const [r] = run([{ ...base, monthlyCents: 2399, afterCents: 2399, activationFeeCents: 5000 }]).results;
    expect(r.netSavingCents).toBe(100 * 12 - 5000);
    expect(r.isSaving).toBe(false);
    expect(r.breakEvenMonth).toBeNull();
  });
  it("offre plus chère après promo : gain sur 12 mois, perte sur 24", () => {
    const o = { ...base, monthlyCents: 999, introMonths: 12, afterCents: 4499 };
    expect(run([o]).results[0].isSaving).toBe(true);
    const r24 = run([o], { months: 24 }).results[0];
    expect(r24.netSavingCents).toBe(2499 * 24 - (999 * 12 + 4499 * 12));
    expect(r24.isSaving).toBe(false);
  });
  it("hausse annoncée du prix actuel prise en compte", () => {
    const r = run([base], { current: { monthlyCents: 1999, priceChange: { afterMonths: 6, newMonthlyCents: 2999 } } });
    expect(r.currentCostCents).toBe(1999 * 6 + 2999 * 6);
  });
  it("offre expirée, non vérifiée ou de démonstration : jamais dans les résultats ni dans les exclusions", () => {
    const out = run([
      { ...base, id: "exp", validUntil: "2026-11-19" },
      { ...base, id: "draft", status: "draft" },
      { ...base, id: "demo", isDemo: true },
      { ...base, id: "nodate", validUntil: null },
    ]);
    expect(out.results).toHaveLength(0);
    expect(out.excluded).toHaveLength(0);
  });
  it("offre valable jusqu'à aujourd'hui inclus", () => {
    expect(run([{ ...base, validUntil: today }]).results).toHaveLength(1);
  });
  it("offre incompatible : exclue avec la raison", () => {
    const out = run([base], { needs: { minDataGb: 150, minRoamingGb: 35, require5G: true, networks: ["SFR"] } });
    expect(out.results).toHaveLength(0);
    expect(out.excluded[0].reasons).toEqual(["Data insuffisante (100 Go)", "Data à l'étranger insuffisante (30 Go)", "Réseau Orange"]);
    expect(run([{ ...base, fiveG: false }], { needs: { require5G: true } }).excluded[0].reasons).toEqual(["Pas de 5G"]);
    expect(run([{ ...base, commitmentMonths: 12 }], { needs: { noCommitmentOnly: true } }).results).toHaveLength(0);
  });
  it("tri par économie nette, sans effet du statut partenaire", () => {
    const out = run([
      { ...base, id: "partner", name: "Partenaire", monthlyCents: 1499, afterCents: 1499, isPartner: true },
      { ...base, id: "cheap", name: "Moins cher", monthlyCents: 799, afterCents: 799 },
      { ...base, id: "mid", name: "Milieu", monthlyCents: 999, afterCents: 999 },
    ]);
    expect(out.results.map((r) => r.offer.id)).toEqual(["cheap", "mid", "partner"]);
  });
  it("box internet : technologie, débit, TV, frais de mise en service", () => {
    const box: CatalogOffer = { ...base, id: "b", category: "internet", dataGb: null, roamingGb: null, technology: "fibre", downloadMbps: 1000, uploadMbps: 500, hasTv: false, monthlyCents: 2499, introMonths: 12, afterCents: 3499, activationFeeCents: 4800 };
    const args = { category: "internet" as const, current: { monthlyCents: 4499, exitFeeCents: 5900 }, months: 24 as const };
    const ok = run([box], { ...args, needs: { technology: "fibre", minDownloadMbps: 500 } });
    expect(ok.results[0].netSavingCents).toBe(4499 * 24 - (2499 * 12 + 3499 * 12 + 4800) - 5900);
    expect(ok.results[0].warnings.join(" ")).toContain("Éligibilité");
    expect(run([box], { ...args, needs: { requireTv: true } }).excluded[0].reasons).toEqual(["Pas de TV incluse"]);
    expect(run([box], { ...args, needs: { minDownloadMbps: 2000 } }).results).toHaveLength(0);
    expect(run([box], { category: "mobile" }).results).toHaveLength(0);
  });
  it("énergie : comparaison refusée tant que non validée", () => {
    expect(() => run([], { category: "electricity" })).toThrow(/indisponible/);
  });
});

describe("utilitaires", () => {
  it("euros → centimes sans erreur d'arrondi", () => {
    expect(eurosToCents(24.99)).toBe(2499);
    expect(eurosToCents(0.1 + 0.2)).toBe(30);
    expect(() => eurosToCents(-1)).toThrow();
    expect(() => eurosToCents(NaN)).toThrow();
  });
  it("équivalent mensuel", () => {
    expect(monthlyEquivalentCents(11988, "yearly")).toBe(999);
    expect(monthlyEquivalentCents(3000, "quarterly")).toBe(1000);
    expect(monthlyEquivalentCents(300, "weekly")).toBe(1300);
  });
  it("doublons potentiels", () => {
    const d = findPotentialDuplicates([
      { id: "1", name: "Spotify Premium", category: "musique", priceCents: 1099, frequency: "monthly" },
      { id: "2", name: "spotify", category: "musique", priceCents: 1099, frequency: "monthly" },
      { id: "3", name: "Netflix", category: "streaming", priceCents: 1349, frequency: "monthly" },
      { id: "4", name: "Deezer", category: "musique", priceCents: 1199, frequency: "monthly" },
    ]);
    expect(d).toHaveLength(1);
    expect(d[0].ids).toEqual(["1", "2"]);
  });
  it("distance Paris–Lyon ≈ 392 km", () => {
    expect(Math.round(distanceKm(48.8566, 2.3522, 45.764, 4.8357))).toBeGreaterThan(385);
    expect(Math.round(distanceKm(48.8566, 2.3522, 45.764, 4.8357))).toBeLessThan(400);
  });
});
