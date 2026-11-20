"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AiUnavailableError, aiConfigured } from "@/lib/ai/client";
import { generateGrowthScript, GROWTH_TEMPLATES, GrowthFactsError, GrowthScriptSchema, growthTemplate } from "@/lib/ai/growth";
import { audit, logError } from "@/lib/api";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ActionState } from "../_lib/util";
import {
  assertAdmin, blank, centsOr0, checkbox, dbFail, done, fail, id, int, intOr0, oneOf, optCents, optDate, optHttps, optId, optInt, optRef, optText, parseForm, text,
} from "./_lib/forms";
import {
  campaignSlug, CONTENT_STATUSES, CREATOR_KINDS, CREATOR_STATUSES, GROWTH_PATH, HOOK_STATUSES, MAX_TIERS, MAX_VARIANTS, PLATFORMS, REWARD_BOUNDS, REWARD_TYPES,
} from "./_lib/util";

const IdSchema = z.object({ id });
const TEMPLATE_KEYS = GROWTH_TEMPLATES.map((t) => t.key) as [string, ...string[]];
const optTemplate = z.preprocess(blank, z.enum(TEMPLATE_KEYS).optional()).transform((v) => v ?? null);
const refresh = () => revalidatePath(GROWTH_PATH);

// ───────────────────────────── Contenus (bibliothèque des vidéos)

const CONTENT_LABELS: Record<string, string> = {
  id: "Contenu", title: "Titre", platform: "Plateforme", url: "URL de la vidéo", creator_id: "Créateur", account_id: "Compte", script_id: "Script lié",
  template_key: "Modèle", hook: "Hook", format: "Format", campaign: "Campagne", is_paid_partnership: "Partenariat rémunéré", cost: "Coût", status: "Statut",
  published_at: "Date de publication", views: "Vues", likes: "Likes", shares: "Partages", comments: "Commentaires",
};
const ContentSchema = z.object({
  id: optId,
  title: text(1, 160),
  platform: oneOf(PLATFORMS),
  url: optHttps,
  creator_id: optRef,
  account_id: optRef,
  script_id: optRef,
  template_key: optTemplate,
  hook: optText(200),
  format: optText(60),
  campaign: z.preprocess(blank, z.string().trim().regex(/^[a-z0-9-]{3,60}$/, "3 à 60 caractères : minuscules, chiffres, tirets").optional()),
  is_paid_partnership: checkbox,
  cost: centsOr0(1_000_000),
  status: oneOf(CONTENT_STATUSES),
  published_at: optDate,
  views: intOr0(2_000_000_000),
  likes: intOr0(2_000_000_000),
  shares: intOr0(2_000_000_000),
  comments: intOr0(2_000_000_000),
});

/** Slug libre le plus proche : « titre », puis « titre-2 », « titre-3 »… */
async function freeCampaign(base: string, exceptId?: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from("growth_contents").select("id, campaign").like("campaign", `${base}%`).limit(500);
  if (error) return null;
  const taken = new Set((data ?? []).filter((r) => r.id !== exceptId).map((r) => r.campaign as string));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 500; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  return null;
}

export async function saveContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(ContentSchema, formData, CONTENT_LABELS);
  if (p.state) return p.state;
  const { id: contentId, campaign: typed, cost, ...rest } = p.data;
  const db = supabaseAdmin();
  // Campagne vide : générée depuis le titre, puis rendue unique.
  const campaign = typed ?? (await freeCampaign(campaignSlug(rest.title), contentId));
  if (!campaign) return fail("Impossible de générer une campagne unique. Saisis-la à la main.");
  const row = { ...rest, campaign, cost_cents: cost };
  if (contentId) {
    const { data, error } = await db.from("growth_contents").update(row).eq("id", contentId).select("id");
    if (error) return dbFail(error, "Enregistrement du contenu");
    if (!data?.length) return fail("Contenu introuvable.");
    await audit(admin.id, "admin.growth.content.update", "growth_contents", contentId, { campaign, status: row.status, is_paid_partnership: row.is_paid_partnership, cost_cents: cost });
    refresh();
    return done("Contenu enregistré.");
  }
  const { data, error } = await db.from("growth_contents").insert(row).select("id").single();
  if (error) return dbFail(error, "Création du contenu");
  await audit(admin.id, "admin.growth.content.create", "growth_contents", data.id, { title: row.title, campaign, is_paid_partnership: row.is_paid_partnership, cost_cents: cost });
  refresh();
  return done(`Contenu créé. Campagne : ${campaign}.`);
}

