import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { toggleFavorite } from "@/app/app/actions";
import { DealShareButton } from "@/components/deal-share";
import { env } from "@/lib/env";
import { Badge, Button, Card, Notice } from "@/components/ui";
import { IconClock, IconExternal, IconHeart, IconPin } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { DEAL_CATEGORIES, dateFr } from "@/lib/format";
import { dealById } from "@/lib/services/deals";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bon plan" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  await requireUser();
  const d = await dealById(id);
  if (!d) notFound();
  const supabase = await supabaseServer();
  const { data: fav } = await supabase.from("favorites").select("ref_id").eq("kind", "deal").eq("ref_id", id).maybeSingle();
  const m = d.merchant;
  const maps = `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=17/${m.lat}/${m.lon}`;
  return (
    <article className="space-y-4 animate-rise">
      <p className="text-sm"><Link href="/app/bons-plans" className="font-bold text-brand-strong">← Bons plans</Link></p>
      <div className="on-hero rounded-[2rem] bg-hero p-6 text-white">
        <div className="flex flex-wrap gap-2"><Badge tone="accent">{DEAL_CATEGORIES[d.category]}</Badge>{d.isSponsored && <Badge tone="warn">Sponsorisé</Badge>}</div>
        <p className="num mt-4 inline-block -rotate-1 rounded-2xl bg-accent px-3 py-1 text-4xl font-black text-on-accent">{d.dealLabel}</p>
        <h1 className="mt-4 font-display text-3xl font-black leading-tight">{d.title}</h1>
        <p className="mt-1 text-white/85">{m.name}</p>
      </div>
      {d.description && <p className="leading-relaxed">{d.description}</p>}
      <Card className="space-y-3">
        <div className="flex gap-3"><IconPin className="mt-0.5 shrink-0 text-brand-strong" /><div><p className="font-bold">{m.name}</p><p className="text-sm text-muted">{m.address}, {m.postalCode} {m.city}</p><a href={maps} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-brand-strong underline underline-offset-4">Voir sur la carte</a></div></div>
        {(m.phone || m.website) && (
          <p className="text-sm">
            {m.phone && <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="font-bold underline underline-offset-4">{m.phone}</a>}
            {m.phone && m.website && " · "}
            {m.website && <a href={m.website} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">Site officiel</a>}
          </p>
        )}
        <div className="flex gap-3"><IconClock className="mt-0.5 shrink-0 text-brand-strong" /><p className="text-sm"><strong>{d.validUntil ? `Valable jusqu'au ${dateFr(d.validUntil)}` : "Offre permanente"}</strong><br /><span className="text-muted">{d.auto ? "Repérée automatiquement, source contrôlée le" : "Vérifiée le"} {dateFr(d.verifiedAt)}</span></p></div>
      </Card>
      {d.conditions && <Card><h2 className="font-bold">Conditions</h2><p className="mt-1 text-sm leading-relaxed text-muted">{d.conditions}</p></Card>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href={d.useUrl ?? d.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="pressable inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-5 font-bold text-on-brand">{d.useUrl ? "Profiter de l'offre" : "Voir la source officielle"} <IconExternal width={18} height={18} /></a>
        <DealShareButton url={`${env.appUrl}/bon-plan/${d.id}`} title={`${d.dealLabel} chez ${m.name}`} />
        <form action={toggleFavorite}>
          <input type="hidden" name="kind" value="deal" /><input type="hidden" name="ref_id" value={d.id} />
          <Button type="submit" variant="outline" full aria-pressed={Boolean(fav)}><IconHeart width={18} height={18} fill={fav ? "currentColor" : "none"} /> {fav ? "Dans mes favoris" : "Ajouter aux favoris"}</Button>
        </form>
      </div>
      <Notice>Source : <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-bold underline underline-offset-4 break-all">{new URL(d.sourceUrl).hostname}</a>. Les conditions peuvent changer : vérifie auprès du commerce avant de te déplacer.</Notice>
    </article>
  );
}
