"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/api";
import { getUser, isAdmin } from "@/lib/auth";
import { DEAL_CATEGORIES } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  addDays, todayParis, DEAL_DEFAULT_RECHECK_DAYS, DEAL_MAX_RECHECK_DAYS, HOST_NETWORKS, OFFER_MAX_VALIDITY_DAYS, type ActionState,
} from "./_lib/util";

// ───────────────────────────── Garde-fous communs

/** Revérifie le rôle admin côté serveur (table `admins`) à CHAQUE action. */
async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Accès refusé");
  const user = await getUser();
  if (!user) throw new Error("Accès refusé");
  return user;
}

const done = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
const fail = (message: string, errors?: string[]): ActionState => ({ ok: false, message, errors, at: Date.now() });

const FR = z.locales.fr().localeError;

function parseForm<T extends z.ZodType>(schema: T, formData: FormData, labels: Record<string, string> = {}):
  { data: z.infer<T>; state?: undefined } | { data?: undefined; state: ActionState } {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") raw[k] = v;
  const parsed = schema.safeParse(raw, { error: FR });
  if (parsed.success) return { data: parsed.data };
  const errors = parsed.error.issues.slice(0, 12).map((i) => {
    const key = String(i.path[0] ?? "");
    return `${labels[key] ?? key} : ${i.message}`;
  });
  return { state: fail("Certains champs sont invalides.", errors) };
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  offers_intro_consistent: "Sans période promotionnelle (0 mois), le prix après promo doit être égal au prix mensuel.",
  offers_verified_has_dates: "Une offre vérifiée doit avoir une date de vérification et une date d'expiration.",
  deals_verified_has_date: "Un bon plan vérifié doit avoir une date de vérification et une date de recontrôle.",
  providers_slug_check: "Identifiant d'opérateur invalide (2 à 40 caractères : minuscules, chiffres, tirets).",
  providers_slug_key: "Cet identifiant d'opérateur existe déjà.",
  offers_url_check: "L'URL de l'offre doit commencer par https://.",
  offer_sources_url_check: "L'URL de la source doit commencer par https://.",
  local_deals_source_url_check: "L'URL de la source doit commencer par https://.",
  merchant_locations_postal_code_check: "Le code postal doit comporter 5 chiffres.",
};

function dbFail(error: { code?: string; message?: string } | null, context: string): ActionState {
  const constraint = /constraint "([a-z0-9_]+)"/i.exec(error?.message ?? "")?.[1];
  if (constraint && CONSTRAINT_MESSAGES[constraint]) return fail(`${context} : ${CONSTRAINT_MESSAGES[constraint]}`);
  switch (error?.code) {
    case "23505": return fail(`${context} : cette valeur existe déjà (doublon).`);
    case "23514": return fail(`${context} : une valeur ne respecte pas les règles de la base${constraint ? ` (contrainte ${constraint})` : ""}.`);
    case "23503": return fail(`${context} : élément lié introuvable ou encore utilisé ailleurs.`);
    case "23502": return fail(`${context} : un champ obligatoire est vide.`);
    case "22P02": return fail(`${context} : format de valeur invalide.`);
    default: return fail(`${context} : erreur de base de données${error?.code ? ` (code ${error.code})` : ""}. Réessaie dans un instant.`);
  }
}

// ───────────────────────────── Briques de validation (FormData → valeurs typées)

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const toNum = (v: unknown) => {
  const b = blank(v);
  if (typeof b !== "string") return b;
  const n = Number(b.replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(n) ? b : n;
};
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const id = z.guid("Identifiant invalide");
const optId = z.preprocess(blank, id.optional());
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const optText = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional()).transform((v) => v ?? null);
const https = z.string().trim().max(500)
  .regex(/^https:\/\/\S+$/, "L'URL doit commencer par https://")
  .refine((v) => URL.canParse(v), "URL invalide");
