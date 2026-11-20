/** Utilitaires partagés (serveur et client) de l'administration. Aucun import serveur ici. */

export type ActionState = { ok: boolean; message?: string; errors?: string[]; at?: number };
export const initialState: ActionState = { ok: false };

export type SearchParams = Record<string, string | undefined>;

/** Date du jour (AAAA-MM-JJ) à Paris. */
export function todayParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Horodatage courant (hors rendu : à appeler dans le chargement de données). */
export const nowMs = (): number => new Date().getTime();

export const nf = (n: unknown): string => Number(n ?? 0).toLocaleString("fr-FR");

export const usdFromMicro = (micro: unknown): string =>
  (Number(micro ?? 0) / 1e6).toLocaleString("fr-FR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });

export const pct = (part: number, total: number): string =>
  total > 0 ? `${((part / total) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : "—";

export const shortId = (id: string | null | undefined): string => (id ? `${id.slice(0, 8)}…` : "—");

export const dateTimeFr = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** Centimes → valeur de champ en euros (« 19.99 »). */
export const eurosInput = (cents: number | null | undefined): string => (cents == null ? "" : (cents / 100).toFixed(2));

export const TABS = [
  { id: "apercu", label: "Aperçu" },
  { id: "utilisateurs", label: "Utilisateurs" },
  { id: "offres", label: "Offres" },
  { id: "bons-plans", label: "Bons plans" },
  { id: "ia", label: "IA" },
  { id: "business", label: "Business" },
  { id: "securite", label: "Sécurité" },
  { id: "parametres", label: "Paramètres" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

export const OFFER_CATEGORIES: Record<string, string> = { mobile: "Mobile", internet: "Internet", electricity: "Électricité", gas: "Gaz" };
export const OFFER_STATUSES: Record<string, string> = { draft: "Brouillon", verified: "Vérifiée", archived: "Archivée" };
export const DEAL_STATUSES: Record<string, string> = { submitted: "En attente", verified: "Vérifié", rejected: "Refusé", archived: "Archivé" };
export const BILLING_STATUSES: Record<string, string> = {
  free: "Gratuit", trialing: "Essai", active: "Actif", past_due: "Paiement en retard", unpaid: "Impayé", canceled: "Résilié",
  incomplete: "Incomplet", incomplete_expired: "Incomplet expiré", paused: "En pause",
};
export const HOST_NETWORKS = ["Orange", "SFR", "Bouygues Telecom", "Free"] as const;
export const TECHNOLOGIES: Record<string, string> = { fibre: "Fibre", adsl: "ADSL", "box-4g-5g": "Box 4G/5G", cable: "Câble" };

/** Durée maximale de validité d'une vérification d'offre. */
export const OFFER_MAX_VALIDITY_DAYS = 45;
export const DEAL_DEFAULT_RECHECK_DAYS = 30;
export const DEAL_MAX_RECHECK_DAYS = 180;

/** Construit une URL /admin en conservant uniquement les paramètres fournis. */
export function adminHref(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `/admin?${s}` : "/admin";
}