/** Suppression simple d'une ligne d'une table Growth Studio, avec audit. */
async function deleteRow(formData: FormData, table: string, action: string, label: string, okMessage: string): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(IdSchema, formData, { id: label });
  if (p.state) return p.state;
  const { data, error } = await supabaseAdmin().from(table).delete().eq("id", p.data.id).select("*");
  if (error) return dbFail(error, "Suppression");
  if (!data?.length) return fail(`${label} introuvable.`);
  const row = data[0] as Record<string, unknown>;
  await audit(admin.id, action, table, p.data.id, { name: row.title ?? row.name ?? row.handle ?? row.text ?? null });
  refresh();
  return done(okMessage);
}

export async function deleteContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return deleteRow(formData, "growth_contents", "admin.growth.content.delete", "Contenu", "Contenu supprimé.");
}

// ───────────────────────────── Créateurs

const CreatorSchema = z.object({
  id: optId,
  name: text(1, 80),
  platform: oneOf(PLATFORMS),
  handle: optText(60),
  kind: oneOf(CREATOR_KINDS),
  is_paid: checkbox,
  rate: optCents(1_000_000),
  status: oneOf(CREATOR_STATUSES),
  notes: optText(1000),
});

export async function saveCreator(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(CreatorSchema, formData, { id: "Créateur", name: "Nom", platform: "Plateforme", handle: "Pseudo", kind: "Type", is_paid: "Rémunéré", rate: "Tarif", status: "Statut", notes: "Notes" });
  if (p.state) return p.state;
  const { id: creatorId, rate, ...rest } = p.data;
  const row = { ...rest, rate_cents: rate };
  const db = supabaseAdmin();
  if (creatorId) {
    const { data, error } = await db.from("growth_creators").update(row).eq("id", creatorId).select("id");
    if (error) return dbFail(error, "Enregistrement du créateur");
    if (!data?.length) return fail("Créateur introuvable.");
    await audit(admin.id, "admin.growth.creator.update", "growth_creators", creatorId, { name: row.name, is_paid: row.is_paid, rate_cents: rate, status: row.status });
    refresh();
    return done("Créateur enregistré.");
  }
  const { data, error } = await db.from("growth_creators").insert(row).select("id").single();
  if (error) return dbFail(error, "Création du créateur");
  await audit(admin.id, "admin.growth.creator.create", "growth_creators", data.id, { name: row.name, is_paid: row.is_paid, rate_cents: rate });
  refresh();
  return done("Créateur ajouté.");
}

export async function deleteCreator(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return deleteRow(formData, "growth_creators", "admin.growth.creator.delete", "Créateur", "Créateur supprimé. Ses contenus sont conservés, sans créateur.");
}

// ───────────────────────────── Comptes

const AccountSchema = z.object({ id: optId, platform: oneOf(PLATFORMS), handle: text(1, 60), followers: optInt(0, 2_000_000_000), notes: optText(600) });

export async function saveAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(AccountSchema, formData, { id: "Compte", platform: "Plateforme", handle: "Pseudo", followers: "Abonnés", notes: "Notes" });
  if (p.state) return p.state;
  const { id: accountId, ...row } = p.data;
  const db = supabaseAdmin();
  if (accountId) {
    const { data, error } = await db.from("growth_accounts").update(row).eq("id", accountId).select("id");
    if (error) return dbFail(error, "Enregistrement du compte");
    if (!data?.length) return fail("Compte introuvable.");
    await audit(admin.id, "admin.growth.account.update", "growth_accounts", accountId, { platform: row.platform, handle: row.handle, followers: row.followers });
    refresh();
    return done("Compte enregistré.");
  }
  const { data, error } = await db.from("growth_accounts").insert(row).select("id").single();
  if (error) return dbFail(error, "Création du compte");
  await audit(admin.id, "admin.growth.account.create", "growth_accounts", data.id, { platform: row.platform, handle: row.handle });
  refresh();
  return done("Compte ajouté.");
}

export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return deleteRow(formData, "growth_accounts", "admin.growth.account.delete", "Compte", "Compte supprimé.");
}

// ───────────────────────────── Hooks

const HookSchema = z.object({ id: optId, text: text(3, 200), template_key: optTemplate, status: oneOf(HOOK_STATUSES), notes: optText(400) });

