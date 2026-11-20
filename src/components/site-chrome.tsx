import Link from "next/link";
import { Symbol, Wordmark } from "@/components/logo";
import { LinkButton } from "@/components/ui";
import { getUser } from "@/lib/auth";

const NAV = [
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/comparateur/mobile", label: "Forfaits mobiles" },
  { href: "/comparateur/internet", label: "Box internet" },
  { href: "/bons-plans", label: "Bons plans" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/conseils", label: "Conseils" },
];

export async function SiteHeader() {
  const user = await getUser().catch(() => null);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" aria-label="ECONOM. — accueil" className="shrink-0 py-1">
          <Symbol className="h-10 w-10" />
        </Link>
        <nav aria-label="Navigation principale" className="ml-4 hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm font-semibold text-ink/80 hover:bg-surface-2 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <LinkButton href="/app" size="sm">Mon espace</LinkButton>
          ) : (
            <>
              <Link href="/connexion" className="hidden sm:inline-flex rounded-full px-3 py-2 text-sm font-bold hover:bg-surface-2">Connexion</Link>
              <LinkButton href="/inscription" size="sm">Créer un compte</LinkButton>
            </>
          )}
        </div>
      </div>
      <nav aria-label="Navigation rapide" className="lg:hidden flex gap-1 overflow-x-auto px-3 pb-2 text-sm [scrollbar-width:none]">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 font-semibold">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

const FOOT = [
  { title: "Produit", links: [["/comment-ca-marche", "Comment ça marche"], ["/comparateur/mobile", "Comparateur mobile"], ["/comparateur/internet", "Comparateur internet"], ["/comparateur/energie", "Énergie"], ["/tarifs", "Tarifs"], ["/application", "Application"]] },
  { title: "Ressources", links: [["/conseils", "Conseils"], ["/faq", "FAQ"], ["/aide", "Centre d'aide"], ["/contact", "Contact"], ["/marque", "Marque"]] },
  { title: "Légal", links: [["/mentions-legales", "Mentions légales"], ["/confidentialite", "Confidentialité"], ["/cookies", "Cookies"], ["/cgu", "CGU"], ["/cgv", "CGV"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-[#171529] text-[#F8F8F2]">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-10 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Wordmark tone="light" className="h-6 w-auto" />
          <p className="mt-4 text-sm text-white/70 max-w-xs leading-relaxed">
            Ton argent. Tes règles. ECONOM. est un comparateur indépendant : le classement des offres ne dépend jamais d&apos;une rémunération.
          </p>
        </div>
        {FOOT.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="font-display font-extrabold mb-3">{col.title}</p>
            <ul className="space-y-2 text-sm text-white/75">
              {col.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="hover:text-white hover:underline underline-offset-4">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/60 leading-relaxed">
          Les économies affichées sont des estimations calculées à partir des informations que tu fournis et d&apos;offres vérifiées à la date indiquée. Elles ne sont jamais garanties : le site de chaque fournisseur fait foi.
        </p>
      </div>
    </footer>
  );
}
