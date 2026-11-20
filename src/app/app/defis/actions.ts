"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { rateLimit } from "@/lib/api";
import { track } from "@/lib/analytics";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export interface ChallengeState { error?: string }
const MAX_MEMBERS = 10;
const Nick = z.string().trim().min(1, "Choisis un pseudo.").max(30);

async function session() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion");
  return { supabase, user: data.user };
}

export async function createChallenge(_prev: ChallengeState, form: FormData): Promise<ChallengeState> {
  const { user } = await session();
  const parsed = z.object({ title: z.string().trim().min(3, "Donne un nom au défi.").max(80), goal: z.coerce.number().int().min(10, "Objectif minimum : 10 €.").max(100000), nickname: Nick }).safeParse({ title: form.get("title"), goal: form.get("goal"), nickname: form.get("nickname") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try { await rateLimit(`challenge-create:${user.id}`, 5, 86400); } catch { return { error: "Tu as créé plusieurs défis aujourd'hui. Réessaie demain." }; }
  const db = supabaseAdmin();
  const { data: c, error } = await db.from("challenges").insert({ owner_id: user.id, title: parsed.data.title, goal_cents: parsed.data.goal * 100 }).select("id").single();
  if (error || !c) return { error: "Création impossible." };
  await db.from("challenge_members").insert({ challenge_id: c.id, user_id: user.id, nickname: parsed.data.nickname });
  await track("challenge_created", { userId: user.id });
  redirect(`/app/defis/${c.id}`);
}

/** Rejoindre un défi : uniquement avec le lien d'invitation privé. */
export async function joinChallenge(_prev: ChallengeState, form: FormData): Promise<ChallengeState> {
  const { user } = await session();
  const parsed = z.object({ token: z.string().regex(/^[0-9a-f]{24}$/), nickname: Nick, share: z.boolean() }).safeParse({ token: form.get("token"), nickname: form.get("nickname"), share: form.get("share") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try { await rateLimit(`challenge-join:${user.id}`, 20, 3600); } catch { return { error: "Trop de tentatives. Réessaie plus tard." }; }
  const db = supabaseAdmin();
  const { data: c } = await db.from("challenges").select("id, owner_id, title").eq("invite_token", parsed.data.token).maybeSingle();
  if (!c) return { error: "Ce lien d'invitation n'est plus valide." };
  const { count } = await db.from("challenge_members").select("user_id", { count: "exact", head: true }).eq("challenge_id", c.id);
  const { data: already } = await db.from("challenge_members").select("user_id").eq("challenge_id", c.id).eq("user_id", user.id).maybeSingle();
  if (!already) {
    if ((count ?? 0) >= MAX_MEMBERS) return { error: `Ce défi est complet (${MAX_MEMBERS} participants).` };
    const { error } = await db.from("challenge_members").insert({ challenge_id: c.id, user_id: user.id, nickname: parsed.data.nickname, share_amounts: parsed.data.share });
    if (error) return { error: "Impossible de rejoindre ce défi." };
    await track("challenge_joined", { userId: user.id });
    await db.from("notifications").insert({ user_id: c.owner_id, kind: "challenge", title: "Un proche a rejoint ton défi", body: `${parsed.data.nickname} participe à « ${c.title} ».`, link: `/app/defis/${c.id}` });
  }
  redirect(`/app/defis/${c.id}`);
}

export async function leaveChallenge(form: FormData) {
  const { supabase, user } = await session();
  const id = String(form.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const { data: c } = await supabase.from("challenges").select("owner_id").eq("id", id).maybeSingle();
  if (c?.owner_id === user.id) await supabase.from("challenges").delete().eq("id", id); // le créateur supprime le défi pour tous
  else await supabase.from("challenge_members").delete().eq("challenge_id", id).eq("user_id", user.id);
  revalidatePath("/app/defis");
  redirect("/app/defis");
}

export async function setChallengeSharing(form: FormData) {
  const { supabase, user } = await session();
  const id = String(form.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  await supabase.from("challenge_members").update({ share_amounts: form.get("share") === "on" }).eq("challenge_id", id).eq("user_id", user.id);
  revalidatePath(`/app/defis/${id}`);
}
