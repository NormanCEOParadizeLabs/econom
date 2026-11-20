/**
 * Détection d'abonnements à partir d'un relevé bancaire exporté (CSV).
 * Traitement déterministe, en mémoire : le relevé n'est ni conservé ni transmis à un tiers.
 */
import type { Frequency } from "@/lib/engine";

export interface Tx {
  date: string; // AAAA-MM-JJ
  label: string;
  amountCents: number; // négatif = débit
}

export interface RecurringCandidate {
  key: string;
  name: string;
  category: string;
  frequency: Frequency;
  priceCents: number;
  previousPriceCents: number | null;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  nextChargeDate: string | null;
  totalPaidCents: number;
  confidence: "elevee" | "moyenne";
}

const KNOWN: [RegExp, string, string][] = [
  [/netflix/, "Netflix", "streaming"], [/disney/, "Disney+", "streaming"], [/canal ?(\+|plus)/, "Canal+", "streaming"], [/prime ?video|amazon prime|amzn prime/, "Amazon Prime", "streaming"],
  [/paramount/, "Paramount+", "streaming"], [/hbo|max\.com/, "HBO Max", "streaming"], [/molotov/, "Molotov", "streaming"], [/crunchyroll/, "Crunchyroll", "streaming"], [/dazn/, "DAZN", "streaming"], [/youtube/, "YouTube Premium", "streaming"],
  [/spotify/, "Spotify", "musique"], [/deezer/, "Deezer", "musique"], [/apple ?music/, "Apple Music", "musique"], [/qobuz/, "Qobuz", "musique"],
  [/free ?mobile/, "Free Mobile", "telephone"], [/b ?& ?you|bouygues ?tel.*mob/, "B&You", "telephone"], [/sosh/, "Sosh", "telephone"], [/red ?by ?sfr|red sfr/, "RED by SFR", "telephone"], [/prixtel/, "Prixtel", "telephone"], [/la poste mobile/, "La Poste Mobile", "telephone"], [/nrj mobile/, "NRJ Mobile", "telephone"], [/lebara/, "Lebara", "telephone"], [/youprice/, "YouPrice", "telephone"],
  [/freebox|free telecom|free haut/, "Freebox", "internet"], [/bbox|bouygues ?telecom/, "Bouygues Telecom", "internet"], [/livebox|orange/, "Orange", "internet"], [/sfr/, "SFR", "internet"],
  [/basic ?fit/, "Basic-Fit", "sport"], [/fitness ?park/, "Fitness Park", "sport"], [/keep ?cool/, "Keepcool", "sport"], [/neoness/, "Neoness", "sport"], [/on ?air/, "On Air", "sport"],
  [/edf/, "EDF", "energie"], [/engie/, "Engie", "energie"], [/total ?energies|totalenergies/, "TotalEnergies", "energie"], [/ekwateur/, "Ekwateur", "energie"], [/octopus/, "Octopus Energy", "energie"], [/eni /, "Eni", "energie"],
  [/icloud|apple\.com\/bill|itunes/, "Apple (iCloud / services)", "logiciels"], [/google ?(one|storage)|google \*/, "Google", "logiciels"], [/microsoft|office ?365/, "Microsoft 365", "logiciels"], [/adobe/, "Adobe", "logiciels"], [/dropbox/, "Dropbox", "logiciels"], [/chatgpt|openai/, "ChatGPT", "logiciels"], [/claude\.ai|anthropic/, "Claude", "logiciels"], [/notion/, "Notion", "logiciels"], [/canva/, "Canva", "logiciels"],
  [/maif|macif|matmut|axa|allianz|groupama|maaf|gmf|direct assurance|assurance/, "Assurance", "assurance"], [/mutuelle|harmonie|mgen|alan /, "Mutuelle", "assurance"],
  [/navigo|ratp|sncf|tcl |tisseo/, "Transport", "services"], [/psn|playstation/, "PlayStation Plus", "services"], [/xbox|game ?pass/, "Xbox Game Pass", "services"], [/nintendo/, "Nintendo Switch Online", "services"],
];

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Libellé normalisé : sans dates, numéros de carte, références ni mots bancaires génériques. */
export function normalizeLabel(label: string): string {
  return stripAccents(label.toLowerCase())
    .replace(/\b(prlv|prelevement|prelevt|sepa|carte|cb|paiement|achat|facture|echeance|mensualite|abonnement|de|du|le|la|ref|rum|ics|id|mandat|numero|n°|fr|paris|france|www|com|sas|sa|sarl)\b/g, " ")
    .replace(/\d{2}[/.-]\d{2}([/.-]\d{2,4})?/g, " ")
    .replace(/[a-z]*\d[a-z0-9]{3,}/g, " ")
    .replace(/[^a-z&+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

function identify(label: string): { key: string; name: string; category: string } {
  const flat = stripAccents(label.toLowerCase());
  for (const [re, name, category] of KNOWN) if (re.test(flat)) return { key: name.toLowerCase(), name, category };
  const norm = normalizeLabel(label);
  return { key: norm, name: norm.replace(/\b\w/g, (c) => c.toUpperCase()) || "Prélèvement", category: "autre" };
}

function parseAmount(raw: string): number | null {
  const s = raw.replace(/\s| |€|eur/gi, "").replace(/^\((.*)\)$/, "-$1");
  if (!/^[-+]?\d[\d.,]*$/.test(s)) return null;
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  const normalized = lastSep >= 0 && s.length - lastSep - 1 <= 2 ? s.slice(0, lastSep).replace(/[.,]/g, "") + "." + s.slice(lastSep + 1) : s.replace(/[.,]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted; }
    else if (c === sep && !quoted) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Lit un export CSV de banque française (séparateur ; , ou tabulation ; colonnes débit/crédit ou montant signé). */
export function parseStatement(text: string): Tx[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = [";", "\t", ","].map((s) => [s, lines.slice(0, 15).reduce((a, l) => a + splitLine(l, s).length, 0)] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows = lines.map((l) => splitLine(l, sep));
  const headerIdx = rows.findIndex((r) => r.some((c) => /date/i.test(c)) && r.some((c) => /libell|label|description|intitul|operation|détail|detail/i.test(c)));
  const header = headerIdx >= 0 ? rows[headerIdx].map((c) => stripAccents(c.toLowerCase())) : [];
  const col = (re: RegExp) => header.findIndex((c) => re.test(c));
  let iDate = col(/^date(?!.*valeur)/);
  const iLabel = header.findIndex((c) => /libell|label|description|intitul|detail|operation/.test(c) && !/date/.test(c));
  const iAmount = col(/^montant|amount|^valeur$/), iDebit = col(/debit/), iCredit = col(/credit/);
  if (iDate < 0) iDate = col(/date/);
  const txs: Tx[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    let date: string | null = null, label = "", amount: number | null = null;
    if (headerIdx >= 0) {
      date = parseDate(r[iDate] ?? "");
      label = r[iLabel] ?? "";
      if (iAmount >= 0) amount = parseAmount(r[iAmount] ?? "");
      if (amount === null && iDebit >= 0 && r[iDebit]) { const d = parseAmount(r[iDebit]); amount = d === null ? null : -Math.abs(d); }
      if (amount === null && iCredit >= 0 && r[iCredit]) { const c = parseAmount(r[iCredit]); amount = c === null ? null : Math.abs(c); }
    } else {
      // Sans en-tête : première date, plus long texte, dernier montant.
      date = r.map(parseDate).find(Boolean) ?? null;
      label = [...r].filter((c) => !parseDate(c) && parseAmount(c) === null).sort((a, b) => b.length - a.length)[0] ?? "";
      amount = [...r].reverse().map(parseAmount).find((a) => a !== null) ?? null;
    }
    if (date && label && amount !== null && amount !== 0) txs.push({ date, label: label.slice(0, 140), amountCents: amount });
  }
  return txs;
}

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const CADENCES: [Frequency, number, number, number][] = [["weekly", 6, 8, 7], ["monthly", 26, 35, 30], ["quarterly", 85, 97, 91], ["yearly", 350, 380, 365]];

/** Repère les débits réguliers : même émetteur, intervalle stable, montant proche. */
export function detectRecurring(txs: Tx[]): RecurringCandidate[] {
  const groups = new Map<string, { name: string; category: string; items: Tx[] }>();
  for (const t of txs) {
    if (t.amountCents >= 0) continue;
    const id = identify(t.label);
    if (!id.key || id.key.length < 3) continue;
    const g = groups.get(id.key) ?? { name: id.name, category: id.category, items: [] };
    g.items.push(t);
    groups.set(id.key, g);
  }
  const out: RecurringCandidate[] = [];
  for (const [key, g] of groups) {
    const items = g.items.sort((a, b) => a.date.localeCompare(b.date));
    if (items.length < 2) continue;
    const gaps = items.slice(1).map((t, i) => days(items[i].date, t.date)).filter((d) => d > 2);
    if (!gaps.length) continue;
    const gap = median(gaps);
    const cadence = CADENCES.find(([, min, max]) => gap >= min && gap <= max);
    if (!cadence) continue;
    const [frequency, min, max, step] = cadence;
    const regular = gaps.filter((d) => d >= min - 4 && d <= max + 4).length / gaps.length;
    const amounts = items.map((t) => Math.abs(t.amountCents));
    const price = amounts.at(-1)!;
    const similar = amounts.filter((a) => Math.abs(a - price) <= Math.max(100, price * 0.12)).length / amounts.length;
    const identical = amounts.filter((a) => a === price).length / amounts.length;
    const known = g.category !== "autre";
    const enough = frequency === "monthly" ? items.length >= (known ? 2 : 3) : items.length >= 2;
    // Émetteur inconnu : on exige un montant strictement stable, pour ne pas confondre des achats réguliers avec un abonnement.
    if (!enough || regular < 0.6 || similar < 0.6 || (!known && identical < 0.8)) continue;
    const previous = [...amounts].reverse().find((a) => a !== price) ?? null;
    out.push({
      key, name: g.name, category: g.category, frequency, priceCents: price,
      previousPriceCents: previous !== null && Math.abs(previous - price) <= price * 0.5 ? previous : null,
      firstSeen: items[0].date, lastSeen: items.at(-1)!.date, occurrences: items.length,
      nextChargeDate: addDays(items.at(-1)!.date, step),
      totalPaidCents: amounts.reduce((a, b) => a + b, 0),
      confidence: known && regular >= 0.8 && items.length >= 3 ? "elevee" : "moyenne",
    });
  }
  return out.sort((a, b) => b.priceCents * (a.frequency === "yearly" ? 12 : 1) - a.priceCents * (b.frequency === "yearly" ? 12 : 1)).slice(0, 60);
}

export interface ContractForInsight {
  id: string; name: string; category: string; priceCents: number; frequency: Frequency;
  startedOn: string | null; previousPriceCents: number | null; commitmentEnd: string | null;
}
export interface Insight {
  contractId: string;
  kind: "compare" | "price_up" | "long_running" | "commitment_free";
  title: string;
  detail: string;
  href?: string;
}

/** Conseils factuels par abonnement : ancienneté, hausse de prix, comparaison possible. Aucune économie chiffrée n'est inventée. */
export function subscriptionInsights(contracts: ContractForInsight[], today = new Date().toISOString().slice(0, 10)): Insight[] {
  const out: Insight[] = [];
  for (const c of contracts) {
    const months = c.startedOn ? Math.max(0, Math.round(days(c.startedOn, today) / 30.4)) : null;
    const monthly = c.frequency === "yearly" ? Math.round(c.priceCents / 12) : c.frequency === "quarterly" ? Math.round(c.priceCents / 3) : c.frequency === "weekly" ? Math.round((c.priceCents * 52) / 12) : c.priceCents;
    const eur = (cts: number) => `${(cts / 100).toFixed(2).replace(".", ",")} €`;
    if (c.category === "telephone" || c.category === "internet") {
      const q = new URLSearchParams({ fournisseur: c.name, prix: (monthly / 100).toFixed(2) });
      if (c.category === "internet") q.set("type", "internet");
      out.push({ contractId: c.id, kind: "compare", title: `Comparer ${c.name}`, detail: `Tu paies ${eur(monthly)} par mois${months !== null && months >= 12 ? ` depuis ${months} mois : les offres ont souvent changé entre-temps` : ""}. Le comparateur calcule si une offre vérifiée te ferait économiser.`, href: `/app/comparer?${q}` });
    }
    if (c.previousPriceCents !== null && c.priceCents > c.previousPriceCents) {
      out.push({ contractId: c.id, kind: "price_up", title: `${c.name} a augmenté`, detail: `Le prélèvement est passé de ${eur(c.previousPriceCents)} à ${eur(c.priceCents)}. Vérifie si une formule moins chère te suffit.` });
    }
    if (months !== null && months >= 12 && ["streaming", "musique", "sport", "logiciels", "services", "autre"].includes(c.category)) {
      out.push({ contractId: c.id, kind: "long_running", title: `${c.name} : ${months} mois d'abonnement`, detail: `Environ ${eur(monthly * months)} versés depuis le début. Si tu l'utilises peu, c'est un bon candidat à la résiliation ou à une pause.` });
    }
    if (c.commitmentEnd && c.commitmentEnd < today) {
      out.push({ contractId: c.id, kind: "commitment_free", title: `${c.name} : plus d'engagement`, detail: "Ta période d'engagement est terminée : tu peux changer ou résilier sans frais d'engagement." });
    }
  }
  return out;
}