const optHttps = z.preprocess(blank, https.optional()).transform((v) => v ?? null);
const num = (min: number, max: number) => z.preprocess(toNum, z.number().min(min).max(max));
const int = (min: number, max: number) => z.preprocess(toNum, z.number().int().min(min).max(max));
const intOr0 = (max: number) => z.preprocess((v) => toNum(v) ?? 0, z.number().int().min(0).max(max));
const optNum = (min: number, max: number) => z.preprocess(toNum, z.number().min(min).max(max).optional()).transform((v) => v ?? null);
const optInt = (min: number, max: number) => z.preprocess(toNum, z.number().int().min(min).max(max).optional()).transform((v) => v ?? null);
/** Montant saisi en euros → centimes. */
const cents = (maxEuros: number) => z.preprocess(toNum, z.number().min(0).max(maxEuros)).transform((v) => Math.round(v * 100));
const centsOr0 = (maxEuros: number) => z.preprocess((v) => toNum(v) ?? 0, z.number().min(0).max(maxEuros)).transform((v) => Math.round(v * 100));
const optCents = (maxEuros: number) => z.preprocess(toNum, z.number().min(0).max(maxEuros).optional()).transform((v) => (v === undefined ? null : Math.round(v * 100)));
const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)")
  .refine((v) => !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime()), "Date invalide");
const optDate = z.preprocess(blank, date.optional()).transform((v) => v ?? null);

/** Une vérification d'offre vaut au plus 45 jours et doit expirer dans le futur. */
function validityError(validUntil: string | null): string | null {
  const today = todayParis();
  if (!validUntil) return "Indique une date d'expiration de la vérification.";
  if (validUntil <= today) return "La date d'expiration doit être dans le futur.";
  if (validUntil > addDays(today, OFFER_MAX_VALIDITY_DAYS)) return `La date d'expiration ne peut pas dépasser ${OFFER_MAX_VALIDITY_DAYS} jours (jusqu'au ${addDays(today, OFFER_MAX_VALIDITY_DAYS)}).`;
  return null;
}

// ───────────────────────────── Utilisateurs

const GrantSchema = z.object({ user_id: id, days: int(1, 90), reason: text(5, 300) });

export async function grantPlusDays(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(GrantSchema, formData, { user_id: "Utilisateur", days: "Nombre de jours", reason: "Motif" });
  if (p.state) return p.state;
  const { user_id, days, reason } = p.data;
  const db = supabaseAdmin();
  const { data: sub, error } = await db.from("subscriptions").select("bonus_until").eq("user_id", user_id).maybeSingle();
  if (error) return dbFail(error, "Lecture de l'abonnement");
  if (!sub) return fail("Aucune ligne d'abonnement pour cet utilisateur.");
  // Le geste s'ajoute à un éventuel avantage encore en cours.
  const current = sub.bonus_until ? new Date(sub.bonus_until).getTime() : 0;
  const bonusUntil = new Date(Math.max(current, Date.now()) + days * 86_400_000).toISOString();
  const { error: upErr } = await db.from("subscriptions").update({ bonus_until: bonusUntil, updated_at: new Date().toISOString() }).eq("user_id", user_id);
  if (upErr) return dbFail(upErr, "Mise à jour de l'abonnement");
  await audit(admin.id, "admin.user.grant_plus", "subscriptions", user_id, { days, reason, previous_bonus_until: sub.bonus_until, bonus_until: bonusUntil });
  revalidatePath("/admin");
  return done(`${days} jour${days > 1 ? "s" : ""} de Plus accordé${days > 1 ? "s" : ""}.`);
}

// ───────────────────────────── Offres du comparateur

const OFFER_LABELS: Record<string, string> = {
  id: "Offre", provider_id: "Opérateur", provider_slug: "Identifiant du nouvel opérateur", provider_name: "Nom du nouvel opérateur",
  provider_website: "Site du nouvel opérateur", category: "Catégorie", name: "Nom de l'offre", monthly: "Prix mensuel",
  intro_months: "Durée de la promo", after: "Prix après promo", commitment_months: "Engagement", activation_fee: "Frais d'activation",
  sim_fee: "Frais de carte SIM", termination_fee: "Frais de résiliation", data_gb: "Data", roaming_gb: "Data en itinérance",
  host_network: "Réseau hôte", technology: "Technologie", download_mbps: "Débit descendant", upload_mbps: "Débit montant",
  attrs: "Paramètres spécifiques", conditions: "Conditions", promo_conditions: "Conditions de la promo", url: "URL de l'offre",
  valid_until: "Date d'expiration", source_url: "URL de la source", source_label: "Libellé de la source", source_evidence: "Citation / preuve",
  source_checked_at: "Date de consultation", intent: "Action",
};

