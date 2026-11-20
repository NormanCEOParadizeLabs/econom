import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BankImport } from "@/components/bank-import";
import { Notice, PageTitle } from "@/components/ui";
import { getMe } from "@/lib/me";

export const metadata: Metadata = { title: "Détecter mes abonnements" };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/abonnements" className="font-bold text-brand-strong">← Mes abonnements</Link></p>
      <PageTitle title="Détecter mes abonnements" subtitle="Importe un relevé de ta banque : ECONOM. repère les prélèvements réguliers, leur ancienneté et les hausses de prix." />
      <BankImport plan={me.plan} freeLimit={me.limits.free_contracts} />
      <Notice className="mt-5" title="Et la connexion directe à ma banque ?">
        La synchronisation automatique passe obligatoirement par un prestataire agréé par l&apos;ACPR (directive DSP2) : ECONOM. ne se connecte pas à ta banque avec tes identifiants, ce serait contraire à ta sécurité. Cette connexion agréée n&apos;est pas encore disponible ; en attendant, l&apos;import d&apos;un relevé donne le même résultat.
      </Notice>
    </>
  );
}
