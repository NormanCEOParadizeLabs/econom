import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutPanel, PortalButton } from "@/components/billing-buttons";
import { Badge, Card, Notice, PageTitle } from "@/components/ui";
import { IconCheck, IconStar } from "@/components/icons";
import { configured } from "@/lib/env";
import { getMe } from "@/lib/me";
import { getDisplayPrices } from "@/lib/stripe/prices";
import { dateFr } from "@/lib/format";

export const metadata: Metadata = { title: "ECONOM. Plus" };

export default async function Page({ searchParams }: { searchParams: Promise<{ annule?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const sp = await searchParams;
  const prices = await getDisplayPrices();
  const l = me.limits;
  const rows: [string, string, string][] = [
    ["Comparateur mobile et internet", "Illimité", "Illimité"],
    ["Détail des calculs, sources et liens officiels", "Inclus", "Inclus"],
    ["Analyses de factures par IA", `${l.free_ai_analyses} par mois`, `${l.plus_ai_analyses} par mois`],
    ["Abonnements suivis", `${l.free_contracts}`, "Illimité"],
    ["Rappels avant prélèvement et fin d'engagement", "—", "Inclus"],
    ["Alerte quand une meilleure offre apparaît", "—", "Inclus"],
    ["Historique des analyses et comparaisons", "3 derniers", "Complet"],
    ["Assistant IA", `${l.free_ai_chat} messages/mois`, `${l.plus_ai_chat} messages/mois`],
    ["Bons plans près de moi", "Inclus", "Inclus"],
  ];
  const stripeActive = me.sub && ["active", "trialing", "past_due"].includes(me.sub.status);
  return (
    <>
      <PageTitle title="ECONOM. Plus" subtitle="Plus d'analyses, tous tes abonnements suivis, et des alertes avant chaque échéance." />
      {sp.annule && <Notice className="mb-4">Paiement annulé : rien n&apos;a été prélevé. Tu peux réessayer quand tu veux.</Notice>}
      {me.plan === "plus" ? (
        <Card className="mb-5 !border-2 !border-brand">
          <Badge tone="accent"><IconStar width={12} height={12} /> Plus actif</Badge>
          {stripeActive ? (
            <>
              <p className="mt-2 font-bold">{me.sub!.cancel_at_period_end ? `Ton abonnement s'arrêtera le ${dateFr(me.sub!.current_period_end)}.` : `Prochain renouvellement le ${dateFr(me.sub!.current_period_end)}.`}</p>
              <div className="mt-3"><PortalButton /></div>
            </>
          ) : (
            <p className="mt-2 font-bold">Avantages offerts jusqu&apos;au {dateFr(me.sub?.bonus_until)} grâce au parrainage.</p>
          )}
        </Card>
      ) : null}
      <Card tabIndex={0} role="region" aria-label="Comparaison des formules" className="mb-5 overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <caption className="sr-only">Comparaison des formules Gratuit et Plus</caption>
          <thead><tr className="border-b border-line text-left"><th scope="col" className="p-3 font-bold">Fonctionnalité</th><th scope="col" className="p-3 font-bold">Gratuit</th><th scope="col" className="p-3 font-bold text-brand-strong">Plus</th></tr></thead>
          <tbody>{rows.map(([f, a, b]) => <tr key={f} className="border-b border-line last:border-0"><th scope="row" className="p-3 text-left font-semibold">{f}</th><td className="p-3 text-muted">{a}</td><td className="p-3 font-bold">{b === "Inclus" ? <span className="inline-flex items-center gap-1"><IconCheck width={16} height={16} className="text-positive" />Inclus</span> : b}</td></tr>)}</tbody>
        </table>
      </Card>
      {!stripeActive && <CheckoutPanel monthly={prices.monthly} yearly={prices.yearly} enabled={configured.stripe()} />}
      <p className="mt-6 text-xs text-muted">Tout ce qu&apos;il faut pour changer de forfait — résultats, calculs, sources, liens — reste gratuit. Plus ajoute du confort et de l&apos;automatisation, pas un accès aux informations essentielles.</p>
    </>
  );
}
