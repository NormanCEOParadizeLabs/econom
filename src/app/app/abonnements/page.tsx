import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, EmptyState, LinkButton, Notice, PageTitle } from "@/components/ui";
import { IconChevron, IconPlus, IconRepeat } from "@/components/icons";
import { findPotentialDuplicates, monthlyEquivalentCents, type Frequency } from "@/lib/engine";
import { CONTRACT_CATEGORIES, FREQ_LABEL, dateFr, euro } from "@/lib/format";
import { getMe } from "@/lib/me";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mes abonnements" };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const supabase = await supabaseServer();
  const { data } = await supabase.from("user_contracts").select("id, name, category, price_cents, frequency, next_charge_date, commitment_end, to_review").eq("active", true).order("price_cents", { ascending: false });
  const contracts = data ?? [];
  const monthly = contracts.reduce((a, c) => a + monthlyEquivalentCents(c.price_cents, c.frequency as Frequency), 0);
  const byCat = new Map<string, number>();
  for (const c of contracts) byCat.set(c.category, (byCat.get(c.category) ?? 0) + monthlyEquivalentCents(c.price_cents, c.frequency as Frequency));
  const dups = findPotentialDuplicates(contracts.map((c) => ({ id: c.id, name: c.name, category: c.category, priceCents: c.price_cents, frequency: c.frequency as Frequency })));
  const atLimit = me.plan === "free" && contracts.length >= me.limits.free_contracts;
  return (
    <>
      <PageTitle title="Mes abonnements" subtitle="Tout ce qui est prélevé régulièrement, au même endroit." action={!atLimit ? <LinkButton href="/app/abonnements/nouveau" size="sm"><IconPlus width={18} height={18} /> Ajouter</LinkButton> : undefined} />
      {contracts.length === 0 ? (
        <EmptyState icon={<IconRepeat />} title="Aucun abonnement suivi" action={<LinkButton href="/app/abonnements/nouveau">Ajouter mon premier abonnement</LinkButton>}>
          Ajoute tes abonnements à la main. ECONOM. ne lit pas ton compte bancaire : tu gardes la main sur ce que tu enregistres.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <Card className="bg-[#171529] !border-0 text-[#F8F8F2]">
            <p className="text-sm font-bold text-white/70">Total de tes dépenses récurrentes suivies</p>
            <p className="num text-5xl font-black text-[#D8FF55]">{euro(monthly)}<span className="text-lg text-white/80"> /mois</span></p>
            <p className="text-sm text-white/75">soit {euro(monthly * 12)} par an</p>
            {byCat.size > 1 && (
              <ul className="mt-4 space-y-1.5">
                {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, cents]) => (
                  <li key={cat} className="text-sm">
                    <div className="flex justify-between"><span>{CONTRACT_CATEGORIES[cat] ?? cat}</span><span className="num font-bold">{euro(cents)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/15"><div className="h-full rounded-full bg-[#D8FF55]" style={{ width: `${Math.max(4, Math.round((cents / monthly) * 100))}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {dups.map((d) => <Notice key={d.ids.join()} tone="warn" title="Doublon possible">{d.reason}. Vérifie que tu ne paies pas deux fois le même service.</Notice>)}
          <ul className="space-y-2">
            {contracts.map((c) => (
              <li key={c.id}>
                <Link href={`/app/abonnements/${c.id}`} className="pressable flex items-center gap-3 rounded-[1.25rem] border border-line bg-surface p-4 hover:border-brand">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-bold">{c.name}{c.to_review && <Badge tone="warn">À vérifier</Badge>}</span>
                    <span className="block text-xs text-muted">{CONTRACT_CATEGORIES[c.category] ?? c.category}{c.next_charge_date ? ` · prochain prélèvement le ${dateFr(c.next_charge_date, { day: "numeric", month: "short" })}` : ""}</span>
                  </span>
                  <span className="text-right"><span className="num block font-black">{euro(c.price_cents)}</span><span className="text-xs text-muted">{FREQ_LABEL[c.frequency]}</span></span>
                  <IconChevron width={18} height={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
          {atLimit && (
            <Notice title="Suivre tous tes abonnements">
              La formule gratuite permet de suivre {me.limits.free_contracts} abonnement. ECONOM. Plus les suit tous, avec des rappels avant chaque échéance.
              <div className="mt-3"><LinkButton href="/app/premium" size="sm">Découvrir ECONOM. Plus</LinkButton></div>
            </Notice>
          )}
          <p className="text-xs text-muted">ECONOM. ne détecte pas automatiquement tes prélèvements : seuls les abonnements que tu ajoutes ici sont pris en compte.</p>
        </div>
      )}
    </>
  );
}
