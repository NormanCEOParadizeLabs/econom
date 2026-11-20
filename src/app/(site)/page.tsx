import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, LinkButton } from "@/components/ui";
import { IconBolt, IconChat, IconCheck, IconPhone, IconPiggy, IconPin, IconRepeat, IconScan, IconShield, IconWifi } from "@/components/icons";
import { loadPublicOffers } from "@/lib/catalog";
import { euro, dateFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "ECONOM. — Ton argent. Tes règles.",
  description: "Scanne tes factures, compare ton forfait mobile et ta box, repère les abonnements trop chers et suis tes économies. Comparateur indépendant, sources datées, zéro économie inventée.",
  alternates: { canonical: "/" },
};
export const revalidate = 600;

const PILLARS = [
  { icon: IconScan, title: "Scanne ta facture", text: "Une photo suffit : les montants sont lus, tu vérifies, tu corriges si besoin." },
  { icon: IconPhone, title: "Compare ton forfait", text: "Coût complet sur 12 ou 24 mois, promos et frais inclus. Pas juste le prix d'appel." },
  { icon: IconRepeat, title: "Dompte tes abonnements", text: "Tout ce qui est prélevé chaque mois, au même endroit, avec les échéances." },
  { icon: IconPin, title: "Bons plans près de toi", text: "Uniquement des offres sourcées et datées. Jamais de promotion inventée." },
  { icon: IconChat, title: "Un assistant qui explique", text: "Il s'appuie sur le catalogue vérifié et te guide pas à pas, sans jargon." },
  { icon: IconPiggy, title: "Suis tes économies", text: "Potentielles, lancées, confirmées : chaque euro est rangé dans la bonne case." },
];

async function catalogStats() {
  try {
    const [mobile, internet] = await Promise.all([loadPublicOffers("mobile"), loadPublicOffers("internet")]);
    const all = [...mobile, ...internet];
    const last = all.map((o) => o.verifiedAt ?? "").sort().at(-1) || null;
    const cheapest = mobile.filter((o) => (o.dataGb ?? 0) >= 20).sort((a, b) => a.monthlyCents - b.monthlyCents)[0] ?? null;
    return { count: all.length, last, cheapest };
  } catch {
    return { count: 0, last: null, cheapest: null };
  }
}

