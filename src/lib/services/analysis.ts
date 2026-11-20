import "server-only";
import { ApiError } from "@/lib/api";
import { AiUnavailableError, aiConfigured, getAiBudget } from "@/lib/ai/client";
import { extractDocument, sniffMime, type Extraction } from "@/lib/ai/extract";
import { consumeQuota, refundQuota } from "@/lib/plan";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";

export const AI_FALLBACK = "L'analyse automatique est momentanément indisponible. Tu peux saisir ton offre à la main dans le comparateur : le calcul reste identique.";

const AI_MESSAGES: Record<AiUnavailableError["reason"], [number, string]> = {
  not_configured: [503, AI_FALLBACK],
  budget_exceeded: [503, AI_FALLBACK],
  api_error: [503, AI_FALLBACK],
  timeout: [504, "L'analyse a pris trop de temps. Réessaie avec une photo plus nette ou saisis ton offre à la main."],
  refused: [422, "Ce document ne peut pas être analysé. Saisis ton offre à la main dans le comparateur."],
  invalid_output: [502, "L'analyse n'a pas produit un résultat fiable. Aucune donnée n'a été enregistrée : réessaie ou saisis ton offre à la main."],
};

export function aiErrorToApi(err: AiUnavailableError): ApiError {
  const [status, message] = AI_MESSAGES[err.reason];
  return new ApiError(status, `ai_${err.reason}`, message, { fallback: "/comparateur/mobile" });
}

export interface AnalysisResult {
  id: string;
  extraction: Extraction;
  remaining: number;
}

/**
 * Analyse d'un document pour un utilisateur : consentement, format, taille, quota, extraction, enregistrement.
 * Le fichier n'est jamais écrit sur disque ni conservé : seules les métadonnées et les champs extraits le sont.
 */
export async function analyzeForUser(userId: string, file: { bytes: Uint8Array; declaredMime: string }, consent: boolean): Promise<AnalysisResult> {
  if (!consent) throw new ApiError(400, "consent_required", "Ton accord est nécessaire pour transmettre ce document à notre prestataire d'IA.");
  const { max_document_bytes } = await getAiBudget();
  if (file.bytes.byteLength === 0) throw new ApiError(400, "empty_file", "Le fichier est vide.");
  if (file.bytes.byteLength > max_document_bytes) throw new ApiError(413, "file_too_large", `Fichier trop volumineux (maximum ${Math.round(max_document_bytes / 1e6)} Mo).`);
  const mime = sniffMime(file.bytes);
  if (!mime) throw new ApiError(415, "unsupported_format", "Format non accepté. Envoie une photo (JPG, PNG, WebP) ou un PDF.");
  if (!aiConfigured()) throw aiErrorToApi(new AiUnavailableError("not_configured"));

  const quota = await consumeQuota(userId, "ai_analysis");
  if (!quota.ok) {
    throw new ApiError(402, "quota_exceeded", quota.plan === "plus" ? `Tu as utilisé tes ${quota.limit} analyses de ce mois.` : `Tu as utilisé tes ${quota.limit} analyses gratuites de ce mois. ECONOM. Plus en inclut davantage.`, { plan: quota.plan, limit: quota.limit });
  }

  const db = supabaseAdmin();
  await track("invoice_scan_started", { userId });
  let extraction: Extraction;
  try {
    ({ extraction } = await extractDocument({ mime, base64: Buffer.from(file.bytes).toString("base64") }, userId));
  } catch (err) {
    await refundQuota(userId, "ai_analysis", quota.source); // un échec technique ne consomme pas le quota
    if (err instanceof AiUnavailableError) throw aiErrorToApi(err);
    throw err;
  }

  const { data: doc } = await db.from("uploaded_documents").insert({ user_id: userId, mime, size_bytes: file.bytes.byteLength }).select("id").single();
  const { data: analysis, error } = await db
    .from("document_analyses")
    .insert({ user_id: userId, document_id: doc?.id ?? null, doc_type: extraction.lisible ? extraction.type_document : "illisible", extraction, confidence: extraction.confiance })
    .select("id")
    .single();
  if (error || !analysis) throw new ApiError(500, "storage_failed", "L'analyse n'a pas pu être enregistrée.");
  if (!extraction.lisible) await refundQuota(userId, "ai_analysis", quota.source); // document illisible : non décompté
  await db.from("profiles").update({ ai_consent_at: new Date().toISOString() }).eq("id", userId).is("ai_consent_at", null);
  await track("invoice_scan_completed", { userId, props: { readable: extraction.lisible, confidence: extraction.confiance } });
  const used = (await db.from("usage_quotas").select("used").eq("user_id", userId).eq("kind", "ai_analysis").order("period", { ascending: false }).limit(1).maybeSingle()).data?.used ?? 0;
  return { id: analysis.id, extraction, remaining: Math.max(0, quota.limit - used) };
}
