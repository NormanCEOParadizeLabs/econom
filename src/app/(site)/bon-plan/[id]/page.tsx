import type { Metadata } from "next";
import { z } from "zod";
import { DealsExplorer } from "@/components/deals-explorer";
import { Badge, Card, LinkButton, Notice } from "@/components/ui";
import { IconClock, IconExternal, IconPin } from "@/components/icons";
import { DEAL_CATEGORIES, dateFr } from "@/lib/format";
import { dealById } from "@/lib/services/deals";

type Props = { params: Promise<{ id: string }> };
const load = async (id: string) => (z.uuid().safeParse(id).success ? dealById(id) : null); // uniquement les bons plans encore valides et vérifiés

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load((await params).id);
  if (!d) return { title: "Bon plan terminé", robots: { index: false } };
  return { title: `${d.dealLabel} — ${d.merchant.name} (${d.merchant.city})`, description: `${d.title}. Bon plan vérifié le ${dateFr(d.verifiedAt)}.`, openGraph: { title: `${d.dealLabel} chez ${d.merchant.name}`, description: `${d.title} · ${d.merchant.city}` } };
}

export default async function Page({ params }: Props) {
  const d = await load((await params).id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-5">
      {d ? (
        <article className="space-y-4">
          <div className="on-hero rounded-[2rem] bg-hero p-6 text-white">
            <div className="flex flex-wrap gap-2"><Badge tone="accent">{DEAL_CATEGORIES[d.category]}</Badge>{d.isSponsored && <Badge tone="warn">Sponsorisé</Badge>}</div>
            <p className="num mt-4 inline-block -rotate-1 rounded-2xl bg-accent px-3 py-1 text-4xl font-black text-on-accent">{d.dealLabel}</p>
            <h1 className="mt-4 font-display text-3xl font-black leading-tight">{d.title}</h1>
            <p className="mt-1 text-white/85">{d.merchant.name}</p>
          </div>
          {d.description && <p className="leading-relaxed">{d.description}</p>}
          <Card className="space-y-3">
            <div className="flex gap-3"><IconPin className="mt-0.5 shrink-0 text-brand-strong" /><p><strong>{d.merchant.name}</strong><br /><span className="text-sm text-muted">{d.merchant.address}, {d.merchant.postalCode} {d.merchant.city}</span></p></div>
            <div className="flex gap-3"><IconClock className="mt-0.5 shrink-0 text-brand-strong" /><p className="text-sm"><strong>{d.validUntil ? `Valable jusqu'au ${dateFr(d.validUntil)}` : "Offre permanente"}</strong><br /><span className="text-muted">{d.auto ? "Repérée automatiquement, source contrôlée le" : "Vérifiée le"} {dateFr(d.verifiedAt)}</span></p></div>
            {d.conditions && <p className="text-sm text-muted"><strong className="text-ink">Conditions :</strong> {d.conditions}</p>}
          </Card>
          <a href={d.useUrl ?? d.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="pressable inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 font-bold text-on-brand">{d.useUrl ? "Profiter de l'offre" : "Voir la source officielle"} <IconExternal width={18} height={18} /></a>
          <Notice>Source : <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-bold underline underline-offset-4 break-all">{new URL(d.sourceUrl).hostname}</a>. Vérifie auprès du commerce avant de te déplacer.</Notice>
        </article>
      ) : (
        <Notice tone="warn" title="Ce bon plan n'est plus disponible">Il a expiré ou n&apos;a pas été revérifié : nous ne présentons jamais comme valide une promotion terminée. D&apos;autres bons plans vérifiés t&apos;attendent peut-être près de chez toi.</Notice>
      )}
      <section>
        <h2 className="mb-3 font-display text-2xl font-black">D&apos;autres bons plans autour de toi</h2>
        <DealsExplorer defaultQuery={d?.merchant.postalCode ?? ""} publicMode />
      </section>
      <div className="rounded-[1.5rem] bg-surface-2 p-5 text-center"><p className="font-display text-xl font-extrabold">Et sur ton forfait, combien pourrais-tu économiser ?</p><LinkButton href="/diagnostic" className="mt-3">Faire le diagnostic gratuit</LinkButton></div>
    </div>
  );
}
