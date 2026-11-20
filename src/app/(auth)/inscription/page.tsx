import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Créer un compte", description: "Crée ton compte ECONOM. gratuit : comparateur, suivi d'abonnement et 3 analyses de facture par mois." };

export default async function Page({ searchParams }: { searchParams: Promise<{ parrain?: string; utm_source?: string }> }) {
  const sp = await searchParams;
  const referral = /^[A-Za-z0-9]{8}$/.test(sp.parrain ?? "") ? sp.parrain!.toUpperCase() : "";
  const source = (sp.utm_source ?? (referral ? "parrainage" : "")).replace(/[^\w-]/g, "").slice(0, 40);
  return (
    <>
      <h1 className="font-display text-4xl font-black">Crée ton compte.</h1>
      <p className="mt-2 mb-6 text-muted">Gratuit, sans carte bancaire. Deux minutes suffisent.</p>
      <SignupForm referral={referral} source={source} />
      <p className="mt-8 text-center text-sm text-muted">
        Déjà inscrit ? <Link href="/connexion" className="font-bold text-brand-strong underline underline-offset-4">Me connecter</Link>
      </p>
    </>
  );
}