export async function saveHook(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(HookSchema, formData, { id: "Hook", text: "Texte", template_key: "Modèle", status: "Statut", notes: "Notes" });
  if (p.state) return p.state;
  const { id: hookId, ...row } = p.data;
  const db = supabaseAdmin();
  if (hookId) {
    const { data, error } = await db.from("growth_hooks").update(row).eq("id", hookId).select("id");
    if (error) return dbFail(error, "Enregistrement du hook");
    if (!data?.length) return fail("Hook introuvable.");
    await audit(admin.id, "admin.growth.hook.update", "growth_hooks", hookId, { text: row.text, status: row.status });
    refresh();
    return done("Hook enregistré.");
  }
  const { data, error } = await db.from("growth_hooks").insert(row).select("id").single();
  if (error) return dbFail(error, "Création du hook");
  await audit(admin.id, "admin.growth.hook.create", "growth_hooks", data.id, { text: row.text });
  refresh();
  return done("Hook ajouté.");
}

export async function deleteHook(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return deleteRow(formData, "growth_hooks", "admin.growth.hook.delete", "Hook", "Hook supprimé.");
}

/** Ajoute à la bibliothèque les hooks absents (comparaison sur le texte exact). Retourne le nombre ajouté, ou une erreur. */
async function insertMissingHooks(hooks: { text: string; template_key: string | null }[]): Promise<{ added: number; error?: ActionState }> {
  const db = supabaseAdmin();
  const { data: existing, error: readErr } = await db.from("growth_hooks").select("text").limit(5000);
  if (readErr) return { added: 0, error: dbFail(readErr, "Lecture des hooks") };
  const seen = new Set((existing ?? []).map((h) => (h.text as string).trim().toLowerCase()));
  const rows: { text: string; template_key: string | null }[] = [];
  for (const h of hooks) {
    const t = h.text.trim().slice(0, 200);
    if (t.length < 3 || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    rows.push({ text: t, template_key: h.template_key });
  }
  if (rows.length === 0) return { added: 0 };
  const { error } = await db.from("growth_hooks").insert(rows);
  if (error) return { added: 0, error: dbFail(error, "Ajout des hooks") };
  return { added: rows.length };
}

export async function seedBaseHooks(): Promise<ActionState> {
  const admin = await assertAdmin();
  const r = await insertMissingHooks(GROWTH_TEMPLATES.map((t) => ({ text: t.title, template_key: t.key })));
  if (r.error) return r.error;
  if (r.added === 0) return done("Les 8 hooks de base sont déjà dans la bibliothèque.");
  await audit(admin.id, "admin.growth.hook.seed_base", "growth_hooks", undefined, { added: r.added });
  refresh();
  return done(`${r.added} hook${r.added > 1 ? "s" : ""} de base ajouté${r.added > 1 ? "s" : ""}.`);
}

// ───────────────────────────── Scripts générés

const GenerateSchema = z.object({ template_key: z.enum(TEMPLATE_KEYS), paid: checkbox });

const AI_MESSAGES: Record<AiUnavailableError["reason"], string> = {
  not_configured: "L'IA n'est pas configurée sur cet environnement (clé ANTHROPIC_API_KEY absente). Aucun script n'a été généré.",
  budget_exceeded: "Le budget IA mensuel est atteint : la génération est suspendue jusqu'au mois prochain ou jusqu'au relèvement du plafond (Admin → Paramètres).",
  api_error: "Le service d'IA est momentanément indisponible. Réessaie dans quelques minutes.",
  timeout: "Le service d'IA a mis trop de temps à répondre. Réessaie dans un instant.",
  refused: "Le modèle a refusé de produire ce script. Aucun contenu n'a été enregistré.",
  invalid_output: "Le modèle a renvoyé un script hors format : il a été rejeté et rien n'a été enregistré. Relance la génération.",
};

export async function generateScript(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(GenerateSchema, formData, { template_key: "Modèle", paid: "Collaboration rémunérée" });
  if (p.state) return p.state;
  const { template_key, paid } = p.data;
  if (!aiConfigured()) return fail(AI_MESSAGES.not_configured);

  let result;
  try {
    result = await generateGrowthScript({ templateKey: template_key, userId: admin.id, paid });
  } catch (err) {
    if (err instanceof GrowthFactsError) return fail(`${err.message}.`, ["Ajoute ou revérifie des offres dans Admin → Offres, puis relance."]);
    if (err instanceof AiUnavailableError) return fail(AI_MESSAGES[err.reason]);
    logError("admin.growth.generateScript", err);
    return fail("La génération a échoué (catalogue ou base de données indisponible). Réessaie dans un instant.");
  }

  const content = {
    script: result.script,
    sources: result.sources,
    issues: result.issues,
    facts: result.facts.map((f) => ({ id: f.id, texte: f.texte })),
    paid,
    model: env.anthropicModel,
  };
  // Relecture humaine obligatoire dans tous les cas : le script naît « À relire », même sans problème détecté.
  const { data, error } = await supabaseAdmin().from("growth_scripts")
    .insert({ template_key, title: result.script.titre.slice(0, 160), content, needs_review: true, review_notes: result.issues.length ? result.issues.join("\n") : null, created_by: admin.id })
    .select("id").single();
  if (error) return dbFail(error, "Enregistrement du script");
  await audit(admin.id, "admin.growth.script.generate", "growth_scripts", data.id, { template_key, paid, issues: result.issues.length, auto_check_failed: result.needsReview });
  refresh();
  return done(result.issues.length
    ? `Script généré, avec ${result.issues.length} problème${result.issues.length > 1 ? "s" : ""} détecté${result.issues.length > 1 ? "s" : ""} par le contrôle automatique. À corriger avant toute publication.`
    : "Script généré. Contrôle automatique : rien à signaler. Relis-le avant toute publication.");
}

export async function markScriptReviewed(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(IdSchema, formData, { id: "Script" });
  if (p.state) return p.state;
  const { data, error } = await supabaseAdmin().from("growth_scripts").update({ needs_review: false }).eq("id", p.data.id).eq("needs_review", true).select("id, review_notes");
  if (error) return dbFail(error, "Validation du script");
  if (!data?.length) return fail("Script introuvable ou déjà relu.");
  await audit(admin.id, "admin.growth.script.reviewed", "growth_scripts", p.data.id, { had_issues: Boolean(data[0].review_notes) });
  refresh();
  return done("Script marqué comme relu.");
}

export async function addScriptHooks(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(IdSchema, formData, { id: "Script" });
  if (p.state) return p.state;
  const { data: row, error } = await supabaseAdmin().from("growth_scripts").select("id, template_key, content").eq("id", p.data.id).maybeSingle();
  if (error) return dbFail(error, "Lecture du script");
  if (!row) return fail("Script introuvable.");
  const script = GrowthScriptSchema.safeParse((row.content as { script?: unknown } | null)?.script);
  if (!script.success) return fail("Ce script est illisible : impossible d'en extraire les hooks.");
  const template_key = growthTemplate(row.template_key)?.key ?? null;
  const r = await insertMissingHooks([script.data.hook, ...script.data.variantes_hook].map((t) => ({ text: t, template_key })));
  if (r.error) return r.error;
  if (r.added === 0) return done("Ces hooks sont déjà dans la bibliothèque.");
  await audit(admin.id, "admin.growth.script.hooks_added", "growth_scripts", p.data.id, { added: r.added });
  refresh();
  return done(`${r.added} hook${r.added > 1 ? "s" : ""} ajouté${r.added > 1 ? "s" : ""} à la bibliothèque (statut « À tester »).`);
}

export async function deleteScript(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return deleteRow(formData, "growth_scripts", "admin.growth.script.delete", "Script", "Script supprimé.");
}

// ───────────────────────────── Expériences A/B

const variantKey = z.string().trim().regex(/^[a-z0-9_]{1,30}$/, "1 à 30 caractères : minuscules, chiffres, tirets bas");
const ExperimentSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]{3,40}$/, "3 à 40 caractères : minuscules, chiffres, tirets bas"),
  description: text(5, 300),
  goal_event: z.string().trim().regex(/^[a-z0-9_]{3,60}$/, "Nom d'événement : 3 à 60 caractères (minuscules, chiffres, tirets bas)"),
});

