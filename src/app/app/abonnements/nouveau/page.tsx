import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContractForm } from "@/components/contract-form";
import { PageTitle } from "@/components/ui";
import { getMe } from "@/lib/me";

export const metadata: Metadata = { title: "Ajouter un abonnement" };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/abonnements" className="font-bold text-brand-strong">← Mes abonnements</Link></p>
      <PageTitle title="Ajouter un abonnement" />
      <ContractForm canRemind={me.plan === "plus"} />
    </>
  );
}
