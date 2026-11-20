import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, EmptyState, LinkButton, Notice, PageTitle } from "@/components/ui";
import { IconChevron, IconDoc } from "@/components/icons";
import { getMe } from "@/lib/me";
import { supabaseServer } from "@/lib/supabase/server";
import { dateFr, euro } from "@/lib/format";

export const metadata: Metadata = { title: "Historique" };
const FREE_HISTORY = 3;
const TYPE: Record<string, string> = { facture_mobile: "Forfait mobile", facture_internet: "Box internet", facture_energie: "Énergie", abonnement: "Abonnement", autre: "Document", illisible: "Document illisible" };

export default async function Page({ searchParams }: { searchParams: Promise<{ validee?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const sp = await searchParams;
  const supabase = await supabaseServer();
  // Historique complet réservé à Plus ; la limite est appliquée ici, côté serveur.
  const limit = me.plan === "plus" ? 100 : FREE_HISTORY;
  const [{ data: analyses, count: aCount }, { data: comparisons, count: cCount }] = await Promise.all([
    supabase.from("document_analyses").select("id, doc_type, extraction, validated_data, validated_at, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(limit),
    supabase.from("comparison_results").select("id, category, months, input, best_net_saving_cents, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(limit),
  ]);
  const hidden = Math.max(0, (aCount ?? 0) - (analyses?.length ?? 0)) + Math.max(0, (cCount ?? 0) - (comparisons?.length ?? 0));
  return (
    <>
      <PageTitle title="Historique" subtitle="Tes factures analysées et tes comparaisons enregistrées." />
      {sp.validee && <Notice tone="success" className="mb-4">Informations confirmées et enregistrées.</Notice>}
      <h2 className="mb-2 font-display text-lg font-extrabold">Factures analysées</h2>
      {analyses?.length ? (
        <ul className="space-y-2">
          {analyses.map((a) => {
            const d = (a.validated_data ?? a.extraction) as { fournisseur?: string | null; prix_mensuel?: number | null };
            return (
              <li key={a.id}>
                <Link href={`/app/analyses/${a.id}`} className="pressable flex items-center gap-3 rounded-[1.25rem] border border-line bg-surface p-4 hover:border-brand">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-brand-strong"><IconDoc /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{d.fournisseur || TYPE[a.doc_type] || "Document"}</span>
                    <span className="block text-xs text-muted">{TYPE[a.doc_type] ?? a.doc_type} · {dateFr(a.created_at)}</span>
                  </span>
                  <span className="text-right">
                    {d.prix_mensuel ? <span className="num block font-black">{euro(Math.round(d.prix_mensuel * 100))}</span> : null}
                    {a.validated_at ? <Badge tone="positive">Confirmée</Badge> : <Badge tone="warn">À confirmer</Badge>}
                  </span>
                  <IconChevron width={18} height={18} className="text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<IconDoc />} title="Aucune facture analysée" action={<LinkButton href="/app/scanner">Scanner une facture</LinkButton>}>Prends ta facture en photo : les montants sont lus pour toi.</EmptyState>
      )}

      <h2 className="mb-2 mt-8 font-display text-lg font-extrabold">Comparaisons enregistrées</h2>
      {comparisons?.length ? (
        <ul className="space-y-2">
          {comparisons.map((c) => {
            const input = c.input as { currentProvider?: string; currentMonthlyEuros?: number };
            return (
              <li key={c.id}>
                <Card className="flex items-center justify-between gap-3 !p-4">
                  <span>
                    <span className="block font-bold">{c.category === "mobile" ? "Forfait mobile" : "Box internet"}{input.currentProvider ? ` · ${input.currentProvider}` : ""}</span>
                    <span className="block text-xs text-muted">{dateFr(c.created_at)} · sur {c.months} mois{input.currentMonthlyEuros ? ` · tu payais ${euro(Math.round(input.currentMonthlyEuros * 100))}/mois` : ""}</span>
                  </span>
                  {c.best_net_saving_cents && c.best_net_saving_cents > 0 ? <Badge tone="accent">{euro(c.best_net_saving_cents)} potentiels</Badge> : <Badge>Pas d&apos;économie</Badge>}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<IconDoc />} title="Aucune comparaison enregistrée" action={<LinkButton href="/app/comparer">Comparer mon forfait</LinkButton>} />
      )}
      {hidden > 0 && (
        <Notice className="mt-6" title={`${hidden} élément${hidden > 1 ? "s" : ""} plus ancien${hidden > 1 ? "s" : ""}`}>
          La formule gratuite affiche tes {FREE_HISTORY} derniers éléments. L&apos;historique complet est inclus dans ECONOM. Plus. Tes données ne sont pas supprimées et restent exportables depuis ton compte.
          <div className="mt-3"><LinkButton href="/app/premium" size="sm">Découvrir Plus</LinkButton></div>
        </Notice>
      )}
    </>
  );
}
