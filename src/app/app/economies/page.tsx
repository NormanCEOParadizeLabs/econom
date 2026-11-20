import type { Metadata } from "next";
import { setOpportunityStatus, deleteRealizedSaving } from "@/app/app/actions";
import { ShareSavingsButton } from "@/components/share-savings-button";
import { shareLinkFor } from "@/lib/share-link";
import { AddSavingForm } from "@/components/small-forms";
import { Badge, Button, Card, EmptyState, LinkButton, Notice, PageTitle } from "@/components/ui";
import { IconPiggy, IconX } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { dateFr, euro } from "@/lib/format";

export const metadata: Metadata = { title: "Mes économies" };

function Step({ id, status, label, variant = "primary" }: { id: string; status: string; label: string; variant?: "primary" | "outline" | "ghost" }) {
  return (
    <form action={setOpportunityStatus}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>{label}</Button>
    </form>
  );
}

export default async function Page() {
  await requireUser();
  const supabase = await supabaseServer();
  const link = await shareLinkFor();
  const [{ data: opps }, { data: realized }] = await Promise.all([
    supabase.from("saving_opportunities").select("id, title, category, months, net_saving_cents, monthly_saving_cents, status, created_at, offers(url)").neq("status", "dismissed").order("created_at", { ascending: false }),
    supabase.from("realized_savings").select("id, label, monthly_cents, kind, started_on").order("created_at", { ascending: false }),
  ]);
  const potential = (opps ?? []).filter((o) => o.status === "potential");
  const initiated = (opps ?? []).filter((o) => o.status === "initiated");
  const confirmed = (realized ?? []).filter((r) => r.kind === "confirmed");
  const observed = (realized ?? []).filter((r) => r.kind === "observed");
  const sum = (rows: { monthly_cents: number }[]) => rows.reduce((a, r) => a + r.monthly_cents, 0);
  const realMonthly = sum(realized ?? []);
  const tiles = [
    { label: "Potentielles", value: euro(potential.reduce((a, o) => a + Math.max(0, o.net_saving_cents), 0)), hint: "estimées, sur la période comparée", tone: "bg-surface-2" },
    { label: "Changement lancé", value: String(initiated.length), hint: "en attente de ta confirmation", tone: "bg-surface-2" },
    { label: "Confirmées par toi", value: `${euro(sum(confirmed))}`, hint: "par mois, déclarées", tone: "bg-accent text-on-accent" },
    { label: "Constatées", value: `${euro(sum(observed))}`, hint: "par mois, vues sur facture", tone: "bg-positive/12" },
  ];
  return (
    <>
      <PageTitle title="Mes économies" subtitle="Quatre cases, pour ne jamais confondre une estimation et un vrai gain." />
      <dl className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-[1.5rem] p-4 ${t.tone}`}>
            <dt className="text-xs font-bold">{t.label}</dt>
            <dd className="num mt-1 text-2xl font-black">{t.value}</dd>
            <dd className="text-xs opacity-80">{t.hint}</dd>
          </div>
        ))}
      </dl>

      {realMonthly > 0 && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-bold">Tu gardes {euro(realMonthly)} de plus chaque mois</p><p className="text-sm text-muted">soit {euro(realMonthly * 12)} par an. Ta carte ne contient que ce montant, aucune donnée personnelle.</p></div>
          <ShareSavingsButton data={{ status: "realized", monthlyCents: realMonthly, yearlyCents: realMonthly * 12, link }} />
        </Card>
      )}

      <h2 className="mb-2 mt-8 font-display text-lg font-extrabold">À saisir</h2>
      {potential.length + initiated.length === 0 ? (
        <EmptyState icon={<IconPiggy />} title="Aucune économie en attente" action={<LinkButton href="/app/comparer">Lancer une comparaison</LinkButton>}>Lance une comparaison : si une offre vérifiée te fait économiser, elle apparaîtra ici.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {[...initiated, ...potential].map((o) => {
            const url = (o.offers as unknown as { url: string } | null)?.url;
            return (
              <Card as="article" key={o.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={o.status === "initiated" ? "brand" : "neutral"}>{o.status === "initiated" ? "Changement lancé" : "Potentielle"}</Badge>
                  <span className="text-xs text-muted">{o.category === "mobile" ? "Forfait mobile" : "Box internet"} · comparée le {dateFr(o.created_at, { day: "numeric", month: "short" })}</span>
                </div>
                <p className="mt-2 font-bold">{o.title}</p>
                <p className="num text-3xl font-black">{euro(o.net_saving_cents)} <span className="text-sm font-bold text-muted">estimés sur {o.months} mois</span></p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === "potential" ? (
                    <>
                      {url && <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="pressable inline-flex min-h-10 items-center rounded-full bg-brand px-4 text-sm font-bold text-on-brand">Voir l&apos;offre</a>}
                      <Step id={o.id} status="initiated" label="J'ai lancé le changement" variant="outline" />
                      {o.net_saving_cents > 0 && <ShareSavingsButton variant="outline" label="Partager" data={{ status: "potential", monthlyCents: o.monthly_saving_cents, yearlyCents: Math.round((o.net_saving_cents / o.months) * 12), link }} />}
                      <Step id={o.id} status="dismissed" label="Pas intéressé" variant="ghost" />
                    </>
                  ) : (
                    <>
                      <Step id={o.id} status="confirmed" label={`Je confirme : ${euro(o.monthly_saving_cents)} de moins par mois`} />
                      <Step id={o.id} status="potential" label="Finalement non" variant="ghost" />
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      <h2 className="mb-2 mt-8 font-display text-lg font-extrabold">Économies réalisées</h2>
      {realized?.length ? (
        <ul className="space-y-2">
          {realized.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-surface p-4">
              <span className="min-w-0 flex-1"><span className="block font-bold">{r.label}</span><span className="text-xs text-muted">Depuis le {dateFr(r.started_on)} · {r.kind === "observed" ? "constatée sur facture" : "déclarée par toi"}</span></span>
              <span className="num font-black text-positive">{euro(r.monthly_cents)}<span className="text-xs">/mois</span></span>
              <form action={deleteRealizedSaving}><input type="hidden" name="id" value={r.id} /><button type="submit" aria-label={`Retirer ${r.label}`} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-2"><IconX width={18} height={18} /></button></form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Rien pour l&apos;instant. Une économie n&apos;apparaît ici que lorsque tu la confirmes ou qu&apos;une nouvelle facture la montre.</p>
      )}
      <Card className="mt-4"><h3 className="mb-3 font-bold">Ajouter une économie que tu as réalisée</h3><AddSavingForm /></Card>
      <Notice className="mt-6">Une économie « potentielle » est une estimation calculée à partir de tes informations et d&apos;offres vérifiées à une date donnée. Elle ne devient « confirmée » que lorsque tu la déclares, et « constatée » lorsqu&apos;une facture plus récente affiche un prix en baisse.</Notice>
    </>
  );
}
