import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { LinkButton } from "@/components/ui";
import { IconArrow } from "@/components/icons";

export const metadata: Metadata = {
  title: "Page introuvable",
  description: "Cette page n'existe pas ou a été déplacée.",
};

const LINKS = [
  ["/comparateur/mobile", "Comparer mon forfait mobile"],
  ["/comparateur/internet", "Comparer ma box internet"],
  ["/comment-ca-marche", "Comment ça marche"],
  ["/conseils", "Conseils"],
  ["/aide", "Centre d'aide"],
  ["/contact", "Contact"],
];

export default function NotFound() {
  return (
    <>
      <header className="border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link href="/" aria-label="ECONOM. — accueil" className="py-2"><Wordmark className="h-[22px] w-auto" /></Link>
        </div>
      </header>
      <main id="contenu" className="flex-1">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-24">
          <div className="stagger">
            <p className="num text-[clamp(6rem,24vw,11rem)] font-black leading-none text-brand">
              4<span className="mx-1 inline-block -rotate-6 rounded-[1.5rem] bg-accent px-3 text-on-accent">0</span>4
            </p>
            <h1 className="mt-4 font-display text-3xl font-black md:text-4xl">Cette page a résilié sans préavis.</h1>
            <p className="mt-3 max-w-md leading-relaxed text-muted">
              L&apos;adresse est peut-être mal saisie, ou la page a été déplacée. Aucun frais de résiliation pour toi : repars du bon pied.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/" size="lg">Retour à l&apos;accueil</LinkButton>
              <LinkButton href="/faq" variant="outline" size="lg">Lire la FAQ</LinkButton>
            </div>
          </div>
          <nav aria-label="Pages utiles" className="rounded-[2rem] border border-line bg-surface p-3">
            <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-muted">Tu cherchais peut-être</p>
            <ul>
              {LINKS.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="pressable flex items-center justify-between gap-3 rounded-2xl px-3 py-3.5 font-bold hover:bg-surface-2">
                    {label}
                    <IconArrow width={18} height={18} className="shrink-0 text-brand-strong" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
    </>
  );
}
