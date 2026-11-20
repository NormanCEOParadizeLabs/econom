import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { DeleteAccount } from "@/components/account-danger";
import { MORE as MORE_LINKS } from "@/components/nav-links";
import { PortalButton } from "@/components/billing-buttons";
import { ProfileForm } from "@/components/small-forms";
import { Badge, Button, Card, LinkButton, Notice, PageTitle } from "@/components/ui";
import { IconChevron, IconShield, IconStar } from "@/components/icons";
import { isAdmin } from "@/lib/auth";
import { dateFr } from "@/lib/format";
import { getMe } from "@/lib/me";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mon compte" };

const STATUS: Record<string, string> = { free: "Gratuit", active: "Plus — actif", trialing: "Plus — période d'essai", past_due: "Plus — paiement en retard", unpaid: "Impayé — avantages suspendus", canceled: "Résilié", incomplete: "Paiement non finalisé", incomplete_expired: "Paiement expiré", paused: "En pause" };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const supabase = await supabaseServer();
  const [{ data: logins }, admin] = await Promise.all([supabase.from("login_history").select("created_at, device").order("created_at", { ascending: false }).limit(5), isAdmin()]);
  const sub = me.sub;
  const stripeActive = sub && ["active", "trialing", "past_due"].includes(sub.status);
  const bonus = sub?.bonus_until && new Date(sub.bonus_until) > new Date();
  return (
    <div className="space-y-5">
      <PageTitle title="Mon compte" subtitle={me.user.email} />

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold">Ma formule</h2>
          {me.plan === "plus" ? <Badge tone="accent"><IconStar width={12} height={12} /> Plus</Badge> : <Badge>Gratuit</Badge>}
        </div>
        <p className="mt-1 font-bold">{STATUS[sub?.status ?? "free"]}{sub?.billing_interval && stripeActive ? ` · ${sub.billing_interval === "year" ? "annuel" : "mensuel"}` : ""}</p>
        {stripeActive && sub.current_period_end && <p className="text-sm text-muted">{sub.cancel_at_period_end ? `Résiliation programmée : tes avantages restent actifs jusqu'au ${dateFr(sub.current_period_end)}.` : `Prochain renouvellement le ${dateFr(sub.current_period_end)}.`}</p>}
        {bonus && <p className="text-sm text-muted">Avantages Plus offerts jusqu&apos;au {dateFr(sub!.bonus_until)} (parrainage).</p>}
        {sub?.status === "past_due" && <Notice tone="warn" className="mt-3">Le dernier paiement a échoué. Mets à jour ton moyen de paiement pour conserver tes avantages.</Notice>}
        <div className="mt-4 space-y-2">
          {sub?.stripe_customer_id ? <PortalButton label={stripeActive ? "Gérer mon abonnement, mes factures, résilier" : "Voir mes factures"} /> : null}
          {!stripeActive && <LinkButton href="/app/premium" full variant={sub?.stripe_customer_id ? "ghost" : "primary"}>Découvrir ECONOM. Plus</LinkButton>}
        </div>
        {stripeActive && <p className="mt-2 text-xs text-muted">La résiliation se fait en ligne, en quelques clics, depuis le portail sécurisé Stripe. Elle prend effet à la fin de la période déjà payée.</p>}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs font-bold text-muted">Analyses ce mois</dt><dd className="num text-xl font-black">{me.quota.analyses.used} / {me.quota.analyses.limit}</dd></div>
          <div className="rounded-2xl bg-surface-2 p-3"><dt className="text-xs font-bold text-muted">Messages assistant</dt><dd className="num text-xl font-black">{me.quota.chat.used} / {me.quota.chat.limit}</dd></div>
        </dl>
      </Card>

      <nav aria-label="Autres rubriques" className="lg:hidden">
        <ul className="overflow-hidden rounded-[1.5rem] border border-line bg-surface divide-y divide-line">
          {[...MORE_LINKS, ...(admin ? [{ href: "/admin", label: "Administration", icon: IconShield }] : [])].map((l) => (
            <li key={l.href}><Link href={l.href} className="flex items-center gap-3 px-4 py-3.5 font-bold hover:bg-surface-2"><l.icon width={20} height={20} className="text-brand-strong" /><span className="flex-1">{l.label}</span><IconChevron width={18} height={18} className="text-muted" /></Link></li>
          ))}
        </ul>
      </nav>

      <Card><h2 className="mb-3 font-display text-lg font-extrabold">Mon profil</h2><ProfileForm profile={{ display_name: me.profile?.display_name ?? null, city: me.profile?.city ?? null, postal_code: me.profile?.postal_code ?? null }} /></Card>

      <Card>
        <h2 className="font-display text-lg font-extrabold">Sécurité</h2>
        <p className="mt-1 text-sm text-muted">Dernières connexions</p>
        <ul className="mt-1 text-sm">{(logins ?? []).map((l, i) => <li key={i} className="flex justify-between py-1"><span>{l.device ?? "Appareil"}</span><span className="text-muted">{dateFr(l.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></li>)}{!logins?.length && <li className="text-muted">Aucune connexion enregistrée.</li>}</ul>
        <div className="mt-3 flex flex-wrap gap-2"><LinkButton href="/mot-de-passe-oublie" variant="outline" size="sm">Changer mon mot de passe</LinkButton></div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-extrabold">Mes données</h2>
        <p className="mt-1 text-sm text-muted">Télécharge tout ce qu&apos;ECONOM. conserve sur toi, ou supprime ton compte. <Link href="/confidentialite" className="font-bold underline underline-offset-4">Politique de confidentialité</Link></p>
        <div className="mt-3 flex flex-col items-start gap-2">
          <a href="/api/account/export" download className="pressable inline-flex min-h-10 items-center rounded-full border-2 border-ink/15 bg-surface px-4 text-sm font-bold hover:border-brand">Exporter mes données (JSON)</a>
          <DeleteAccount hasSubscription={Boolean(stripeActive)} />
        </div>
      </Card>

      <form action={signOut}><Button type="submit" variant="outline" full>Me déconnecter</Button></form>
    </div>
  );
}
