import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { PageHero } from "@/components/content";
import { IconArrow, IconClock } from "@/components/icons";
import { ARTICLES } from "@/content/articles";
import { dateFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Conseils",
  description: "Fins de promotion, RIO, abonnements oubliés, engagement : des articles courts et concrets pour payer le juste prix, sans jargon et sans tarif inventé.",
  alternates: { canonical: "/conseils" },
};

export default function Conseils() {
  return (
    <>
      <PageHero badge="Conseils" title="Comprendre avant de payer.">
        Des articles courts, des informations vérifiables, zéro jargon. De quoi reprendre la main sur tes dépenses récurrentes.
      </PageHero>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <ul className="grid gap-4 md:grid-cols-2">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link href={`/conseils/${a.slug}`} className="pressable group flex h-full flex-col rounded-[1.5rem] border border-line bg-surface p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10">
                <div className="flex items-center gap-3 text-xs text-muted">
                  <Badge tone="brand">{a.category}</Badge>
                  <span className="inline-flex items-center gap-1"><IconClock width={14} height={14} /> {a.minutes} min de lecture</span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight group-hover:text-brand-strong">{a.title}</h2>
                <p className="mt-2 flex-1 leading-relaxed text-muted">{a.description}</p>
                <p className="mt-5 flex items-center justify-between text-sm">
                  <time dateTime={a.date} className="text-muted">{dateFr(a.date)}</time>
                  <span className="inline-flex items-center gap-1 font-bold text-brand-strong">Lire <IconArrow width={16} height={16} /></span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
          Ces articles donnent des informations générales. Ils ne citent aucun tarif d&apos;opérateur et ne remplacent pas la lecture de ton contrat.
        </p>
      </section>
    </>
  );
}
