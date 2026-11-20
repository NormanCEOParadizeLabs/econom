"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { ApiError, rateLimit } from "@/lib/api";
import { track } from "@/lib/analytics";
import { claimReferral } from "@/lib/services/referral";

export interface AuthState {
  error?: string;
  info?: string;
  fields?: Record<string, string>;
}

const safeNext = (n: unknown, fallback = "/app") => (typeof n === "string" && /^\/(?!\/)[\w\-./?=&%]*$/.test(n) ? n : fallback);

async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 64);
  const ua = h.get("user-agent") ?? "";
  const device = /iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Android/.test(ua) ? "Android" : /Mac OS X|Windows|Linux/.test(ua) ? "Ordinateur" : "Autre";
  return { ip, device };
}

async function limited(key: string, max: number, windowS: number): Promise<string | null> {
  try {
    await rateLimit(key, max, windowS);
    return null;
  } catch (e) {
    return e instanceof ApiError ? "Trop de tentatives. Réessaie dans quelques minutes." : null;
  }
}

const Email = z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide.")).pipe(z.string().max(254));
const Password = z.string().min(10, "10 caractères minimum.").max(72, "72 caractères maximum.");

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email: Email, password: z.string().min(1).max(72) }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "E-mail ou mot de passe invalide." };
  const { ip, device } = await requestMeta();
  const blocked = (await limited(`login:${ip}`, 12, 600)) ?? (await limited(`login:${parsed.data.email}`, 8, 600));
  if (blocked) return { error: blocked };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return { error: "Confirme d'abord ton adresse e-mail grâce au lien reçu." };
    return { error: "E-mail ou mot de passe incorrect." }; // message identique : pas d'énumération de comptes
  }
  await supabaseAdmin().from("login_history").insert({ user_id: data.user.id, device });
  redirect(safeNext(form.get("next")));
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      email: Email,
      password: Password,
      name: z.string().trim().max(60).optional(),
      terms: z.literal("on", { error: "Tu dois accepter les conditions pour créer un compte." }),
      referral: z.string().trim().max(12).optional(),
      source: z.string().trim().max(40).optional(),
    })
    .safeParse(Object.fromEntries(["email", "password", "name", "terms", "referral", "source"].map((k) => [k, form.get(k) ?? undefined])));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { error: "Vérifie les champs indiqués.", fields };
  }
  const { ip, device } = await requestMeta();
  const blocked = await limited(`signup:${ip}`, 6, 3600);
  if (blocked) return { error: blocked };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${env.appUrl}/auth/callback?next=/app/bienvenue`, data: { display_name: parsed.data.name ?? "" } },
  });
  if (error) {
    if (error.code === "weak_password") return { error: "Ce mot de passe est trop fragile.", fields: { password: "Choisis un mot de passe plus long ou moins courant." } };
    if (error.code === "over_email_send_rate_limit") return { error: "Trop d'e-mails envoyés. Réessaie dans une minute." };
    if (error.code === "user_already_exists") return { info: "Si cette adresse n'a pas encore de compte, un e-mail de confirmation vient d'être envoyé." };
    return { error: "Inscription impossible pour le moment. Réessaie dans un instant." };
  }
  const user = data.user;
  // Compte déjà existant : Supabase renvoie un utilisateur sans identité. Même message, sans rien révéler.
  if (!user || (user.identities && user.identities.length === 0)) {
    return { info: "Si cette adresse n'a pas encore de compte, un e-mail de confirmation vient d'être envoyé." };
  }
  if (parsed.data.referral) await claimReferral(user.id, parsed.data.email, parsed.data.referral);
  await track("account_created", { userId: user.id, source: parsed.data.source ?? null, props: { referred: Boolean(parsed.data.referral) } });
  if (!data.session) return { info: "Presque fini : clique sur le lien que nous venons d'envoyer à ton adresse e-mail pour activer ton compte." };
  await supabaseAdmin().from("login_history").insert({ user_id: user.id, device });
  redirect("/app/bienvenue");
}

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Adresse e-mail invalide." };
  const { ip } = await requestMeta();
  const blocked = await limited(`reset:${ip}`, 5, 3600);
  if (blocked) return { error: blocked };
  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${env.appUrl}/auth/callback?next=/reinitialiser` });
  return { info: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé." };
}

export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Password.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Lien expiré. Demande un nouveau lien de réinitialisation." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: error.code === "same_password" ? "Choisis un mot de passe différent de l'ancien." : "Mot de passe refusé. Essaie-en un plus long." };
  redirect("/app?mdp=ok");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