const OfferSchema = z.object({
  id: optId,
  provider_id: optId,
  provider_slug: z.preprocess(blank, z.string().trim().regex(/^[a-z0-9-]{2,40}$/, "2 à 40 caractères : minuscules, chiffres, tirets").optional()),
  provider_name: optText(60),
  provider_website: optHttps,
  category: z.enum(["mobile", "internet", "electricity", "gas"]),
  name: text(1, 120),
  monthly: cents(10_000),
  intro_months: intOr0(48),
  after: optCents(10_000),
  commitment_months: intOr0(48),
  activation_fee: centsOr0(10_000),
  sim_fee: centsOr0(10_000),
  termination_fee: centsOr0(10_000),
  data_gb: optNum(0, 999_999),
  roaming_gb: optNum(0, 999_999),
  five_g: checkbox,
  host_network: z.preprocess(blank, z.enum(HOST_NETWORKS).optional()).transform((v) => v ?? null),
  technology: z.preprocess(blank, z.enum(["fibre", "adsl", "box-4g-5g", "cable"]).optional()).transform((v) => v ?? null),
  download_mbps: optInt(1, 100_000),
  upload_mbps: optInt(1, 100_000),
  has_tv: checkbox,
  has_phone: checkbox,
  attrs: z.preprocess((v) => blank(v) ?? "{}", z.string().max(4000)),
  conditions: optText(1200),
  promo_conditions: optText(600),
  url: https,
  is_partner: checkbox,
  is_demo: checkbox,
  valid_until: optDate,
  source_url: optHttps,
  source_label: optText(120),
  source_evidence: optText(400),
  source_checked_at: optDate,
  intent: z.enum(["draft", "verify"]),
});

