import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssistantChat } from "@/components/assistant-chat";
import { LinkButton, Notice, PageTitle } from "@/components/ui";
import { aiConfigured } from "@/lib/ai/client";
import { getMe } from "@/lib/me";

export const metadata: Metadata = { title: "Assistant" };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const { used, limit } = me.quota.chat;
  return (
    <>
      <PageTitle title="Assistant ECONOM." subtitle="Il explique, compare et guide — à partir d'offres vérifiées, jamais de mémoire." />
      {aiConfigured() ? (
        <AssistantChat remaining={Math.max(0, limit - used)} limit={limit} />
      ) : (
        <Notice tone="warn" title="Assistant indisponible">
          L&apos;assistant n&apos;est pas activé sur cet environnement. Le comparateur fonctionne sans lui, et le centre d&apos;aide explique comment résilier ou changer d&apos;opérateur.
          <div className="mt-3 flex flex-wrap gap-2"><LinkButton href="/app/comparer" size="sm">Comparer</LinkButton><LinkButton href="/aide" size="sm" variant="outline">Centre d&apos;aide</LinkButton></div>
        </Notice>
      )}
    </>
  );
}
