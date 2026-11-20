import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReferralShare } from "@/components/referral-share";
import { Badge, Card, Notice, PageTitle } from "@/components/ui";
import { env } from "@/lib/env";
import { dateFr } from "@/lib/format";
import { getMe } from "@/lib/me";
import { getSetting } from "@/lib/plan";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Parrainage" };
const LABEL: Record<string, [string, "neutral" | "brand" | "positive" | "danger"]> = { pending: ["Inscrit — pas encore actif", "neutral"], qualified: ["Actif", "brand"], rewarded: ["Actif — récompense attribuée", "positive"], rejected: ["Non retenu", "danger"] };

export default async function Page() {
  const me = await getMe();
  if (!me?.profile) redirect("/connexion");
  const supabase = await supabaseServer();
  const [{ data: referrals }, rules] = await Promise.all([
    supabase.from("referrals").select("id, status, created_at").eq("referrer_id", me.user.id).order("created_at", { ascending: false }),
    getSetting("referral", { qualified_needed: 3, bonus_days: 30 }),
  ]);
  const active = (referrals ?? []).filter((r) => r.status === "qualified").length;
  return (
    <div className="space-y-5">
      <PageTitle title="Parrainage" subtitle={`${rules.qualified_needed} proches actifs = ${rules.bonus_days} jours d'ECONOM. Plus offerts.`} />
      <ReferralShare code={me.profile.referral_code} url={`${env.appUrl}/inscription?parrain=${me.profile.referral_code}`} />
      <Card>
        <h2 className="font-display text-lg font-extrabold">Ta progression</h2>
        <div className="mt-3 flex gap-2" role="img" aria-label={`${active} filleul${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""} sur ${rules.qualified_needed}`}>
          {Array.from({ length: rules.qualified_needed }, (_, i) => <span key={i} className={`h-3 flex-1 rounded-full ${i < active ? "bg-brand" : "bg-line"}`} />)}
        </div>
        <p className="mt-2 text-sm text-muted">{active} sur {rules.qualified_needed} filleuls actifs avant ta prochaine récompense.</p>
      </Card>
      <Card>
        <h2 className="font-display text-lg font-extrabold">Tes filleuls</h2>
        {referrals?.length ? (
          <ul className="mt-2 divide-y divide-line">
            {referrals.map((r, i) => <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>Filleul n°{referrals.length - i} <span className="text-muted">· inscrit le {dateFr(r.created_at, { day: "numeric", month: "short" })}</span></span><Badge tone={LABEL[r.status][1]}>{LABEL[r.status][0]}</Badge></li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Personne pour l&apos;instant. Partage ton lien : tes proches l&apos;utilisent à l&apos;inscription.</p>
        )}
        <p className="mt-3 text-xs text-muted">Par respect pour leur vie privée, tu ne vois ni le nom ni les données de tes filleuls.</p>
      </Card>
      <Notice title="Les règles, en clair">
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Un filleul est « actif » quand il a confirmé son e-mail et enregistré une première comparaison ou validé une analyse de facture.</li>
          <li>Tous les {rules.qualified_needed} filleuls actifs, tu reçois {rules.bonus_days} jours d&apos;avantages Plus, cumulables.</li>
          <li>Un seul parrain par compte, pas d&apos;auto-parrainage. Les comptes créés pour contourner ces règles ne comptent pas.</li>
          <li>Parrainer n&apos;est jamais obligatoire : tes résultats et tes comparaisons restent accessibles sans inviter personne.</li>
        </ul>
      </Notice>
    </div>
  );
}
