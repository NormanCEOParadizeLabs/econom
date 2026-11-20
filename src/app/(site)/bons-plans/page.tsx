import type { Metadata } from "next";
import { DealsExplorer } from "@/components/deals-explorer";
import { LinkButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Bons plans vérifiés près de chez toi",
  description: "Gratuités et réductions locales dont la source officielle a été contrôlée et datée. Sans compte, sans géolocalisation imposée.",
  alternates: { canonical: "/bons-plans" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl md:text-5xl font-black leading-[1.02]">Les bons plans vérifiés, près de chez toi.</h1>
      <p className="mt-3 mb-8 text-lg text-muted">Chaque offre renvoie vers sa source officielle, avec sa date de contrôle. Saisis ta ville ou ton code postal : pas besoin de compte ni de partager ta position.</p>
      <DealsExplorer defaultQuery="" publicMode />
      <div className="mt-10 rounded-[1.5rem] bg-surface-2 p-5 text-center">
        <p className="font-display text-xl font-extrabold">Et sur ton forfait, combien pourrais-tu économiser ?</p>
        <LinkButton href="/diagnostic" className="mt-3">Faire le diagnostic gratuit</LinkButton>
      </div>
    </div>
  );
}
