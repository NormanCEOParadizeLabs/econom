import "server-only";
import { z } from "zod";
import { getUser, isAdmin } from "@/lib/auth";
import type { ActionState } from "../../_lib/util";

/** Garde-fous des Server Actions de Growth Studio : mêmes règles que l'administration existante. */

/** Revérifie le rôle admin côté serveur (table `admins`) à CHAQUE action. */
export async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Accès refusé");
  const user = await getUser();
  if (!user) throw new Error("Accès refusé");
  return user;
}

export const done = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
export const fail = (message: string, errors?: string[]): ActionState => ({ ok: false, message, errors, at: Date.now() });

const FR = z.locales.fr().localeError;

export function parseForm<T extends z.ZodType>(schema: T, formData: FormData, labels: Record<string, string> = {}):
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
  growth_contents_campaign_key: "Cette campagne (utm_campaign) est déjà utilisée par un autre contenu.",
  growth_contents_campaign_check: "La campagne doit comporter 3 à 60 caractères : minuscules, chiffres, tirets.",
  growth_contents_url_check: "L'URL doit commencer par https://.",
  growth_accounts_platform_handle_key: "Ce compte existe déjà sur cette plateforme.",
  experiments_pkey: "Une expérience porte déjà cette clé.",
  experiments_key_check: "La clé doit comporter 3 à 40 caractères : minuscules, chiffres, tirets bas.",
};

export function dbFail(error: { code?: string; message?: string } | null, context: string): ActionState {
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

export const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const toNum = (v: unknown) => {
  const b = blank(v);
  if (typeof b !== "string") return b;
  const n = Number(b.replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(n) ? b : n;
};
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
export const id = z.guid("Identifiant invalide");
export const optId = z.preprocess(blank, id.optional());
export const optRef = z.preprocess(blank, id.optional()).transform((v) => v ?? null);
export const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const optText = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional()).transform((v) => v ?? null);
const https = z.string().trim().max(500)
  .regex(/^https:\/\/\S+$/, "L'URL doit commencer par https://")
  .refine((v) => URL.canParse(v), "URL invalide");
export const optHttps = z.preprocess(blank, https.optional()).transform((v) => v ?? null);
export const int = (min: number, max: number) => z.preprocess(toNum, z.number().int().min(min).max(max));
export const intOr0 = (max: number) => z.preprocess((v) => toNum(v) ?? 0, z.number().int().min(0).max(max));
export const optInt = (min: number, max: number) => z.preprocess(toNum, z.number().int().min(min).max(max).optional()).transform((v) => v ?? null);
/** Montant saisi en euros → centimes. */
export const centsOr0 = (maxEuros: number) => z.preprocess((v) => toNum(v) ?? 0, z.number().min(0).max(maxEuros)).transform((v) => Math.round(v * 100));
export const optCents = (maxEuros: number) => z.preprocess(toNum, z.number().min(0).max(maxEuros).optional()).transform((v) => (v === undefined ? null : Math.round(v * 100)));
const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)")
  .refine((v) => !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime()), "Date invalide");
export const optDate = z.preprocess(blank, date.optional()).transform((v) => v ?? null);
export const oneOf = <T extends string>(values: Record<T, string>) => z.enum(Object.keys(values) as [T, ...T[]]);
