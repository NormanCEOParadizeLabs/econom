/**
 * Moteur de comparaison ECONOM. — déterministe, sans IA.
 * Tous les montants sont en centimes entiers. Aucune valeur n'est estimée par un modèle.
 */

export type Horizon = 12 | 24;
export type OfferCategory = "mobile" | "internet" | "electricity" | "gas";

export interface CatalogOffer {
  id: string;
  provider: string;
  category: OfferCategory;
  name: string;
  monthlyCents: number;
  introMonths: number;
  afterCents: number;
  commitmentMonths: number;
  activationFeeCents: number;
  simFeeCents: number;
  terminationFeeCents: number;
  dataGb: number | null;
  roamingGb: number | null;
  fiveG: boolean;
  hostNetwork: string | null;
  technology: string | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  hasTv: boolean;
  hasPhone: boolean;
  conditions: string | null;
  promoConditions: string | null;
  url: string;
  isPartner: boolean;
  isDemo: boolean;
  status: "draft" | "verified" | "archived";
  verifiedAt: string | null;
  validUntil: string | null;
  sources?: { url: string; label: string | null; checkedAt: string }[];
}

export interface CurrentPlan {
  monthlyCents: number;
  /** Frais de résiliation de l'offre actuelle (engagement restant, frais fixes de box…). */
  exitFeeCents?: number;
  /** Hausse ou fin de promotion déjà annoncée sur l'offre actuelle. */
  priceChange?: { afterMonths: number; newMonthlyCents: number } | null;
}

export interface Needs {
  minDataGb?: number;
  minRoamingGb?: number;
  require5G?: boolean;
  /** Réseaux acceptés (vide = tous). */
  networks?: string[];
  noCommitmentOnly?: boolean;
  technology?: "fibre" | "adsl" | "box-4g-5g" | "cable" | null;
  minDownloadMbps?: number;
  requireTv?: boolean;
  requirePhone?: boolean;
}

export interface CompareInput {
  category: OfferCategory;
  current: CurrentPlan;
  needs: Needs;
  months: Horizon;
  offers: CatalogOffer[];
  /** Date ISO (AAAA-MM-JJ) ; injectée pour les tests. */
  today?: string;
}

export interface OfferCost {
  recurringCents: number;
  oneTimeCents: number;
  totalCents: number;
  /** Prix facturé chaque mois de la période. */
  schedule: number[];
}

export interface ComparedOffer {
  offer: CatalogOffer;
  months: Horizon;
  currentCostCents: number;
  offerCost: OfferCost;
  exitFeeCents: number;
  /** Coût total du changement = coût de la nouvelle offre + frais de sortie de l'ancienne. */
  switchCostCents: number;
  /** Économie nette = coût du maintien − coût du changement. Peut être négative. */
  netSavingCents: number;
  monthlyEquivalentSavingCents: number;
  isSaving: boolean;
  /** Mois à partir duquel le changement devient rentable (null si jamais sur la période). */
  breakEvenMonth: number | null;
  warnings: string[];
}

export interface ExcludedOffer {
  offerId: string;
  name: string;
  reasons: string[];
}

export interface CompareOutput {
  months: Horizon;
  currentCostCents: number;
  results: ComparedOffer[];
  excluded: ExcludedOffer[];
  rankingCriteria: string;
  computedOn: string;
}

export const RANKING_CRITERIA =
  "Classement par économie nette décroissante sur la période choisie (coût total de ton offre actuelle − coût total du changement, frais inclus), puis par coût total croissant. Les partenariats commerciaux n'influencent pas le classement.";

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

function assertCents(n: unknown, label: string): asserts n is number {
  if (!isInt(n) || n < 0 || n > 100_000_000) throw new Error(`Montant invalide : ${label}`);
}