export async function createExperiment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(ExperimentSchema, formData, { key: "Clé", description: "Description", goal_event: "Événement objectif" });
  if (p.state) return p.state;
  const variants: { key: string; label: string }[] = [];
  const errors: string[] = [];
  for (let i = 1; i <= MAX_VARIANTS; i++) {
    const k = String(formData.get(`variant_key_${i}`) ?? "").trim();
    const l = String(formData.get(`variant_label_${i}`) ?? "").trim();
    if (!k && !l) continue;
    const vk = variantKey.safeParse(k);
    if (!vk.success) errors.push(`Variante ${i} — clé : ${vk.error.issues[0]?.message ?? "invalide"}`);
    if (l.length < 1 || l.length > 80) errors.push(`Variante ${i} — libellé : 1 à 80 caractères`);
    // Garde-fou : une variante ne peut pas porter un montant (les montants viennent uniquement du comparateur).
    if (/\d\s?(?:€|euros?\b|%)/i.test(l)) errors.push(`Variante ${i} — libellé : aucun montant ni pourcentage dans un libellé de test`);
    if (variants.some((v) => v.key === k)) errors.push(`Variante ${i} — clé déjà utilisée`);
    variants.push({ key: k, label: l });
  }
  if (variants.length < 2) errors.push(`Renseigne entre 2 et ${MAX_VARIANTS} variantes (clé et libellé).`);
  if (errors.length) return fail("Les variantes sont invalides.", errors);
  const { error } = await supabaseAdmin().from("experiments").insert({ ...p.data, variants, status: "draft" });
  if (error) return dbFail(error, "Création de l'expérience");
  await audit(admin.id, "admin.growth.experiment.create", "experiments", p.data.key, { variants, goal_event: p.data.goal_event });
  refresh();
  return done("Expérience créée en brouillon. Démarre-la quand l'intégration est prête.");
}

