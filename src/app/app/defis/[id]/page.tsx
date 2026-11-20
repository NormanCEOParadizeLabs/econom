import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { leaveChallenge, setChallengeSharing } from "@/app/app/defis/actions";
import { InviteButton } from "@/components/savings-card";
import { Badge, Button, Card, LinkButton, Notice, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { euro } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Défi ECONOM." };
interface Member { nickname: string; is_me: boolean; is_owner: boolean; shares: boolean; diagnostics: number; potential_cents: number | null; confirmed_monthly_cents: number | null }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const supabase = await supabaseServer();
  const { data: c } = await supabase.from("challenges").select("id, title, goal_cents, invite_token, owner_id").eq("id", id).maybeSingle(); // RLS : membres uniquement
  if (!c) notFound();
  const { data: summary } = await supabase.rpc("challenge_summary", { p_challenge: id });
  const members = ((summary as { members: Member[] } | null)?.members ?? []);
  const potential = members.reduce((a, m) => a + (m.potential_cents ?? 0), 0);
  const confirmed = members.reduce((a, m) => a + (m.confirmed_monthly_cents ?? 0), 0);
  const pct = Math.min(100, Math.round((potential / c.goal_cents) * 100));
  const me = members.find((m) => m.is_me);
  const isOwner = c.owner_id === user.id;
  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/app/defis" className="font-bold text-brand-strong">← Défis</Link></p>
      <PageTitle title={c.title} subtitle={`${members.length} participant${members.length > 1 ? "s" : ""} · défi privé`} />
      <section className="on-hero rounded-[2rem] bg-hero p-6 text-white">
        <p className="text-sm font-bold text-white/80">Économies potentielles identifiées par le groupe</p>
        <p className="num text-5xl font-black text-accent">{euro(potential, { decimals: false })}<span className="text-lg text-white/80"> / {euro(c.goal_cents, { decimals: false })}</span></p>
        <div className="mt-3 h-3 rounded-full bg-white/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression du défi"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(3, pct)}%` }} /></div>
        <p className="mt-2 text-sm text-white/85">{pct >= 100 ? "Objectif atteint ! Reste à transformer ces économies potentielles en économies réelles." : `${pct} % de l'objectif. Estimations issues des comparaisons de chacun.`}</p>
        <div className="mt-4 rounded-2xl bg-white/10 p-3"><p className="text-xs font-bold text-white/75">Économies réellement confirmées par le groupe</p><p className="num text-2xl font-black">{euro(confirmed)}<span className="text-sm font-bold text-white/80"> par mois</span></p></div>
      </section>
      <Card>
        <h2 className="font-display text-lg font-extrabold">Participants</h2>
        <ul className="mt-2 divide-y divide-line">
          {members.map((m, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-3">
              <span><span className="font-bold">{m.nickname}</span>{m.is_me && <Badge className="ml-2">Toi</Badge>}{m.is_owner && <Badge tone="brand" className="ml-2">Créateur</Badge>}<span className="block text-xs text-muted">{m.diagnostics} diagnostic{m.diagnostics > 1 ? "s" : ""} depuis le début du défi</span></span>
              {m.shares ? <span className="text-right text-sm"><span className="num block font-black">{euro(m.potential_cents ?? 0, { decimals: false })}</span><span className="text-xs text-muted">potentiels · {euro(m.confirmed_monthly_cents ?? 0)}/mois confirmés</span></span> : <Badge>Montants masqués</Badge>}
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        <InviteButton link={`${env.appUrl}/d/${c.invite_token}`} label="Inviter un proche dans le défi" variant="primary" full />
        <LinkButton href="/app/comparer" variant="outline" full>Faire un diagnostic</LinkButton>
      </div>
      {me && (
        <Card>
          <form action={setChallengeSharing} className="flex items-center justify-between gap-3">
            <input type="hidden" name="id" value={c.id} />
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="share" defaultChecked={me.shares} className="mt-0.5 h-5 w-5 accent-[var(--brand)]" /><span><span className="block font-bold">Partager mes totaux avec le groupe</span><span className="text-muted">Jamais le détail de tes contrats ou dépenses.</span></span></label>
            <Button type="submit" size="sm" variant="outline">Enregistrer</Button>
          </form>
        </Card>
      )}
      <Notice>Le groupe ne voit que des totaux par participant. Les économies « potentielles » sont des estimations ; seules celles que chacun confirme comptent comme réelles.</Notice>
      <form action={leaveChallenge} className="text-center">
        <input type="hidden" name="id" value={c.id} />
        <Button type="submit" variant="ghost" size="sm" className="!text-danger">{isOwner ? "Supprimer ce défi pour tout le monde" : "Quitter ce défi"}</Button>
      </form>
    </div>
  );
}
