"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/api";
import { track } from "@/lib/analytics";

export interface FormState {
  error?: string;
  ok?: string;
  code?: string;
  fields?: Record<string, string>;
}

async function session() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion");
  return { supabase, user: data.user };
}

const blank = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? undefined : String(v).trim());
const euros = z.preprocess((v) => (typeof v === "string" ? Number(v.replace(",", ".").replace(/\s/g, "")) : v), z.number({ error: "Montant invalide." }).min(0, "Montant invalide.").max(100000, "Montant trop élevé."));
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.").optional();
const httpsUrl = z.string().max(300).regex(/^https:\/\/[^\s]+$/, "Le lien doit commencer par https://").optional();

const ContractSchema = z.object({
  name: z.string().min(1, "Donne un nom à cet abonnement.").max(80),
  category: z.enum(["telephone", "internet", "streaming", "musique", "sport", "logiciels", "services", "energie", "assurance", "autre"]),
  price: euros,
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  next_charge_date: optDate,
  commitment_end: optDate,
  renewal_date: optDate,
  cancellation_terms: z.string().max(600).optional(),
  manage_url: httpsUrl,
  notes: z.string().max(1000).optional(),
  reminder_days: z.coerce.number().int().min(0).max(60).optional(),
  to_review: z.boolean(),
});

export async function saveContract(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await session();
  const raw = Object.fromEntries(["name", "category", "price", "frequency", "next_charge_date", "commitment_end", "renewal_date", "cancellation_terms", "manage_url", "notes", "reminder_days"].map((k) => [k, blank(form.get(k))]));
  const parsed = ContractSchema.safeParse({ ...raw, to_review: form.get("to_review") === "on" });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { error: "Vérifie les champs indiqués.", fields };
  }
  const { price, ...rest } = parsed.data;
  const row = {
    ...rest, price_cents: Math.round(price * 100),
    next_charge_date: rest.next_charge_date ?? null, commitment_end: rest.commitment_end ?? null, renewal_date: rest.renewal_date ?? null,
    cancellation_terms: rest.cancellation_terms ?? null, manage_url: rest.manage_url ?? null, notes: rest.notes ?? null, reminder_days: rest.reminder_days ?? null,
    updated_at: new Date().toISOString(),
  };
  const id = blank(form.get("id"));
  if (id) {
    if (!z.uuid().safeParse(id).success) return { error: "Abonnement introuvable." };
    const { data, error } = await supabase.from("user_contracts").update(row).eq("id", id).eq("user_id", user.id).select("id");
    if (error || !data?.length) return { error: "Modification impossible." };
  } else {
    const { error } = await supabase.from("user_contracts").insert({ ...row, user_id: user.id });
    if (error) {
      // Limite de la formule gratuite, appliquée par la base de données.
      if (error.message.includes("PLAN_LIMIT_CONTRACTS")) return { code: "plan_limit", error: "La formule gratuite permet de suivre un abonnement. Passe à ECONOM. Plus pour les suivre tous." };
      return { error: "Enregistrement impossible." };
    }
  }
  revalidatePath("/app", "layout");
  redirect("/app/abonnements");
}

export async function deleteContract(form: FormData) {
  const { supabase, user } = await session();
  const id = String(form.get("id") ?? "");
  if (z.uuid().safeParse(id).success) await supabase.from("user_contracts").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app", "layout");
  redirect("/app/abonnements");
}

/** Cycle de vie d'une économie : potentielle → changement lancé → confirmée par l'utilisateur. */
export async function setOpportunityStatus(form: FormData) {
  const { supabase, user } = await session();
  const parsed = z.object({ id: z.uuid(), status: z.enum(["initiated", "confirmed", "dismissed", "potential"]) }).safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return;
  const { data: opp } = await supabase.from("saving_opportunities").select("id, title, monthly_saving_cents, status").eq("id", parsed.data.id).eq("user_id", user.id).maybeSingle();
  if (!opp) return;
  await supabase.from("saving_opportunities").update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq("id", opp.id);
  if (parsed.data.status === "confirmed" && opp.status !== "confirmed" && opp.monthly_saving_cents > 0) {
    await supabase.from("realized_savings").insert({ user_id: user.id, opportunity_id: opp.id, label: opp.title, monthly_cents: opp.monthly_saving_cents, kind: "confirmed" });
    await track("saving_confirmed", { userId: user.id, props: { monthly_cents: opp.monthly_saving_cents } });
  }
  revalidatePath("/app", "layout");
}

export async function addRealizedSaving(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await session();
  const parsed = z.object({ label: z.string().min(1, "Décris cette économie.").max(120), amount: euros.refine((v) => v > 0, "Indique un montant.") }).safeParse({ label: blank(form.get("label")), amount: blank(form.get("amount")) });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("realized_savings").insert({ user_id: user.id, label: parsed.data.label, monthly_cents: Math.round(parsed.data.amount * 100), kind: "confirmed" });
  if (error) return { error: "Enregistrement impossible." };
  await track("saving_confirmed", { userId: user.id, props: { monthly_cents: Math.round(parsed.data.amount * 100), manual: true } });
  revalidatePath("/app", "layout");
  return { ok: "Économie ajoutée." };
}