const ExperimentStatusSchema = z.object({ key: z.string().trim().regex(/^[a-z0-9_]{3,40}$/), status: z.enum(["running", "stopped"]) });

export async function setExperimentStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(ExperimentStatusSchema, formData, { key: "Expérience", status: "État" });
  if (p.state) return p.state;
  const { key, status } = p.data;
  const from = status === "running" ? ["draft", "stopped"] : ["running"];
  const { data, error } = await supabaseAdmin().from("experiments").update({ status }).eq("key", key).in("status", from).select("key");
  if (error) return dbFail(error, "Mise à jour de l'expérience");
  if (!data?.length) return fail(status === "running" ? "Expérience introuvable ou déjà en cours." : "Expérience introuvable ou pas en cours.");
  await audit(admin.id, status === "running" ? "admin.growth.experiment.start" : "admin.growth.experiment.stop", "experiments", key);
  refresh();
  revalidatePath("/api/experiments"); // liste publique des expériences en cours
  return done(status === "running" ? "Expérience démarrée." : "Expérience arrêtée.");
}

// ───────────────────────────── Récompenses de parrainage (admin_settings.referral_rewards)

const B = REWARD_BOUNDS;
const TierSchema = z.object({ qualified: int(...B.qualified), type: oneOf(REWARD_TYPES), amount: int(1, 365) });
const RulesSchema = z.object({
  max_qualified_per_month: int(...B.max_qualified_per_month),
  max_same_ip: int(...B.max_same_ip),
  attribution_days: int(...B.attribution_days),
});

export async function saveReferralRewards(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const p = parseForm(RulesSchema, formData, {
    max_qualified_per_month: "Plafond mensuel de filleuls qualifiés par parrain", max_same_ip: "Comptes depuis une même origine", attribution_days: "Durée d'attribution",
  });
  if (p.state) return p.state;

  const tiers: { qualified: number; type: keyof typeof REWARD_TYPES; amount: number }[] = [];
  const errors: string[] = [];
  for (let i = 1; i <= MAX_TIERS; i++) {
    const q = String(formData.get(`tier_qualified_${i}`) ?? "").trim();
    if (!q) continue; // ligne vide : palier ignoré
    const type = String(formData.get(`tier_type_${i}`) ?? "");
    // Le rapport avancé est un droit unique : sa quantité vaut toujours 1.
    const amount = type === "advanced_report" ? "1" : String(formData.get(`tier_amount_${i}`) ?? "");
    const t = TierSchema.safeParse({ qualified: q, type, amount }, { error: z.locales.fr().localeError });
    if (!t.success) {
      errors.push(`Palier ${i} : ${t.error.issues.map((x) => x.message).join(" ; ")}`);
      continue;
    }
    const max = t.data.type === "bonus_analyses" ? B.bonus_analyses[1] : t.data.type === "plus_days" ? B.plus_days[1] : 1;
    if (t.data.amount > max) errors.push(`Palier ${i} : quantité maximale ${max} pour « ${REWARD_TYPES[t.data.type]} »`);
    if (tiers.length && t.data.qualified <= tiers[tiers.length - 1].qualified) errors.push(`Palier ${i} : le seuil doit être strictement supérieur au palier précédent`);
    tiers.push(t.data);
  }
  if (tiers.length < 1) errors.push(`Renseigne entre 1 et ${MAX_TIERS} paliers.`);
  if (errors.length) return fail("Les paliers sont invalides.", errors);

  const db = supabaseAdmin();
  const { data: current, error: readErr } = await db.from("admin_settings").select("value").eq("key", "referral_rewards").maybeSingle();
  if (readErr) return dbFail(readErr, "Lecture des règles");
  const before = current?.value ?? null;
  const value = { tiers, ...p.data };
  const { error } = await db.from("admin_settings").upsert({ key: "referral_rewards", value, updated_at: new Date().toISOString(), updated_by: admin.id });
  if (error) return dbFail(error, "Enregistrement des règles");
  await audit(admin.id, "admin.settings.update", "admin_settings", "referral_rewards", { before, after: value });
  refresh();
  revalidatePath("/app/parrainage");
  return done("Règles de parrainage enregistrées.");
}
