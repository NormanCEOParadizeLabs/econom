import type { Metadata } from "next";
import { Symbol } from "@/components/logo";
import { IconWifi } from "@/components/icons";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Hors ligne",
  description: "Tu es hors ligne. ECONOM. a besoin d'une connexion à internet pour comparer les offres et analyser tes factures.",
  alternates: { canonical: "/hors-ligne" },
  robots: { index: false, follow: false },
};

export default function HorsLigne() {
  return (
    <main id="contenu" className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-rise w-full max-w-md text-center">
        <Symbol className="mx-auto h-16 w-16" />
        <p className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-bold text-muted">
          <IconWifi width={16} height={16} /> Pas de connexion
        </p>
        <h1 className="mt-4 font-display text-4xl font-black">Tu es hors ligne.</h1>
        <p className="mt-3 leading-relaxed text-muted">
          ECONOM. a besoin d&apos;internet pour comparer les offres et lire tes factures. Vérifie ton Wi-Fi ou tes données mobiles, puis réessaie : rien n&apos;est perdu.
        </p>
        {/* Lien classique (et non <Link>) : force un vrai rechargement une fois le réseau revenu. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={`${buttonClass("primary", "lg")} mt-8`}>Réessayer</a>
      </div>
    </main>
  );
}
