import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShareSavingsButton } from "@/components/share-savings-button";
import { Badge, Card, LinkButton, Notice, PageTitle } from "@/components/ui";
import { findPotentialDuplicates, monthlyEquivalentCents, type Frequency } from "@/lib/engine";
import { CONTRACT_CATEGORIES, dateFr, euro } from "@/lib/format";
import { getMe } from "@/lib/me";
import { shareLinkFor } from "@/lib/share-link";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mon mois avec ECONOM." };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const supabase = await supabaseServer();
  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const [{ data: contracts }, { data: opps }, { data: realized }, { count: diagnostics }, { count: analyses }, link] = await Promise.all([
    supabase.from("user_contracts").select("id, name, category, price_cents, frequency, commitment_end, next_charge_date, to_review").eq("active", true),
    supabase.from("saving_opportunities").select("title, net_saving_cents, monthly_saving_cents, months, status").in("status", ["potential", "initiated"]),
    supabase.from("realized_savings").select("label, monthly_cents, kind, started_on"),
    supabase.from("comparison_results").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase.from("document_analyses").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    shareLinkFor(),
  ]);
  const list = contracts ?? [];
  const monthly = (c: (typeof list)[number]) => monthlyEquivalentCents(c.price_cents, c.frequency as Frequency);
  const spend = list.reduce((a, c) => a + monthly(c), 0);
  const potential = (opps ?? []).filter((o) => o.net_saving_cents > 0);
  const potentialMonthly = potential.reduce((a, o) => a + o.monthly_saving_cents, 0);
  const real = realized ?? [];
  const realMonthly = real.reduce((a, r) => a + r.monthly_cents, 0);
  const newThisMonth = real.filter((r) => r.started_on >= monthStart).reduce((a, r) => a + r.monthly_cents, 0);
  const advanced = me.plan === "plus" || Boolean(me.sub?.advanced_report);
  const dups = findPotentialDuplicates(list.map((c) => ({ id: c.id, name: c.name, category: c.category, priceCents: c.price_cents, frequency: c.frequency as Frequency })));
  const in60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const ending = list.filter((c) => c.commitment_end && c.commitment_end >= today && c.commitment_end <= in60);
  const top = [...list].sort((a, b) => monthly(b) - monthly(a)).slice(0, 5);
  return (
    <div className="space-y-5">
      <PageTitle title="Mon mois avec ECONOM." subtitle={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} />
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] bg-accent p-4 text-on-accent"><dt className="text-xs font-bold">Économies réalisées</dt><dd className="num text-3xl font-black">{euro(realMonthly)}</dd><dd className="text-xs">par mois, confirmées ou constatées{newThisMonth > 0 ? ` · dont ${euro(newThisMonth)} ce mois-ci` : ""}</dd></div>
        <div className="rounded-[1.5rem] bg-surface-2 p-4"><dt className="text-xs font-bold">Économies potentielles</dt><dd className="num text-3xl font-black">{euro(potentialMonthly)}</dd><dd className="text-xs text-muted">par mois, estimées, pas encore réalisées</dd></div>
        <div className="rounded-[1.5rem] bg-surface-2 p-4"><dt className="text-xs font-bold">Diagnostics ce mois-ci</dt><dd className="num text-3xl font-black">{(diagnostics ?? 0) + (analyses ?? 0)}</dd><dd className="text-xs text-muted">comparaisons et factures analysées</dd></div>
        <div className="rounded-[1.5rem] bg-surface-2 p-4"><dt className="text-xs font-bold">Dépenses récurrentes suivies</dt><dd className="num text-3xl font-black">{euro(spend)}</dd><dd className="text-xs text-muted">par mois · {list.length} abonnement{list.length > 1 ? "s" : ""}</dd></div>
      </dl>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-bold">Partager mon mois</p><p className="text-sm text-muted">La carte indique clairement s&apos;il s&apos;agit d&apos;économies réalisées ou potentielles.</p></div>
        {realMonthly > 0 ? <ShareSavingsButton label="Mes économies réalisées" data={{ status: "realized", monthlyCents: realMonthly, yearlyCents: realMonthly * 12, link }} />
          : potentialMonthly > 0 ? <ShareSavingsButton label="Mes économies potentielles" data={{ status: "potential", monthlyCents: potentialMonthly, yearlyCents: potentialMonthly * 12, link }} />
          : <LinkButton href="/app/comparer" size="sm">Faire un diagnostic</LinkButton>}
      </Card>

      <h2 className="font-display text-xl font-extrabold">Rapport d&apos;optimisation avancé</h2>
      {advanced ? (
        <div className="space-y-3">
          <Card>
            <h3 className="font-bold">Tes postes les plus coûteux</h3>
            {top.length ? <ol className="mt-2 space-y-2">{top.map((c, i) => <li key={c.id} className="flex items-center gap-3 text-sm"><span className="num grid h-7 w-7 place-items-center rounded-full bg-surface-2 font-black">{i + 1}</span><Link href={`/app/abonnements/${c.id}`} className="flex-1 font-bold underline-offset-4 hover:underline">{c.name}<span className="ml-2 font-normal text-muted">{CONTRACT_CATEGORIES[c.category]}</span></Link><span className="num font-black">{euro(monthly(c) * 12)}<span className="text-xs font-bold text-muted">/an</span></span></li>)}</ol> : <p className="mt-1 text-sm text-muted">Ajoute tes abonnements pour obtenir ce classement.</p>}
          </Card>
          <Card>
            <h3 className="font-bold">Points à vérifier</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {dups.map((d) => <li key={d.ids.join()}><Badge tone="warn">Doublon possible</Badge> {d.reason}.</li>)}
              {list.filter((c) => c.to_review).map((c) => <li key={c.id}><Badge tone="warn">À vérifier</Badge> {c.name} — {euro(monthly(c) * 12)} par an si tu le gardes.</li>)}
              {ending.map((c) => <li key={c.id}><Badge tone="brand">Fin d&apos;engagement</Badge> {c.name} : libre le {dateFr(c.commitment_end)}. Bon moment pour comparer.</li>)}
              {potential.map((o) => <li key={o.title}><Badge tone="accent">Opportunité</Badge> {o.title} : {euro(o.net_saving_cents)} estimés sur {o.months} mois.</li>)}
              {dups.length + ending.length + potential.length + list.filter((c) => c.to_review).length === 0 && <li className="text-muted">Rien à signaler pour l&apos;instant.</li>}
            </ul>
          </Card>
          <p className="text-xs text-muted">Rapport calculé à partir des seules informations que tu as enregistrées. Aucune économie n&apos;est garantie.</p>
        </div>
      ) : (
        <Notice title="Débloque le rapport avancé">
          Classement de tes postes les plus coûteux, doublons, fins d&apos;engagement à venir et opportunités : inclus dans ECONOM. Plus, ou offert en parrainant des proches.
          <div className="mt-3 flex flex-wrap gap-2"><LinkButton href="/app/parrainage" size="sm">Parrainer</LinkButton><LinkButton href="/app/premium" size="sm" variant="outline">Découvrir Plus</LinkButton></div>
        </Notice>
      )}
    </div>
  );
}
