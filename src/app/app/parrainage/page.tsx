import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReferralShare } from "@/components/referral-share";
import { Badge, Card, Notice, PageTitle } from "@/components/ui";
import { IconCheck, IconGift } from "@/components/icons";
import { env } from "@/lib/env";
import { dateFr } from "@/lib/format";
import { getMe } from "@/lib/me";
import { getReferralRules, rewardLabel } from "@/lib/services/referral";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Parrainage" };
const LABEL: Record<string, [string, "neutral" | "positive" | "danger"]> = { pending: ["Inscrit — diagnostic à faire", "neutral"], qualified: ["Qualifié", "positive"], rejected: ["Non retenu", "danger"] };

export default async function Page() {
  const me = await getMe();
  if (!me?.profile) redirect("/connexion");
  const supabase = await supabaseServer();
  const [{ data: referrals }, { data: rewards }, rules] = await Promise.all([
    supabase.from("referrals").select("id, status, created_at, qualified_at").eq("referrer_id", me.user.id).order("created_at", { ascending: false }),
    supabase.from("referral_rewards").select("id, tier, reward_type, amount, granted_at").order("granted_at", { ascending: false }),
    getReferralRules(),
  ]);
  const qualified = (referrals ?? []).filter((r) => r.status === "qualified").length;
  const tiers = [...rules.tiers].sort((a, b) => a.qualified - b.qualified);
  const max = tiers.at(-1)?.qualified ?? 1;
  const next = tiers.find((t) => t.qualified > qualified);
  const grantedKeys = new Set((rewards ?? []).map((r) => `${r.tier}-${r.reward_type}`));
  return (
    <div className="space-y-5">
      <PageTitle title="Parrainage" subtitle="Fais économiser tes proches. Chaque diagnostic terminé te rapproche d'une récompense." />
      <ReferralShare code={me.profile.referral_code} url={`${env.appUrl}/r/${me.profile.referral_code}`} />

      <Card>
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold">Ta progression</h2>
          <p className="num text-3xl font-black text-brand-strong">{qualified}<span className="text-base text-muted"> filleul{qualified > 1 ? "s" : ""} qualifié{qualified > 1 ? "s" : ""}</span></p>
        </div>
        <div className="relative mt-5 mb-2 h-3 rounded-full bg-line" role="img" aria-label={`${qualified} filleul${qualified > 1 ? "s" : ""} qualifié${qualified > 1 ? "s" : ""} sur ${max}`}>
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, (qualified / max) * 100)}%` }} />
          {tiers.map((t) => (
            <span key={`${t.qualified}-${t.type}`} className={`absolute top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-black ${qualified >= t.qualified ? "border-brand bg-accent text-on-accent" : "border-line bg-surface text-muted"}`} style={{ left: `${(t.qualified / max) * 100}%` }}>{t.qualified}</span>
          ))}
        </div>
        <ul className="mt-6 space-y-2">
          {tiers.map((t) => {
            const done = grantedKeys.has(`${t.qualified}-${t.type}`);
            return (
              <li key={`${t.qualified}-${t.type}`} className={`flex items-center gap-3 rounded-2xl p-3 ${done ? "bg-positive/10" : "bg-surface-2"}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? "bg-positive text-white" : "bg-surface text-brand-strong"}`}>{done ? <IconCheck width={18} height={18} /> : <IconGift width={18} height={18} />}</span>
                <span className="flex-1"><span className="block font-bold">{rewardLabel(t)}</span><span className="text-xs text-muted">{t.qualified} filleul{t.qualified > 1 ? "s" : ""} qualifié{t.qualified > 1 ? "s" : ""}</span></span>
                {done ? <Badge tone="positive">Débloquée</Badge> : <Badge>{Math.max(0, t.qualified - qualified)} à venir</Badge>}
              </li>
            );
          })}
        </ul>
        {next && <p className="mt-3 text-sm text-muted">Encore {next.qualified - qualified} filleul{next.qualified - qualified > 1 ? "s" : ""} qualifié{next.qualified - qualified > 1 ? "s" : ""} pour : <strong className="text-ink">{rewardLabel(next)}</strong>.</p>}
        {(me.sub?.bonus_analyses ?? 0) > 0 && <p className="mt-2 text-sm">Tu disposes de <strong>{me.sub!.bonus_analyses} analyse{me.sub!.bonus_analyses > 1 ? "s" : ""} bonus</strong>, utilisées une fois ton quota mensuel épuisé.</p>}
        {me.sub?.advanced_report && <p className="mt-2 text-sm"><Link href="/app/rapport" className="font-bold text-brand-strong underline underline-offset-4">Ouvrir mon rapport d&apos;optimisation avancé</Link></p>}
      </Card>

      <Card>
        <h2 className="font-display text-lg font-extrabold">Tes invitations</h2>
        {referrals?.length ? (
          <ul className="mt-2 divide-y divide-line">
            {referrals.map((r, i) => <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>Invité n°{referrals.length - i} <span className="text-muted">· inscrit le {dateFr(r.created_at, { day: "numeric", month: "short" })}</span></span><Badge tone={LABEL[r.status]?.[1] ?? "neutral"}>{LABEL[r.status]?.[0] ?? r.status}</Badge></li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Personne pour l&apos;instant. Partage ton lien : tes proches font leur diagnostic sans inscription, et tu es reconnu comme parrain s&apos;ils créent un compte ensuite.</p>
        )}
        <p className="mt-3 text-xs text-muted">Par respect pour leur vie privée, tu ne vois ni le nom ni les données de tes invités.</p>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-extrabold">Historique des récompenses</h2>
        {rewards?.length ? (
          <ul className="mt-2 divide-y divide-line text-sm">
            {rewards.map((r) => <li key={r.id} className="flex justify-between gap-3 py-2.5"><span className="font-bold">{rewardLabel({ qualified: r.tier, type: r.reward_type, amount: r.amount })}</span><span className="text-muted">{dateFr(r.granted_at, { day: "numeric", month: "short", year: "numeric" })}</span></li>)}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">Aucune récompense pour le moment.</p>}
      </Card>

      <Notice title="Les règles, en clair">
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Un filleul est « qualifié » quand il a créé un nouveau compte via ton lien, confirmé son e-mail et terminé un diagnostic (comparaison enregistrée ou facture validée).</li>
          <li>Chaque palier est attribué une seule fois. Les jours de Plus offerts ne créent aucun abonnement payant et ne déclenchent aucun prélèvement.</li>
          <li>Un seul parrain par compte, pas d&apos;auto-parrainage. Les comptes créés en série ou avec une adresse jetable ne comptent pas.</li>
          <li>Parrainer n&apos;est jamais obligatoire : tes résultats restent accessibles sans inviter personne.</li>
        </ul>
      </Notice>
    </div>
  );
}
