/** Utilitaires partagés de Growth Studio (serveur et client). Aucun import serveur ici. */

export const GROWTH_TABS = [
  { id: "tableau", label: "Tableau de bord" },
  { id: "contenus", label: "Contenus" },
  { id: "createurs", label: "Créateurs" },
  { id: "comptes", label: "Comptes" },
  { id: "hooks", label: "Hooks" },
  { id: "scripts", label: "Scripts" },
  { id: "experiences", label: "Expériences A/B" },
  { id: "recompenses", label: "Récompenses" },
] as const;
export type GrowthTabId = (typeof GROWTH_TABS)[number]["id"];

export const GROWTH_PATH = "/admin/growth";

/** Construit une URL /admin/growth en conservant uniquement les paramètres fournis. */
export function growthHref(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `${GROWTH_PATH}?${s}` : GROWTH_PATH;
}

export const PLATFORMS: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", autre: "Autre" };
export const CREATOR_KINDS: Record<string, string> = { ugc: "UGC", sans_visage: "Sans visage", interne: "Interne", micro_influence: "Micro-influence" };
export const CREATOR_STATUSES: Record<string, string> = { prospect: "Prospect", actif: "Actif", en_pause: "En pause", termine: "Terminé" };
export const HOOK_STATUSES: Record<string, string> = { a_tester: "À tester", teste: "Testé", gagnant: "Gagnant", abandonne: "Abandonné" };
export const CONTENT_STATUSES: Record<string, string> = { brouillon: "Brouillon", publie: "Publié", archive: "Archivé" };
export const EXPERIMENT_STATUSES: Record<string, string> = { draft: "Brouillon", running: "En cours", stopped: "Arrêté" };
export const REWARD_TYPES: Record<string, string> = { bonus_analyses: "Analyses IA supplémentaires", plus_days: "Jours d'ECONOM. Plus", advanced_report: "Rapport d'optimisation avancé" };

export const PERIODS = [7, 30, 90] as const;
export const MAX_TIERS = 6;
export const MAX_VARIANTS = 4;

/** Bornes des règles de parrainage (formulaire et validation serveur). */
export const REWARD_BOUNDS = {
  qualified: [1, 100], bonus_analyses: [1, 50], plus_days: [1, 90],
  max_qualified_per_month: [1, 100], max_same_ip: [1, 10], attribution_days: [1, 90],
} as const;

/** Titre → slug utm_campaign (minuscules, chiffres, tirets ; 3 à 60 caractères). */
export function campaignSlug(title: string): string {
  const s = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "");
  return s.length >= 3 ? s : `contenu-${s || "video"}`;
}

export function attributionLink(appUrl: string, platform: string, campaign: string): string {
  return `${appUrl}/diagnostic?utm_source=${encodeURIComponent(platform)}&utm_campaign=${encodeURIComponent(campaign)}`;
}

export const PAID_REMINDER = "À publier avec la mention \"Collaboration commerciale\"";
