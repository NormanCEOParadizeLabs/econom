import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, LinkButton, Notice } from "@/components/ui";
import { IconArrow, IconChat, IconChevron, IconCompare, IconGift, IconPiggy, IconPin, IconRepeat, IconScan, IconStar, IconWifi } from "@/components/icons";
import { getMe } from "@/lib/me";
import { supabaseServer } from "@/lib/supabase/server";
import { monthlyEquivalentCents, type Frequency } from "@/lib/engine";
import { dateFr, euro } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ mdp?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/connexion");
  if (me.profile && !me.profile.onboarding_done) redirect("/app/bienvenue");
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const [{ data: opps }, { data: realized }, { data: contracts }] = await Promise.all([
    supabase.from("saving_opportunities").select("id, title, net_saving_cents, months, status, category").in("status", ["potential", "initiated"]).order("net_saving_cents", { ascending: false }),
    supabase.from("realized_savings").select("monthly_cents"),
    supabase.from("user_contracts").select("id, name, price_cents, frequency, next_charge_date").eq("active", true),
  ]);
  const potential = (opps ?? []).filter((o) => o.net_saving_cents > 0);
  const potentialTotal = potential.reduce((a, o) => a + o.net_saving_cents, 0);
  const confirmedMonthly = (realized ?? []).reduce((a, r) => a + r.monthly_cents, 0);
  const monthlySpend = (contracts ?? []).reduce((a, c) => a + monthlyEquivalentCents(c.price_cents, c.frequency as Frequency), 0);
  const upcoming = (contracts ?? []).filter((c) => c.next_charge_date && c.next_charge_date >= today && c.next_charge_date <= soon).sort((a, b) => a.next_charge_date!.localeCompare(b.next_charge_date!));
  const name = me.profile?.display_name;

  const actions = [
    { href: "/app/scanner", icon: IconScan, label: "Scanner une facture", hint: `${Math.max(0, me.quota.analyses.limit - me.quota.analyses.used)} analyse(s) restante(s) ce mois` },
    { href: "/app/comparer", icon: IconCompare, label: "Comparer mon forfait", hint: "Mobile, 12 ou 24 mois" },
    { href: "/app/comparer?type=internet", icon: IconWifi, label: "Comparer ma box", hint: "Fibre, ADSL, box 4G/5G" },
    { href: "/app/abonnements", icon: IconRepeat, label: "Mes abonnements", hint: contracts?.length ? `${euro(monthlySpend)} par mois` : "Ajoute le premier" },
    { href: "/app/bons-plans", icon: IconPin, label: "Bons plans près de moi", hint: "Offres sourcées et datées" },
    { href: "/app/assistant", icon: IconChat, label: "Demander à l'assistant", hint: "Facture, résiliation, conseils" },
  ];

  return (
    <div className="stagger space-y-5">
      {sp.mdp === "ok" && <Notice tone="success">Ton mot de passe a bien été modifié.</Notice>}
      {me.sub?.status === "past_due" && (
        <Notice tone="warn" title="Paiement en attente">Le dernier paiement de ton abonnement Plus a échoué. <Link href="/app/compte" className="font-bold underline underline-offset-4">Mettre à jour mon moyen de paiement</Link></Notice>
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[1.75rem] font-black leading-tight">Bonjour{name ? ` ${name}` : ""} 👋</h1>
        {me.plan === "plus" ? <Badge tone="accent"><IconStar width={12} height={12} /> Plus</Badge> : <Link href="/app/premium"><Badge tone="neutral">Gratuit</Badge></Link>}
      </div>

      <section aria-labelledby="hero-savings" className="on-hero relative overflow-hidden rounded-[2rem] bg-hero p-6 text-white">
        <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/30 blur-2xl" />
        <h2 id="hero-savings" className="relative text-sm font-bold text-white/80">{potentialTotal > 0 ? "Économies potentielles identifiées" : "Tes économies"}</h2>
        {potentialTotal > 0 ? (
          <>
            <p className="relative mt-2"><span className="num inline-block -rotate-1 rounded-2xl bg-accent px-3 py-1 text-5xl font-black text-on-accent animate-pop">{euro(potentialTotal)}</span></p>
            <p className="relative mt-3 text-sm text-white/85">Estimation sur la période de tes comparaisons, frais inclus. Rien n&apos;est garanti : c&apos;est toi qui décides de changer.</p>
            <LinkButton href="/app/economies" variant="light" size="sm" className="relative mt-4">Voir le détail <IconArrow width={16} height={16} /></LinkButton>
          </>
        ) : (
          <>
            <p className="relative mt-2 font-display text-3xl font-black leading-tight">Trouvons ta première économie.</p>
            <p className="relative mt-2 text-sm text-white/85">Compare ton forfait ou scanne une facture : deux minutes suffisent.</p>
            <LinkButton href="/app/comparer" variant="accent" className="relative mt-4">Comparer mon forfait</LinkButton>
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-bold text-muted">Économies confirmées</p>
          <p className="num mt-1 text-2xl font-black text-positive">{euro(confirmedMonthly)}</p>
          <p className="text-xs text-muted">par mois, déclarées ou constatées</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-muted">Dépenses récurrentes suivies</p>
          <p className="num mt-1 text-2xl font-black">{euro(monthlySpend)}</p>
          <p className="text-xs text-muted">par mois · {contracts?.length ?? 0} abonnement{(contracts?.length ?? 0) > 1 ? "s" : ""}</p>
        </Card>
      </div>

      {upcoming.length > 0 && (
        <Card>
          <h2 className="font-display text-lg font-extrabold">Prochains prélèvements</h2>
          <ul className="mt-2 divide-y divide-line">
            {upcoming.slice(0, 4).map((c) => (
              <li key={c.id}><Link href={`/app/abonnements/${c.id}`} className="flex items-center justify-between gap-3 py-2.5"><span><span className="font-bold">{c.name}</span><span className="block text-xs text-muted">{dateFr(c.next_charge_date, { weekday: "long", day: "numeric", month: "long" })}</span></span><span className="num font-black">{euro(c.price_cents)}</span></Link></li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-label="Actions rapides">
        <ul className="grid gap-3 sm:grid-cols-2">
          {actions.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="pressable flex items-center gap-3 rounded-[1.5rem] border border-line bg-surface p-4 hover:border-brand">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-brand-strong"><a.icon /></span>
                <span className="min-w-0 flex-1"><span className="block font-bold">{a.label}</span><span className="block truncate text-xs text-muted">{a.hint}</span></span>
                <IconChevron width={18} height={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/app/parrainage" className="pressable flex items-center gap-3 rounded-[1.5rem] bg-accent p-4 text-on-accent">
          <IconGift /><span><span className="block font-bold">Invite tes proches</span><span className="text-xs">3 filleuls actifs = 30 jours de Plus offerts</span></span>
        </Link>
        <Link href="/app/economies" className="pressable flex items-center gap-3 rounded-[1.5rem] bg-surface-2 p-4">
          <IconPiggy /><span><span className="block font-bold">Suivre mes économies</span><span className="text-xs text-muted">Potentielles, lancées, confirmées</span></span>
        </Link>
      </div>
    </div>
  );
}
