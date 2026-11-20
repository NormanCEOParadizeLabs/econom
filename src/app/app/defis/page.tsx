import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateChallengeForm } from "@/components/challenge-forms";
import { Card, PageTitle } from "@/components/ui";
import { IconChevron } from "@/components/icons";
import { euro } from "@/lib/format";
import { getMe } from "@/lib/me";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Défis ECONOM." };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/connexion");
  const supabase = await supabaseServer();
  const { data } = await supabase.from("challenges").select("id, title, goal_cents, challenge_members(count)").order("created_at", { ascending: false });
  return (
    <div className="space-y-5">
      <PageTitle title="Défis ECONOM." subtitle="Trouvez des économies à plusieurs. Privé, entre proches." />
      {data?.length ? (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id}><Link href={`/app/defis/${c.id}`} className="pressable flex items-center gap-3 rounded-[1.25rem] border border-line bg-surface p-4 hover:border-brand"><span className="flex-1"><span className="block font-bold">{c.title}</span><span className="text-xs text-muted">Objectif {euro(c.goal_cents, { decimals: false })} · {(c.challenge_members as unknown as { count: number }[])[0]?.count ?? 1} participant(s)</span></span><IconChevron width={18} height={18} className="text-muted" /></Link></li>
          ))}
        </ul>
      ) : null}
      <Card><h2 className="mb-3 font-display text-lg font-extrabold">Lancer un défi</h2><CreateChallengeForm defaultNick={me.profile?.display_name ?? ""} /></Card>
      <p className="text-xs text-muted">Un défi est privé : seules les personnes qui ont ton lien d&apos;invitation peuvent le rejoindre. Chacun fait ses propres diagnostics ; le groupe ne voit que des totaux.</p>
    </div>
  );
}
