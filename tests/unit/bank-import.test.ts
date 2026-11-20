import { describe, expect, it } from "vitest";
import { detectRecurring, normalizeLabel, parseStatement, subscriptionInsights } from "@/lib/bank-import";

const month = (i: number) => `2026-${String(i).padStart(2, "0")}`;
const csv = [
  "Date;Libellé;Débit;Crédit",
  ...[3, 4, 5, 6, 7, 8, 9, 10].flatMap((m) => [
    `05/${String(m).padStart(2, "0")}/2026;PRLV SEPA NETFLIX INTERNATIONAL REF 12AB345;${m >= 9 ? "14,99" : "13,49"};`,
    `12/${String(m).padStart(2, "0")}/2026;PRLV SEPA FREE MOBILE 0612345678;19,99;`,
    `${10 + m}/${String(m).padStart(2, "0")}/2026;CARTE 0${m}/0${m} CARREFOUR CITY PARIS;${20 + m},30;`,
    `28/${String(m).padStart(2, "0")}/2026;VIR SALAIRE ACME;;2 100,00`,
  ]),
  "15/01/2026;PRLV ASSURANCE HABITATION MAIF;212,40;",
  "02/03/2026;CARTE 01/03 FNAC PARIS;59,99;",
].join("\n");

describe("lecture d'un relevé CSV", () => {
  it("colonnes débit / crédit, dates françaises, montants à virgule", () => {
    const txs = parseStatement(csv);
    expect(txs).toHaveLength(34);
    expect(txs[0]).toEqual({ date: month(3) + "-05", label: "PRLV SEPA NETFLIX INTERNATIONAL REF 12AB345", amountCents: -1349 });
    expect(txs.find((t) => t.label.includes("SALAIRE"))!.amountCents).toBe(210000);
  });
  it("montant signé, séparateur virgule, guillemets, BOM", () => {
    const txs = parseStatement('﻿"Date operation","Description","Montant"\n"2026-10-05","SPOTIFY P1A2B3, STOCKHOLM","-10.99"\n"2026-10-06","Remboursement","1,234.50"');
    expect(txs).toEqual([{ date: "2026-10-05", label: "SPOTIFY P1A2B3, STOCKHOLM", amountCents: -1099 }, { date: "2026-10-06", label: "Remboursement", amountCents: 123450 }]);
  });
  it("fichier vide ou illisible : aucune transaction, aucune erreur", () => {
    expect(parseStatement("")).toEqual([]);
    expect(parseStatement("n'importe quoi\nsans structure")).toEqual([]);
  });
  it("normalisation des libellés", () => {
    expect(normalizeLabel("PRLV SEPA SALLE DU COIN REF 99ZX1234 12/05")).toBe("salle coin");
  });
});

describe("détection des abonnements", () => {
  const found = detectRecurring(parseStatement(csv));
  it("repère les prélèvements mensuels, pas les achats ponctuels ni les revenus", () => {
    expect(found.map((c) => c.name).sort()).toEqual(["Free Mobile", "Netflix"]);
  });
  it("prix actuel, hausse détectée, ancienneté et prochain prélèvement", () => {
    const n = found.find((c) => c.name === "Netflix")!;
    expect(n).toMatchObject({ category: "streaming", frequency: "monthly", priceCents: 1499, previousPriceCents: 1349, firstSeen: "2026-03-05", lastSeen: "2026-10-05", occurrences: 8, nextChargeDate: "2026-11-04", confidence: "elevee" });
    expect(n.totalPaidCents).toBe(1349 * 6 + 1499 * 2);
    expect(found.find((c) => c.name === "Free Mobile")).toMatchObject({ category: "telephone", priceCents: 1999, previousPriceCents: null });
  });
  it("courses régulières à montants très variables : ignorées", () => {
    const txs = [1, 2, 3, 4, 5, 6].map((m) => ({ date: `2026-0${m}-10`, label: "CARTE SUPERMARCHE DUPONT", amountCents: -[1200, 8900, 450, 15000, 3000, 700][m - 1] }));
    expect(detectRecurring(txs)).toEqual([]);
  });
  it("abonnement annuel inconnu repéré sur deux occurrences", () => {
    const [c] = detectRecurring([{ date: "2025-02-01", label: "PRLV CLUB ECHECS VILLE", amountCents: -9000 }, { date: "2026-02-02", label: "PRLV CLUB ECHECS VILLE", amountCents: -9000 }]);
    expect(c).toMatchObject({ frequency: "yearly", priceCents: 9000, category: "autre", confidence: "moyenne" });
  });
});

describe("conseils par abonnement", () => {
  it("comparaison, hausse, ancienneté, fin d'engagement — sans montant d'économie inventé", () => {
    const tips = subscriptionInsights([
      { id: "1", name: "Free Mobile", category: "telephone", priceCents: 1999, frequency: "monthly", startedOn: "2024-01-10", previousPriceCents: null, commitmentEnd: "2025-01-01" },
      { id: "2", name: "Netflix", category: "streaming", priceCents: 1499, frequency: "monthly", startedOn: "2025-01-05", previousPriceCents: 1349, commitmentEnd: null },
      { id: "3", name: "Nouveau", category: "streaming", priceCents: 500, frequency: "monthly", startedOn: "2026-10-01", previousPriceCents: null, commitmentEnd: null },
    ], "2026-11-20");
    expect(tips.map((t) => `${t.contractId}:${t.kind}`)).toEqual(["1:compare", "1:commitment_free", "2:price_up", "2:long_running"]);
    expect(tips[0].href).toBe("/app/comparer?fournisseur=Free+Mobile&prix=19.99");
    expect(tips.map((t) => t.detail).join(" ")).not.toMatch(/tu économiseras|garanti/i);
  });
});
