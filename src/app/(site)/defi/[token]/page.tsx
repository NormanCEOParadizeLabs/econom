import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinChallengeForm } from "@/components/challenge-forms";
import { Card, LinkButton } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { euro } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Tu es invité à un Défi ECONOM.", description: "Rejoins un défi privé entre proches pour trouver des économies ensemble.", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{24}$/.test(token)) notFound();
  // Seuls le titre, l'objectif et le nombre de participants sont montrés avant de rejoindre.
  const { data: c } = await supabaseAdmin().from("challenges").select("title, goal_cents, challenge_members(count)").eq("invite_token", token).maybeSingle();
  if (!c) notFound();
  const user = await getUser().catch(() => null);
  const count = (c.challenge_members as unknown as { count: number }[])[0]?.count ?? 1;
  const next = encodeURIComponent(`/defi/${token}`);
  return (
    <div className="mx-auto max-w-xl px-4 py-10 space-y-4">
      <div className="on-hero rounded-[2rem] bg-hero p-7 text-white">
        <p className="text-sm font-bold text-white/80">Défi ECONOM. · {count} participant{count > 1 ? "s" : ""}</p>
        <h1 className="mt-2 font-display text-4xl font-black leading-[1.02]">{c.title}</h1>
        <p className="mt-3 text-white/90">Objectif du groupe : <strong className="text-accent">{euro(c.goal_cents, { decimals: false })}</strong> d&apos;économies potentielles. Chacun vérifie ses propres dépenses ; le groupe ne voit que des totaux.</p>
      </div>
      <Card>
        {user ? <JoinChallengeForm token={token} defaultNick="" /> : (
          <div className="space-y-3">
            <p className="font-bold">Crée ton compte gratuit pour rejoindre le défi.</p>
            <p className="text-sm text-muted">Tu peux aussi commencer par un diagnostic sans compte, puis revenir sur ce lien.</p>
            <LinkButton href={`/inscription?next=${next}`} full size="lg">Créer mon compte gratuit</LinkButton>
            <LinkButton href={`/connexion?next=${next}`} full variant="outline">J&apos;ai déjà un compte</LinkButton>
            <LinkButton href="/diagnostic" full variant="ghost">Faire d&apos;abord un diagnostic</LinkButton>
          </div>
        )}
      </Card>
    </div>
  );
}