export async function saveOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(OfferSchema, formData, OFFER_LABELS);
  if (p.state) return p.state;
  const d = p.data;
  const today = todayParis();
  const db = supabaseAdmin();

  // Cohérence des prix (contrainte SQL offers_intro_consistent).
  let after = d.after;
  if (d.intro_months === 0) {
    if (after !== null && after !== d.monthly) return fail("Sans période promotionnelle (0 mois), le prix après promo doit être égal au prix mensuel. Laisse-le vide ou saisis le même montant.");
    after = d.monthly;
  } else if (after === null) {
    return fail("Indique le prix après la période promotionnelle.");
  }

  let attrs: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(d.attrs);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    attrs = parsed as Record<string, unknown>;
  } catch {
    return fail("Paramètres spécifiques : saisis un objet JSON valide, par exemple {\"puissance_kva\": 6}.");
  }

  if (!d.source_url && (d.source_label || d.source_evidence)) return fail("Source : indique l'URL (https://) de la page consultée.");
  if (d.source_checked_at && d.source_checked_at > today) return fail("Source : la date de consultation ne peut pas être dans le futur.");

  // État actuel (édition) et contrôles préalables à la vérification.
  let existing: { id: string; status: string } | null = null;
  if (d.id) {
    const { data, error } = await db.from("offers").select("id, status").eq("id", d.id).maybeSingle();
    if (error) return dbFail(error, "Lecture de l'offre");
    if (!data) return fail("Offre introuvable (elle a peut-être été supprimée).");
    existing = data;
  }
  if (d.intent === "verify") {
    const err = validityError(d.valid_until);
    if (err) return fail(`Vérification impossible : ${err}`);
    let hasSource = Boolean(d.source_url);
    if (!hasSource && existing) {
      const { count } = await db.from("offer_sources").select("id", { count: "exact", head: true }).eq("offer_id", existing.id).like("url", "https://%");
      hasSource = (count ?? 0) > 0;
    }
    if (!hasSource) return fail("Vérification impossible : ajoute au moins une source officielle (URL https://).");
  }

  // Opérateur : existant ou créé à la volée.
  let providerId = d.provider_id;
  if (!providerId) {
    if (!d.provider_slug || !d.provider_name) return fail("Choisis un opérateur existant ou renseigne l'identifiant et le nom du nouvel opérateur.");
    const { data: found, error: findErr } = await db.from("providers").select("id").eq("slug", d.provider_slug).maybeSingle();
    if (findErr) return dbFail(findErr, "Lecture de l'opérateur");
    if (found) {
      providerId = found.id as string;
    } else {
      const { data: created, error: provErr } = await db.from("providers")
        .insert({ slug: d.provider_slug, name: d.provider_name, website: d.provider_website }).select("id").single();
      if (provErr || !created) return dbFail(provErr, "Création de l'opérateur");
      providerId = created.id as string;
      await audit(admin.id, "admin.provider.create", "providers", providerId, { slug: d.provider_slug, name: d.provider_name });
    }
  }

  const row = {
    provider_id: providerId, category: d.category, name: d.name,
    monthly_cents: d.monthly, intro_months: d.intro_months, after_cents: after,
    commitment_months: d.commitment_months, activation_fee_cents: d.activation_fee, sim_fee_cents: d.sim_fee, termination_fee_cents: d.termination_fee,
    data_gb: d.data_gb, roaming_gb: d.roaming_gb, five_g: d.five_g, host_network: d.host_network,
    technology: d.technology, download_mbps: d.download_mbps, upload_mbps: d.upload_mbps, has_tv: d.has_tv, has_phone: d.has_phone,
    attrs, conditions: d.conditions, promo_conditions: d.promo_conditions, url: d.url,
    is_partner: d.is_partner, is_demo: d.is_demo, valid_until: d.valid_until,
  };
  const source = d.source_url
    ? { url: d.source_url, label: d.source_label, evidence: d.source_evidence, checked_at: d.source_checked_at ?? today }
    : null;
  const verified = { status: "verified", verified_at: today };
  const auditMeta = { name: d.name, category: d.category, monthly_cents: d.monthly, intro_months: d.intro_months, after_cents: after, valid_until: d.valid_until, is_demo: d.is_demo, is_partner: d.is_partner, intent: d.intent, source_added: Boolean(source) };

  if (existing) {
    if (source) {
      const { error } = await db.from("offer_sources").insert({ offer_id: existing.id, ...source });
      if (error) return dbFail(error, "Ajout de la source");
    }
    const { error } = await db.from("offers").update({ ...row, ...(d.intent === "verify" ? verified : { status: "draft" }) }).eq("id", existing.id);
    if (error) return dbFail(error, "Enregistrement de l'offre");
    await audit(admin.id, d.intent === "verify" ? "admin.offer.verify" : "admin.offer.update", "offers", existing.id, { ...auditMeta, previous_status: existing.status });
    revalidatePath("/admin");
    return done(d.intent === "verify" ? "Offre enregistrée et marquée vérifiée aujourd'hui." : "Offre enregistrée comme brouillon (non publiée).");
  }

  // Création : d'abord en brouillon, puis source, puis vérification éventuelle.
  const { data: created, error: insErr } = await db.from("offers").insert({ ...row, status: "draft" }).select("id").single();
  if (insErr || !created) return dbFail(insErr, "Création de l'offre");
  const offerId = created.id as string;
  await audit(admin.id, "admin.offer.create", "offers", offerId, auditMeta);
  let note = "creee";
  if (source) {
    const { error } = await db.from("offer_sources").insert({ offer_id: offerId, ...source });
    if (error) note = "source-ko";
  }
  if (d.intent === "verify" && note === "creee") {
    const { error } = await db.from("offers").update(verified).eq("id", offerId);
    if (error) note = "verif-ko";
    else {
      note = "verifiee";
      await audit(admin.id, "admin.offer.verify", "offers", offerId, { valid_until: d.valid_until });
    }
  }
  revalidatePath("/admin");
  redirect(`/admin?tab=offres&edit=${offerId}&note=${note}`);
}

const IdSchema = z.object({ id });

export async function verifyOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(IdSchema, formData, { id: "Offre" });
  if (p.state) return p.state;
  const db = supabaseAdmin();
  const { data: offer, error } = await db.from("offers").select("id, status, valid_until").eq("id", p.data.id).maybeSingle();
  if (error) return dbFail(error, "Lecture de l'offre");
  if (!offer) return fail("Offre introuvable.");
  const err = validityError(offer.valid_until as string | null);
  if (err) return fail(`Vérification impossible : ${err} Modifie la fiche de l'offre.`);
  const { count } = await db.from("offer_sources").select("id", { count: "exact", head: true }).eq("offer_id", offer.id).like("url", "https://%");
  if (!count) return fail("Vérification impossible : ajoute au moins une source officielle (URL https://) dans la fiche de l'offre.");
  const today = todayParis();
  const { error: upErr } = await db.from("offers").update({ status: "verified", verified_at: today }).eq("id", offer.id);
  if (upErr) return dbFail(upErr, "Vérification de l'offre");
  await audit(admin.id, "admin.offer.verify", "offers", offer.id as string, { previous_status: offer.status, verified_at: today, valid_until: offer.valid_until });
  revalidatePath("/admin");
  return done("Offre marquée vérifiée aujourd'hui.");
}

