import type { Metadata } from "next";
import Link from "next/link";
import { DealSubmitForm } from "@/components/small-forms";
import { Notice, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Proposer un bon plan" };

export default async function Page() {
  await requireUser();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/bons-plans" className="font-bold text-brand-strong">← Bons plans</Link></p>
      <PageTitle title="Proposer un bon plan" subtitle="Commerçant ou client : signale une offre réelle près de chez toi." />
      <Notice className="mb-4">Chaque proposition est vérifiée par notre équipe à partir du lien fourni avant toute publication. Les offres sans preuve officielle ne sont pas publiées.</Notice>
      <DealSubmitForm />
    </>
  );
}