export async function deleteRealizedSaving(form: FormData) {
  const { supabase, user } = await session();
  const id = String(form.get("id") ?? "");
  if (z.uuid().safeParse(id).success) await supabase.from("realized_savings").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app", "layout");
}

export async function toggleFavorite(form: FormData) {
  const { supabase, user } = await session();
  const parsed = z.object({ kind: z.enum(["deal", "offer"]), ref_id: z.uuid() }).safeParse({ kind: form.get("kind"), ref_id: form.get("ref_id") });
  if (!parsed.success) return;
  const { data } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("kind", parsed.data.kind).eq("ref_id", parsed.data.ref_id).select("ref_id");
  if (!data?.length) await supabase.from("favorites").insert({ user_id: user.id, ...parsed.data });
  revalidatePath("/app/bons-plans", "layout");
}

export async function markNotificationsRead() {
  const { supabase, user } = await session();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/app", "layout");
}

export async function deleteAnalysis(form: FormData) {
  const { supabase, user } = await session();
  const id = String(form.get("id") ?? "");
  if (z.uuid().safeParse(id).success) await supabase.from("document_analyses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/analyses");
  redirect("/app/analyses");
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await session();
  const parsed = z
    .object({ display_name: z.string().max(60).optional(), city: z.string().max(80).optional(), postal_code: z.string().regex(/^\d{5}$/, "Code postal à 5 chiffres.").optional() })
    .safeParse({ display_name: blank(form.get("display_name")), city: blank(form.get("city")), postal_code: blank(form.get("postal_code")) });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.display_name ?? null, city: parsed.data.city ?? null, postal_code: parsed.data.postal_code ?? null }).eq("id", user.id);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/app", "layout");
  return { ok: "Profil mis à jour." };
}

export async function updatePreferences(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await session();
  const on = (k: string) => form.get(k) === "on";
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: user.id, notif_email: on("notif_email"), notif_push: on("notif_push"), notif_deals: on("notif_deals"), notif_monthly_summary: on("notif_monthly_summary"),
    analytics_consent: on("analytics_consent"), updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/app/parametres");
  return { ok: "Préférences enregistrées." };
}

export async function completeOnboarding() {
  const { supabase, user } = await session();
  await supabase.from("profiles").update({ onboarding_done: true }).eq("id", user.id);
  await track("onboarding_completed", { userId: user.id });
  redirect("/app");
}

const DealSchema = z.object({
  merchant: z.string().min(2, "Nom du commerce requis.").max(100),
  address: z.string().min(3, "Adresse requise.").max(200),
  postal_code: z.string().regex(/^\d{5}$/, "Code postal à 5 chiffres."),
  city: z.string().min(1, "Ville requise.").max(80),
  title: z.string().min(3, "Titre requis.").max(120),
  category: z.enum(["alimentation", "restaurants", "shopping", "loisirs", "activites", "services", "beaute", "sport", "etudiants", "promotions"]),
  deal_label: z.string().min(1, "Indique l'avantage (ex. −10 %).").max(60),
  conditions: z.string().max(600).optional(),
  valid_until: optDate,
  source_url: z.string().max(300).regex(/^https:\/\/[^\s]+$/, "Lien de preuve en https:// requis."),
});

/** Soumission d'un bon plan : jamais publié directement, toujours modéré par un administrateur. */
export async function submitDeal(_prev: FormState, form: FormData): Promise<FormState> {
  const { user } = await session();
  try {
    await rateLimit(`deal-submit:${user.id}`, 5, 86400);
  } catch {
    return { error: "Tu as déjà proposé plusieurs bons plans aujourd'hui. Réessaie demain." };
  }
  const parsed = DealSchema.safeParse(Object.fromEntries(["merchant", "address", "postal_code", "city", "title", "category", "deal_label", "conditions", "valid_until", "source_url"].map((k) => [k, blank(form.get(k))])));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { error: "Vérifie les champs indiqués.", fields };
  }
  const d = parsed.data;
  // Géocodage officiel (Base Adresse Nationale) ; sans résultat fiable, la soumission est refusée.
  let lat: number | null = null, lon: number | null = null;
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(`${d.address} ${d.postal_code} ${d.city}`)}&limit=1`, { signal: AbortSignal.timeout(6000) });
    const f = (await res.json())?.features?.[0];
    if (f && f.properties?.score > 0.5) [lon, lat] = f.geometry.coordinates;
  } catch {}
  if (lat === null || lon === null) return { error: "Adresse introuvable. Vérifie le numéro, la rue et le code postal." };
  const db = supabaseAdmin();
  const { data: m, error: e1 } = await db.from("merchant_locations").insert({ name: d.merchant, address: d.address, postal_code: d.postal_code, city: d.city, lat, lon }).select("id").single();
  if (e1 || !m) return { error: "Enregistrement impossible." };
  const { error: e2 } = await db.from("local_deals").insert({
    merchant_id: m.id, title: d.title, category: d.category, deal_label: d.deal_label, conditions: d.conditions ?? null, valid_until: d.valid_until ?? null,
    source_url: d.source_url, status: "submitted", submitted_by: user.id,
  });
  if (e2) return { error: "Enregistrement impossible." };
  return { ok: "Merci ! Ta proposition sera vérifiée par notre équipe avant d'être publiée." };
}