const ExtendSchema = z.object({ id, valid_until: date, source_url: https, source_label: optText(120), source_evidence: optText(400) });

export async function extendOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(ExtendSchema, formData, { id: "Offre", valid_until: "Nouvelle date d'expiration", source_url: "URL de la source", source_label: "Libellé de la source", source_evidence: "Citation / preuve" });
  if (p.state) return p.state;
  const d = p.data;
  const err = validityError(d.valid_until);
  if (err) return fail(err);
  const db = supabaseAdmin();
  const { data: offer, error } = await db.from("offers").select("id, status, valid_until").eq("id", d.id).maybeSingle();
  if (error) return dbFail(error, "Lecture de l'offre");
  if (!offer) return fail("Offre introuvable.");
  if (offer.status !== "verified") return fail("Seule une offre déjà vérifiée peut être prolongée. Utilise « Marquer vérifiée aujourd'hui ».");
  const today = todayParis();
  const { error: srcErr } = await db.from("offer_sources").insert({ offer_id: offer.id, url: d.source_url, label: d.source_label, evidence: d.source_evidence, checked_at: today });
  if (srcErr) return dbFail(srcErr, "Ajout de la source");
  const { error: upErr } = await db.from("offers").update({ verified_at: today, valid_until: d.valid_until }).eq("id", offer.id);
  if (upErr) return dbFail(upErr, "Prolongation de l'offre");
  await audit(admin.id, "admin.offer.extend", "offers", offer.id as string, { previous_valid_until: offer.valid_until, valid_until: d.valid_until, source_url: d.source_url });
  revalidatePath("/admin");
  return done("Vérification prolongée, nouvelle source enregistrée.");
}

export async function archiveOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(IdSchema, formData, { id: "Offre" });
  if (p.state) return p.state;
  const { data, error } = await supabaseAdmin().from("offers").update({ status: "archived" }).eq("id", p.data.id).neq("status", "archived").select("id");
  if (error) return dbFail(error, "Désactivation de l'offre");
  if (!data?.length) return fail("Offre introuvable ou déjà désactivée.");
  await audit(admin.id, "admin.offer.archive", "offers", p.data.id);
  revalidatePath("/admin");
  return done("Offre désactivée.");
}

export async function deleteDraftOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(IdSchema, formData, { id: "Offre" });
  if (p.state) return p.state;
  // Seuls les brouillons sont supprimables : la condition est appliquée dans la requête elle-même.
  const { data, error } = await supabaseAdmin().from("offers").delete().eq("id", p.data.id).eq("status", "draft").select("id, name");
  if (error) return dbFail(error, "Suppression du brouillon");
  if (!data?.length) return fail("Seul un brouillon peut être supprimé. Désactive l'offre à la place.");
  await audit(admin.id, "admin.offer.delete_draft", "offers", p.data.id, { name: data[0].name });
  revalidatePath("/admin");
  if (formData.get("back") === "1") redirect("/admin?tab=offres&note=supprimee");
  return done("Brouillon supprimé.");
}

// ───────────────────────────── Bons plans locaux

const MERCHANT_LABELS: Record<string, string> = {
  id: "Commerce", name: "Nom", address: "Adresse", postal_code: "Code postal", city: "Ville", lat: "Latitude", lon: "Longitude", phone: "Téléphone", website: "Site web",
};
const MerchantSchema = z.object({
  id: optId,
  name: text(1, 100),
  address: text(3, 200),
  postal_code: z.string().trim().regex(/^[0-9]{5}$/, "5 chiffres attendus"),
  city: text(1, 80),
  lat: num(-90, 90),
  lon: num(-180, 180),
  phone: z.preprocess(blank, z.string().trim().max(20).regex(/^[0-9+ ().-]+$/, "Numéro invalide").optional()).transform((v) => v ?? null),
  website: optHttps,
});

export async function saveMerchant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(MerchantSchema, formData, MERCHANT_LABELS);
  if (p.state) return p.state;
  const { id: merchantId, ...row } = p.data;
  const db = supabaseAdmin();
  if (merchantId) {
    const { data, error } = await db.from("merchant_locations").update(row).eq("id", merchantId).select("id");
    if (error) return dbFail(error, "Mise à jour du commerce");
    if (!data?.length) return fail("Commerce introuvable.");
    await audit(admin.id, "admin.merchant.update", "merchant_locations", merchantId, { name: row.name, city: row.city });
    revalidatePath("/admin");
    return done("Coordonnées mises à jour.");
  }
  const { data, error } = await db.from("merchant_locations").insert(row).select("id").single();
  if (error || !data) return dbFail(error, "Création du commerce");
  await audit(admin.id, "admin.merchant.create", "merchant_locations", data.id as string, { name: row.name, city: row.city });
  revalidatePath("/admin");
  return done("Commerce ajouté. Tu peux maintenant lui associer un bon plan.");
}

