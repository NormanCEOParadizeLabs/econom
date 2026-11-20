import { Badge, Button, Input, LinkButton, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { dateFr } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { grantPlusDays } from "../actions";
import { ActionForm, SubmitButton } from "../_components/action-form";
import { Empty, LoadError, Mono, smallInput, Table, Td } from "../_components/bits";
import { adminHref, BILLING_STATUSES, nowMs, type SearchParams } from "../_lib/util";

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Profile = { id: string; city: string | null; referral_code: string; created_at: string };
type Sub = { user_id: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean; bonus_until: string | null };

export async function UtilisateursPanel({ sp }: { sp: SearchParams }) {
  await requireAdmin();
  const page = Math.max(1, Math.min(10_000, Number.parseInt(sp.page ?? "1", 10) || 1));
  const q = (sp.q ?? "").trim();
  const db = supabaseAdmin();

  let query = db.from("profiles").select("id, city, referral_code, created_at", { count: "exact" }).order("created_at", { ascending: false });
  let invalidSearch = false;
  if (q) {
    if (UUID.test(q)) query = query.eq("id", q.toLowerCase());
    else {
      const code = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code) query = query.ilike("referral_code", `${code}%`);
      else invalidSearch = true;
    }
  }
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = invalidSearch ? { data: [], error: null, count: 0 } : await query.range(from, from + PAGE_SIZE - 1);
  const profiles = (data ?? []) as Profile[];

  const subs = new Map<string, Sub>();
  if (profiles.length > 0) {
    const { data: subRows } = await db.from("subscriptions")
      .select("user_id, status, current_period_end, cancel_at_period_end, bonus_until").in("user_id", profiles.map((p) => p.id));
    for (const s of (subRows ?? []) as Sub[]) subs.set(s.user_id, s);
  }
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = nowMs();

  return (
    <>
      <PageTitle title="Utilisateurs" subtitle="Les adresses e-mail ne sont pas affichées ici (minimisation des données)." />

      <form method="get" action="/admin" role="search" className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="utilisateurs" />
        <div className="min-w-0 flex-1 sm:max-w-md">
          <label htmlFor="user-q" className="mb-1.5 block text-sm font-bold">Code de parrainage ou identifiant</label>
          <Input id="user-q" name="q" defaultValue={q} placeholder="Ex. ABCD2345 ou identifiant complet (UUID)" maxLength={64} autoComplete="off" />
        </div>
        <Button type="submit">Rechercher</Button>
        {q && <LinkButton href={adminHref({ tab: "utilisateurs" })} variant="ghost">Effacer</LinkButton>}
      </form>

      {error ? (
        <LoadError what="les utilisateurs" />
      ) : profiles.length === 0 ? (
        <Empty>{q ? "Aucun utilisateur ne correspond à cette recherche. L'identifiant doit être complet ; le code de parrainage peut être partiel." : "Aucun utilisateur inscrit pour le moment."}</Empty>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted">{total.toLocaleString("fr-FR")} utilisateur{total > 1 ? "s" : ""} — page {page} sur {pages}</p>
          <Table caption="Liste des utilisateurs" head={["Identifiant", "Inscription", "Ville", "Abonnement", "Fin de période", "Bonus Plus", "Geste commercial"]} minWidth="980px">
            {profiles.map((p) => {
              const s = subs.get(p.id);
              const bonusActive = s?.bonus_until ? new Date(s.bonus_until).getTime() > now : false;
              return (
                <tr key={p.id}>
                  <Td>
                    <Mono title={p.id}>{p.id.slice(0, 8)}…</Mono>
                    <div className="mt-1 text-xs text-muted">Parrainage : <span className="font-mono">{p.referral_code}</span></div>
                  </Td>
                  <Td className="whitespace-nowrap">{dateFr(p.created_at, { day: "2-digit", month: "2-digit", year: "numeric" })}</Td>
                  <Td>{p.city ?? "—"}</Td>
                  <Td>
                    <Badge tone={s?.status === "active" || s?.status === "trialing" ? "positive" : s?.status === "past_due" || s?.status === "unpaid" ? "danger" : "neutral"}>
                      {BILLING_STATUSES[s?.status ?? "free"] ?? s?.status}
                    </Badge>
                    {s?.cancel_at_period_end && <Badge tone="warn" className="ml-1">Résiliation programmée</Badge>}
                  </Td>
                  <Td className="whitespace-nowrap">{dateFr(s?.current_period_end, { day: "2-digit", month: "2-digit", year: "numeric" })}</Td>
                  <Td className="whitespace-nowrap">
                    {s?.bonus_until ? (
                      <>
                        {dateFr(s.bonus_until, { day: "2-digit", month: "2-digit", year: "numeric" })}{" "}
                        <Badge tone={bonusActive ? "positive" : "neutral"}>{bonusActive ? "en cours" : "terminé"}</Badge>
                      </>
                    ) : "—"}
                  </Td>
                  <Td>
                    <details>
                      <summary className="cursor-pointer whitespace-nowrap text-sm font-bold text-brand-strong">Accorder des jours de Plus</summary>
                      <ActionForm action={grantPlusDays} resetOnSuccess className="mt-2 w-64 space-y-2" confirm="Accorder ces jours de Plus à cet utilisateur ? L'action est journalisée.">
                        <input type="hidden" name="user_id" value={p.id} />
                        <div>
                          <label htmlFor={`days-${p.id}`} className="block text-xs font-bold">Nombre de jours (1 à 90)</label>
                          <Input id={`days-${p.id}`} name="days" type="number" min={1} max={90} step={1} required defaultValue={7} className={smallInput} />
                        </div>
                        <div>
                          <label htmlFor={`reason-${p.id}`} className="block text-xs font-bold">Motif (obligatoire, journalisé)</label>
                          <Input id={`reason-${p.id}`} name="reason" required minLength={5} maxLength={300} placeholder="Ex. incident de paiement du 12/11" className={smallInput} />
                        </div>
                        <SubmitButton variant="outline">Accorder (geste commercial)</SubmitButton>
                      </ActionForm>
                    </details>
                  </Td>
                </tr>
              );
            })}
          </Table>
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-2">
            {page > 1 ? <LinkButton href={adminHref({ tab: "utilisateurs", q, page: page - 1 })} variant="outline" size="sm">← Précédent</LinkButton> : <span />}
            {page < pages ? <LinkButton href={adminHref({ tab: "utilisateurs", q, page: page + 1 })} variant="outline" size="sm">Suivant →</LinkButton> : <span />}
          </nav>
        </>
      )}
    </>
  );
}
