export function euro(cents: number, opts: { sign?: boolean; decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? true;
  const v = (Math.abs(cents) / 100).toLocaleString("fr-FR", { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 });
  const sign = cents < 0 ? "−" : opts.sign ? "+" : "";
  return `${sign}${v} €`;
}

export function dateFr(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...opts });
}

export const FREQ_LABEL: Record<string, string> = { weekly: "par semaine", monthly: "par mois", quarterly: "par trimestre", yearly: "par an" };

export const CONTRACT_CATEGORIES: Record<string, string> = {
  telephone: "Téléphone", internet: "Internet", streaming: "Streaming", musique: "Musique", sport: "Sport",
  logiciels: "Logiciels", services: "Services", energie: "Énergie", assurance: "Assurance", autre: "Autre",
};

export const DEAL_CATEGORIES: Record<string, string> = {
  alimentation: "Alimentation", restaurants: "Restaurants", shopping: "Shopping", loisirs: "Loisirs", activites: "Activités",
  services: "Services", beaute: "Beauté", sport: "Sport", etudiants: "Offres étudiantes", promotions: "Promotions locales",
};