const DEAL_LABELS: Record<string, string> = {
  merchant_id: "Commerce", title: "Titre", category: "Catégorie", description: "Description", deal_label: "Libellé de l'avantage", conditions: "Conditions",
  valid_from: "Début de validité", valid_until: "Fin de validité", source_url: "URL de la source", use_url: "URL d'utilisation",
};
const DealSchema = z.object({
  merchant_id: id,
  title: text(3, 120),
  category: z.enum(Object.keys(DEAL_CATEGORIES) as [string, ...string[]]),
  description: optText(800),
  deal_label: text(1, 60),
  conditions: optText(600),
  valid_from: optDate,
  valid_until: optDate,
  source_url: https,
  use_url: optHttps,
  is_sponsored: checkbox,
  is_demo: checkbox,
});

export async function createDeal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(DealSchema, formData, DEAL_LABELS);
  if (p.state) return p.state;
  const d = p.data;
  if (d.valid_from && d.valid_until && d.valid_until < d.valid_from) return fail("La fin de validité doit être postérieure au début.");
  // Créé « en attente » : la publication passe toujours par la file de modération (source vérifiée).
  const { data, error } = await supabaseAdmin().from("local_deals").insert({ ...d, status: "submitted", submitted_by: admin.id }).select("id").single();
  if (error || !data) return dbFail(error, "Création du bon plan");
  await audit(admin.id, "admin.deal.create", "local_deals", data.id as string, { title: d.title, category: d.category, merchant_id: d.merchant_id, is_sponsored: d.is_sponsored, is_demo: d.is_demo });
  revalidatePath("/admin");
  return done("Bon plan ajouté à la file de modération. Valide-le après avoir vérifié la source.");
}

const ValidateDealSchema = z.object({ id, source_url: https, recheck_by: optDate, source_checked: checkbox });

/** Valide une soumission ou revérifie un bon plan déjà publié. */
export async function validateDeal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(ValidateDealSchema, formData, { id: "Bon plan", source_url: "URL de la source", recheck_by: "À recontrôler avant le" });
  if (p.state) return p.state;
  const d = p.data;
  if (!d.source_checked) return fail("Coche la case pour confirmer que tu as vérifié la source toi-même.");
  const today = todayParis();
  const recheckBy = d.recheck_by ?? addDays(today, DEAL_DEFAULT_RECHECK_DAYS);
  if (recheckBy <= today) return fail("La date de recontrôle doit être dans le futur.");
  if (recheckBy > addDays(today, DEAL_MAX_RECHECK_DAYS)) return fail(`La date de recontrôle ne peut pas dépasser ${DEAL_MAX_RECHECK_DAYS} jours.`);
  const db = supabaseAdmin();
  const { data: deal, error } = await db.from("local_deals").select("id, status, valid_until").eq("id", d.id).maybeSingle();
  if (error) return dbFail(error, "Lecture du bon plan");
  if (!deal) return fail("Bon plan introuvable.");
  if (deal.status !== "submitted" && deal.status !== "verified") return fail("Ce bon plan a été refusé ou archivé : il ne peut plus être validé.");
  if (deal.valid_until && (deal.valid_until as string) < today) return fail("Ce bon plan est arrivé à échéance : archive-le plutôt que de le valider.");
  const { error: upErr } = await db.from("local_deals")
    .update({ status: "verified", source_url: d.source_url, verified_at: today, recheck_by: recheckBy, updated_at: new Date().toISOString() }).eq("id", deal.id);
  if (upErr) return dbFail(upErr, "Validation du bon plan");
  await audit(admin.id, deal.status === "verified" ? "admin.deal.recheck" : "admin.deal.validate", "local_deals", deal.id as string, { source_url: d.source_url, verified_at: today, recheck_by: recheckBy });
  revalidatePath("/admin");
  return done(deal.status === "verified" ? "Bon plan revérifié." : "Bon plan validé et publié.");
}

