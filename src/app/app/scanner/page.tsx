import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Scanner } from "@/components/scanner";
import { Notice, PageTitle, LinkButton } from "@/components/ui";
import { aiConfigured } from "@/lib/ai/client";
import { getMe } from "@/lib/me";

export const metadata: Metadata = { title: "Scanner une facture" };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const { used, limit } = me.quota.analyses;
  return (
    <>
      <PageTitle title="Scanner une facture" subtitle="Une photo, et les montants sont lus pour toi. Tu vérifies avant toute comparaison." />
      {aiConfigured() ? (
        <Scanner remaining={Math.max(0, limit - used)} limit={limit} plan={me.plan} />
      ) : (
        <Notice tone="warn" title="Analyse automatique indisponible">
          La lecture automatique des factures n&apos;est pas activée sur cet environnement. Tu peux saisir ton offre à la main : le calcul est exactement le même.
          <div className="mt-3"><LinkButton href="/app/comparer" size="sm">Comparer à la main</LinkButton></div>
        </Notice>
      )}
    </>
  );
}