export default async function Home() {
  const stats = await catalogStats();
  return (
    <>
      <section className="on-hero relative overflow-hidden bg-hero text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.15fr_.85fr] md:items-center md:pt-20 md:pb-24">
          <div className="stagger">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-bold">
              <IconBolt width={16} height={16} className="text-accent" /> L&apos;appli française du pouvoir d&apos;achat
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.7rem,9vw,5.2rem)] font-black leading-[0.95]">
              Ton argent.
              <br />
              <span className="inline-block -rotate-1 rounded-2xl bg-accent px-3 text-on-accent">Tes règles.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90">
              ECONOM. identifie les dépenses sur lesquelles tu pourrais économiser, compare les offres adaptées à tes besoins et t&apos;accompagne pour garder davantage d&apos;argent chaque mois.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/comparateur/mobile" variant="accent" size="lg">Comparer mon forfait — sans compte</LinkButton>
              <LinkButton href="/inscription" variant="light" size="lg">Créer mon compte gratuit</LinkButton>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              {["Gratuit pour commencer", "Sources datées", "Aucune économie garantie à tort"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5"><IconCheck width={16} height={16} className="text-accent" />{t}</li>
              ))}
            </ul>
          </div>

          <div className="animate-pop md:justify-self-end w-full max-w-sm">
            <div className="rounded-[2rem] bg-white p-5 text-[#171529] shadow-2xl shadow-black/30 rotate-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5d5a72]">Exemple de calcul</p>
              <p className="mt-1 text-sm">Forfait actuel à <strong>24,99 €</strong>/mois, nouvelle offre à <strong>12,99 €</strong> avec 10 € de carte SIM.</p>
              <div className="mt-4 rounded-2xl bg-[#D8FF55] p-4">
                <p className="text-xs font-bold">Économie nette sur 12 mois</p>
                <p className="num text-5xl font-black">134,00&nbsp;€</p>
                <p className="text-xs mt-1">(24,99 × 12) − (12,99 × 12 + 10)</p>
              </div>
              <p className="mt-3 text-xs text-[#5d5a72]">Illustration du mode de calcul, sans lien avec une offre réelle. Tes résultats dépendent de ta situation.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl md:text-4xl font-black max-w-2xl">Six outils. Une seule appli. Zéro prise de tête.</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Card as="article" key={p.title} className="pressable hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-on-brand"><p.icon /></div>
              <h3 className="mt-4 font-display text-xl font-extrabold">{p.title}</h3>
              <p className="mt-1.5 text-muted leading-relaxed">{p.text}</p>
            </Card>
          ))}
        </ul>
      </section>

      <section className="bg-surface-2">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <Badge tone="brand">Notre méthode</Badge>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-black">Des calculs vérifiables, pas des promesses.</h2>
            <p className="mt-4 text-muted leading-relaxed">
              Les prix viennent d&apos;un catalogue d&apos;offres contrôlées une par une sur le site officiel des fournisseurs. Les calculs sont faits par un moteur déterministe — l&apos;IA lit et explique, elle ne fixe jamais un tarif.
            </p>
            <ul className="mt-5 space-y-3">
              {[
                "Coût total sur 12 ou 24 mois : promotions, hausse après promo, carte SIM, frais de résiliation.",
                "Classement par économie nette. Un partenariat commercial est toujours affiché et ne change pas l'ordre.",
                "Chaque offre affiche sa source et sa date de vérification. Passé ce délai, elle disparaît.",
                "Si changer te coûte plus cher, on te le dit.",
              ].map((t) => (
                <li key={t} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-on-accent"><IconCheck width={14} height={14} /></span><span>{t}</span></li>
              ))}
            </ul>
          </div>
          <Card className="md:justify-self-end w-full max-w-md">
            <p className="text-sm font-bold text-muted">État du catalogue</p>
            {stats.count > 0 ? (
              <>
                <p className="num text-6xl font-black text-brand-strong mt-1">{stats.count}</p>
                <p className="font-semibold">offres vérifiées en ligne</p>
                <p className="mt-1 text-sm text-muted">Dernière vérification : {dateFr(stats.last)}</p>
                {stats.cheapest && (
                  <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm">
                    Forfait 20 Go et plus le moins cher du catalogue : <strong>{stats.cheapest.provider} {stats.cheapest.name}</strong> à <strong>{euro(stats.cheapest.monthlyCents)}</strong>/mois (vérifié le {dateFr(stats.cheapest.verifiedAt)}).
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed">Le catalogue est en cours de vérification. Aucune offre n&apos;est affichée tant qu&apos;elle n&apos;a pas été contrôlée sur le site officiel du fournisseur.</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href="/comparateur/mobile" size="sm"><IconPhone width={18} height={18} /> Mobile</LinkButton>
              <LinkButton href="/comparateur/internet" size="sm" variant="outline"><IconWifi width={18} height={18} /> Internet</LinkButton>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Dis-nous ce que tu paies", "Saisis ton forfait ou prends ta facture en photo. Deux minutes, pas plus."],
            ["2", "Regarde ce qui change vraiment", "Pour chaque offre compatible : le coût total, les frais, et ce qu'il te reste à la fin."],
            ["3", "Décide, à ton rythme", "Tu changes sur le site de l'opérateur, tu confirmes ton économie, on la suit avec toi."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-[1.5rem] border border-line p-6">
              <p className="num text-5xl font-black text-brand">{n}</p>
              <h3 className="mt-2 font-display text-xl font-extrabold">{t}</h3>
              <p className="mt-1.5 text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-[2rem] bg-ink p-8 md:p-12 text-[#F8F8F2] flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <p className="inline-flex items-center gap-2 text-accent font-bold"><IconShield width={18} height={18} /> Tes données restent les tiennes</p>
            <h2 className="mt-2 font-display text-3xl font-black">Tes factures ne sont pas conservées.</h2>
            <p className="mt-2 text-white/75 max-w-xl">Le document est lu puis écarté : seuls les champs utiles (fournisseur, prix, volume) sont gardés, et tu peux tout exporter ou supprimer en un geste.</p>
          </div>
          <div className="flex flex-col gap-2">
            <LinkButton href="/inscription" variant="accent" size="lg">Commencer gratuitement</LinkButton>
            <Link href="/confidentialite" className="text-center text-sm text-white/70 underline underline-offset-4">Lire la politique de confidentialité</Link>
          </div>
        </div>
      </section>
    </>
  );
}