async function setDealStatus(adminId: string, formData: FormData, status: "rejected" | "archived", from: string[], action: string, okMessage: string): Promise<ActionState> {
  const p = parseForm(IdSchema, formData, { id: "Bon plan" });
  if (p.state) return p.state;
  const { data, error } = await supabaseAdmin().from("local_deals")
    .update({ status, updated_at: new Date().toISOString() }).eq("id", p.data.id).in("status", from).select("id");
  if (error) return dbFail(error, "Mise à jour du bon plan");
  if (!data?.length) return fail("Bon plan introuvable ou déjà traité.");
  await audit(adminId, action, "local_deals", p.data.id);
  revalidatePath("/admin");
  return done(okMessage);
}

export async function rejectDeal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  return setDealStatus(admin.id, formData, "rejected", ["submitted"], "admin.deal.reject", "Soumission refusée.");
}

export async function archiveDeal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  return setDealStatus(admin.id, formData, "archived", ["submitted", "verified", "rejected"], "admin.deal.archive", "Bon plan archivé.");
}

// ───────────────────────────── Paramètres

async function saveSetting(adminId: string, key: string, patch: Record<string, unknown>, okMessage: string): Promise<ActionState> {
  const db = supabaseAdmin();
  const { data: current, error: readErr } = await db.from("admin_settings").select("value").eq("key", key).maybeSingle();
  if (readErr) return dbFail(readErr, "Lecture du paramètre");
  const before = current?.value && typeof current.value === "object" ? (current.value as Record<string, unknown>) : {};
  const value = { ...before, ...patch };
  const { error } = await db.from("admin_settings").upsert({ key, value, updated_at: new Date().toISOString(), updated_by: adminId });
  if (error) return dbFail(error, "Enregistrement du paramètre");
  await audit(adminId, "admin.settings.update", "admin_settings", key, { before, after: value });
  revalidatePath("/admin");
  return done(okMessage);
}

const PlanLimitsSchema = z.object({
  free_ai_analyses: int(0, 100), plus_ai_analyses: int(0, 1000), free_ai_chat: int(0, 1000), plus_ai_chat: int(0, 10_000), free_contracts: int(0, 50),
});

export async function savePlanLimits(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(PlanLimitsSchema, formData, {
    free_ai_analyses: "Analyses IA (gratuit)", plus_ai_analyses: "Analyses IA (Plus)", free_ai_chat: "Messages assistant (gratuit)",
    plus_ai_chat: "Messages assistant (Plus)", free_contracts: "Abonnements suivis (gratuit)",
  });
  if (p.state) return p.state;
  if (p.data.plus_ai_analyses < p.data.free_ai_analyses || p.data.plus_ai_chat < p.data.free_ai_chat) {
    return fail("Les limites de la formule Plus ne peuvent pas être inférieures à celles de la formule gratuite.");
  }
  return saveSetting(admin.id, "plan_limits", p.data, "Limites des formules enregistrées.");
}

const AiBudgetSchema = z.object({ monthly_cap_usd: num(0, 10_000), alert_ratio: num(0.1, 1), max_document_bytes: int(100_000, 20_000_000) });

export async function saveAiBudget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(AiBudgetSchema, formData, { monthly_cap_usd: "Plafond mensuel (USD)", alert_ratio: "Seuil d'alerte", max_document_bytes: "Taille maximale d'un document (octets)" });
  if (p.state) return p.state;
  return saveSetting(admin.id, "ai_budget", p.data, "Budget IA enregistré.");
}

const ReferralSchema = z.object({ qualified_needed: int(1, 50), bonus_days: int(1, 365) });

export async function saveReferral(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(ReferralSchema, formData, { qualified_needed: "Filleuls qualifiés requis", bonus_days: "Jours de Plus offerts" });
  if (p.state) return p.state;
  return saveSetting(admin.id, "referral", p.data, "Règles de parrainage enregistrées.");
}

const EnergySchema = z.object({ public: checkbox, confirm_validated: checkbox });

export async function saveEnergyComparator(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(EnergySchema, formData);
  if (p.state) return p.state;
  if (p.data.public && !p.data.confirm_validated) {
    return fail("Pour activer le comparateur énergie, confirme que les données et les règles de calcul ont été validées.");
  }
  return saveSetting(admin.id, "energy_comparator", { public: p.data.public }, p.data.public ? "Comparateur énergie activé publiquement." : "Comparateur énergie désactivé.");
}
