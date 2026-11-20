import type { Metadata } from "next";
import { Comparator } from "@/components/comparator";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Comparateur de box internet", description: "Compare ta box internet avec des offres vérifiées : coût total sur 12 ou 24 mois, hausse après promotion, frais de mise en service et de résiliation inclus.", alternates: { canonical: "/comparateur/internet" } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [sp, user] = await Promise.all([searchParams, getUser().catch(() => null)]);
  const clean = (v?: string, max = 100) => (v ? v.slice(0, max) : undefined);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl md:text-5xl font-black leading-[1.02]">Ta box internet, au vrai prix.</h1>
      <p className="mt-3 mb-8 text-lg text-muted">Pas le prix d&apos;appel : le coût complet sur 12 ou 24 mois, avec les promotions qui s&apos;arrêtent et tous les frais. Gratuit, sans compte.</p>
      <Comparator category="internet" loggedIn={Boolean(user)} initial={{ provider: clean(sp.fournisseur, 60), plan: clean(sp.offre), price: clean(sp.prix, 10), dataGb: clean(sp.data, 8) }} />
    </div>
  );
}
