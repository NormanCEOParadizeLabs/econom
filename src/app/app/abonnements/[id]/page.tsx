import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ContractForm, type ContractRow } from "@/components/contract-form";
import { Card, PageTitle } from "@/components/ui";
import { IconExternal } from "@/components/icons";
import { monthlyEquivalentCents, type Frequency } from "@/lib/engine";
import { euro } from "@/lib/format";
import { getMe } from "@/lib/me";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Détail de l'abonnement" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const me = await getMe();
  if (!me) redirect("/connexion");
  const supabase = await supabaseServer();
  const { data } = await supabase.from("user_contracts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as ContractRow;
  const monthly = monthlyEquivalentCents(c.price_cents, c.frequency as Frequency);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/abonnements" className="font-bold text-brand-strong">← Mes abonnements</Link></p>
      <PageTitle title={c.name} />
      <Card className="mb-4 grid grid-cols-2 gap-3">
        <div><p className="text-xs font-bold text-muted">Par mois</p><p className="num text-2xl font-black">{euro(monthly)}</p></div>
        <div><p className="text-xs font-bold text-muted">Par an</p><p className="num text-2xl font-black">{euro(monthly * 12)}</p></div>
        {c.manage_url && (
          <a href={c.manage_url} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex items-center gap-2 text-sm font-bold text-brand-strong underline underline-offset-4">Gérer ou résilier chez le fournisseur <IconExternal width={16} height={16} /></a>
        )}
      </Card>
      <ContractForm contract={c} canRemind={me.plan === "plus"} />
    </>
  );
}
