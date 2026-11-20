import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, LinkButton, Notice } from "@/components/ui";
import { IconArrow, IconClock } from "@/components/icons";
import { ARTICLES, getArticle, type ArticleBlock } from "@/content/articles";
import { dateFr } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/conseils/${article.slug}` },
    openGraph: { type: "article", title: article.title, description: article.description, publishedTime: article.date, locale: "fr_FR" },
  };
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-10 font-display text-2xl font-black">{block.text}</h2>;
    case "p":
      return <p className="mt-4 text-[17px] leading-[1.75]">{block.text}</p>;
    case "ul":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[17px] leading-[1.7] marker:text-brand">
          {block.items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[17px] leading-[1.7] marker:font-bold marker:text-brand">
          {block.items.map((i) => <li key={i}>{i}</li>)}
        </ol>
      );
    case "tip":
      return (
        <aside className="mt-6 rounded-[1.5rem] bg-accent p-5 text-on-accent">
          <p className="font-display text-lg font-extrabold">{block.title}</p>
          <p className="mt-1 leading-relaxed">{block.text}</p>
        </aside>
      );
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const others = ARTICLES.filter((a) => a.slug !== article.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    inLanguage: "fr-FR",
    author: { "@type": "Organization", name: "ECONOM." },
    publisher: { "@type": "Organization", name: "ECONOM." },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
          <Link href="/conseils" className="font-semibold underline underline-offset-4 hover:text-ink">Conseils</Link>
          <span aria-hidden> / </span>
          <span>{article.category}</span>
        </nav>
        <header className="stagger mt-5">
          <Badge tone="brand">{article.category}</Badge>
          <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3.2rem)] font-black leading-[1.03]">{article.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{article.description}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span>Publié le <time dateTime={article.date}>{dateFr(article.date)}</time></span>
            <span className="inline-flex items-center gap-1"><IconClock width={14} height={14} /> {article.minutes} min de lecture</span>
          </p>
        </header>

        <div className="mt-6 border-t border-line pt-2">
          {article.body.map((b, i) => <Block key={i} block={b} />)}
        </div>

        <Notice className="mt-10">
          Informations générales, à jour à la date de publication. Elles ne constituent pas un conseil juridique personnalisé : ton contrat et le site de ton fournisseur font foi.
        </Notice>

        <div className="mt-8 flex flex-col items-start gap-5 rounded-[2rem] bg-[#171529] p-8 text-[#F8F8F2] sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="font-display text-2xl font-black">Passe à la pratique.</h2>
            <p className="mt-1 text-white/75">Compare le coût total de ton forfait sur 12 ou 24 mois, sans créer de compte.</p>
          </div>
          <LinkButton href="/comparateur/mobile" variant="accent">Comparer mon forfait</LinkButton>
        </div>
      </article>

      <section className="bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-display text-2xl font-black">À lire aussi</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {others.map((a) => (
              <li key={a.slug}>
                <Link href={`/conseils/${a.slug}`} className="pressable flex h-full flex-col rounded-[1.5rem] border border-line bg-surface p-5 hover:border-brand">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">{a.category}</span>
                  <span className="mt-2 flex-1 font-display text-lg font-extrabold leading-snug">{a.title}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-strong">Lire <IconArrow width={16} height={16} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