export function eurosToCents(euros: number): number {
  if (!Number.isFinite(euros) || euros < 0 || euros > 1_000_000) throw new Error("Montant invalide");
  return Math.round(euros * 100);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function assertHorizon(months: number): asserts months is Horizon {
  if (months !== 12 && months !== 24) throw new Error("Horizon non valide (12 ou 24 mois)");
}

/** Prix facturé par une offre au mois `month` (1 = premier mois). */
export function offerPriceAtMonth(offer: Pick<CatalogOffer, "monthlyCents" | "introMonths" | "afterCents">, month: number): number {
  return offer.introMonths > 0 && month > offer.introMonths ? offer.afterCents : offer.monthlyCents;
}

export function offerCost(offer: CatalogOffer, months: Horizon): OfferCost {
  assertHorizon(months);
  assertCents(offer.monthlyCents, "prix mensuel");
  assertCents(offer.afterCents, "prix après promotion");
  assertCents(offer.activationFeeCents, "frais d'activation");
  assertCents(offer.simFeeCents, "carte SIM");
  const schedule: number[] = [];
  for (let m = 1; m <= months; m++) schedule.push(offerPriceAtMonth(offer, m));
  const recurringCents = schedule.reduce((a, b) => a + b, 0);
  const oneTimeCents = offer.activationFeeCents + offer.simFeeCents;
  return { recurringCents, oneTimeCents, totalCents: recurringCents + oneTimeCents, schedule };
}

export function currentSchedule(current: CurrentPlan, months: Horizon): number[] {
  assertCents(current.monthlyCents, "prix actuel");
  const change = current.priceChange;
  if (change) {
    assertCents(change.newMonthlyCents, "prix actuel futur");
    if (!isInt(change.afterMonths) || change.afterMonths < 0 || change.afterMonths > 48) throw new Error("Date de changement de prix invalide");
  }
  const out: number[] = [];
  for (let m = 1; m <= months; m++) out.push(change && m > change.afterMonths ? change.newMonthlyCents : current.monthlyCents);
  return out;
}

export function currentCost(current: CurrentPlan, months: Horizon): number {
  return currentSchedule(current, months).reduce((a, b) => a + b, 0);
}

/** Raisons pour lesquelles une offre ne correspond pas aux besoins (vide = compatible). */
export function incompatibilities(offer: CatalogOffer, needs: Needs, category: OfferCategory, today: string): string[] {
  const r: string[] = [];
  if (offer.category !== category) r.push("Catégorie différente");
  if (offer.status !== "verified") r.push("Offre non vérifiée");
  if (offer.isDemo) r.push("Donnée de démonstration");
  if (!offer.validUntil || offer.validUntil < today) r.push("Vérification expirée");
  if (needs.noCommitmentOnly && offer.commitmentMonths > 0) r.push(`Engagement ${offer.commitmentMonths} mois`);
  if (category === "mobile") {
    if (needs.minDataGb && (offer.dataGb ?? 0) < needs.minDataGb) r.push(`Data insuffisante (${offer.dataGb ?? 0} Go)`);
    if (needs.minRoamingGb && (offer.roamingGb ?? 0) < needs.minRoamingGb) r.push(`Data à l'étranger insuffisante (${offer.roamingGb ?? 0} Go)`);
    if (needs.require5G && !offer.fiveG) r.push("Pas de 5G");
    if (needs.networks?.length && (!offer.hostNetwork || !needs.networks.includes(offer.hostNetwork))) r.push(`Réseau ${offer.hostNetwork ?? "non précisé"}`);
  }
  if (category === "internet") {
    if (needs.technology && offer.technology !== needs.technology) r.push(`Technologie ${offer.technology ?? "non précisée"}`);
    if (needs.minDownloadMbps && (offer.downloadMbps ?? 0) < needs.minDownloadMbps) r.push(`Débit insuffisant (${offer.downloadMbps ?? "?"} Mb/s)`);
    if (needs.requireTv && !offer.hasTv) r.push("Pas de TV incluse");
    if (needs.requirePhone && !offer.hasPhone) r.push("Pas de téléphone fixe");
  }
  return r;
}

function breakEven(currentSched: number[], offerSched: number[], upfront: number): number | null {
  let cur = 0;
  let sw = upfront;
  for (let m = 0; m < currentSched.length; m++) {
    cur += currentSched[m];
    sw += offerSched[m];
    if (cur > sw) return m + 1;
  }
  return null;
}

export function compare(input: CompareInput): CompareOutput {
  const { category, current, needs, months, offers } = input;
  assertHorizon(months);
  if (category !== "mobile" && category !== "internet") {
    throw new Error("Comparaison indisponible pour cette catégorie : données et règles de calcul non validées.");
  }
  const today = input.today ?? todayIso();
  const exitFeeCents = current.exitFeeCents ?? 0;
  assertCents(exitFeeCents, "frais de résiliation");
  const curSched = currentSchedule(current, months);
  const currentCostCents = curSched.reduce((a, b) => a + b, 0);

  const results: ComparedOffer[] = [];
  const excluded: ExcludedOffer[] = [];
  for (const offer of offers) {
    if (offer.category !== category) continue;
    const reasons = incompatibilities(offer, needs, category, today);
    if (reasons.length) {
      // Les offres non publiables ne sont jamais montrées, même comme « exclues ».
      if (offer.status === "verified" && !offer.isDemo && offer.validUntil && offer.validUntil >= today) {
        excluded.push({ offerId: offer.id, name: `${offer.provider} — ${offer.name}`, reasons });
      }
      continue;
    }
    const cost = offerCost(offer, months);
    const switchCostCents = cost.totalCents + exitFeeCents;
    const netSavingCents = currentCostCents - switchCostCents;
    const warnings: string[] = [];
    if (offer.introMonths > 0 && offer.afterCents > offer.monthlyCents) {
      warnings.push(`Le prix passe à ${(offer.afterCents / 100).toFixed(2).replace(".", ",")} €/mois après ${offer.introMonths} mois.`);
    }
    if (offer.commitmentMonths > 0) warnings.push(`Engagement de ${offer.commitmentMonths} mois.`);
    if (category === "internet") warnings.push("Éligibilité à ton adresse non vérifiée par ECONOM. : à tester sur le site de l'opérateur.");
    if (category === "mobile") warnings.push("Couverture réseau à vérifier pour ton adresse.");
    results.push({
      offer,
      months,
      currentCostCents,
      offerCost: cost,
      exitFeeCents,
      switchCostCents,
      netSavingCents,
      monthlyEquivalentSavingCents: Math.round(netSavingCents / months),
      isSaving: netSavingCents > 0,
      breakEvenMonth: breakEven(curSched, cost.schedule, cost.oneTimeCents + exitFeeCents),
      warnings,
    });
  }
  results.sort((a, b) => b.netSavingCents - a.netSavingCents || a.switchCostCents - b.switchCostCents || a.offer.name.localeCompare(b.offer.name));
  return { months, currentCostCents, results, excluded, rankingCriteria: RANKING_CRITERIA, computedOn: today };
}

// ───────────── Abonnements personnels

export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

/** Équivalent mensuel d'un prélèvement récurrent, en centimes. */
export function monthlyEquivalentCents(priceCents: number, frequency: Frequency): number {
  switch (frequency) {
    case "weekly":
      return Math.round((priceCents * 52) / 12);
    case "monthly":
      return priceCents;
    case "quarterly":
      return Math.round(priceCents / 3);
    case "yearly":
      return Math.round(priceCents / 12);
  }
}

export interface ContractLite {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  frequency: Frequency;
}

const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(premium|plus|standard|essentiel|famille|family|duo|basic|pro)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

/** Doublons potentiels : même service saisi deux fois, ou plusieurs services d'une même catégorie « à usage unique ». */
export function findPotentialDuplicates(contracts: ContractLite[]): { ids: string[]; reason: string }[] {
  const out: { ids: string[]; reason: string }[] = [];
  const byName = new Map<string, ContractLite[]>();
  for (const c of contracts) {
    const k = normalizeName(c.name);
    if (!k) continue;
    byName.set(k, [...(byName.get(k) ?? []), c]);
  }
  const flagged = new Set<string>();
  for (const group of byName.values()) {
    if (group.length > 1) {
      out.push({ ids: group.map((c) => c.id), reason: `« ${group[0].name} » apparaît ${group.length} fois` });
      group.forEach((c) => flagged.add(c.id));
    }
  }
  for (const cat of ["musique", "telephone", "internet"]) {
    const group = contracts.filter((c) => c.category === cat && !flagged.has(c.id));
    if (group.length > 1) out.push({ ids: group.map((c) => c.id), reason: `${group.length} abonnements dans la catégorie « ${cat} » : à vérifier` });
  }
  return out;
}

// ───────────── Géographie

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
