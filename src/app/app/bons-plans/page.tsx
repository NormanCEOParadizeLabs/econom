import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DealsExplorer } from "@/components/deals-explorer";
import { LinkButton, PageTitle } from "@/components/ui";
import { IconHeart, IconPlus } from "@/components/icons";
import { getMe } from "@/lib/me";
import { dealsByIds } from "@/lib/services/deals";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bons plans près de moi" };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const supabase = await supabaseServer();
  const { data: favs } = await supabase.from("favorites").select("ref_id").eq("kind", "deal");
  const favorites = await dealsByIds((favs ?? []).map((f) => f.ref_id));
  return (
    <>
      <PageTitle title="Près de moi" subtitle="Des bons plans sourcés et datés. Jamais de promotion inventée." action={<LinkButton href="/app/bons-plans/proposer" size="sm" variant="outline"><IconPlus width={18} height={18} /> Proposer</LinkButton>} />
      {favorites.length > 0 && (
        <section className="mb-5" aria-label="Mes favoris">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold"><IconHeart width={18} height={18} /> Mes favoris</h2>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {favorites.map((d) => <li key={d.id} className="shrink-0"><Link href={`/app/bons-plans/${d.id}`} className="block rounded-2xl border border-line bg-surface px-4 py-3 text-sm"><span className="block font-bold">{d.merchant.name}</span><span className="text-muted">{d.dealLabel}</span></Link></li>)}
          </ul>
        </section>
      )}
      <DealsExplorer defaultQuery={me.profile?.postal_code ?? me.profile?.city ?? ""} />
    </>
  );
}
