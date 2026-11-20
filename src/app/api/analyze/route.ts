import { getUser } from "@/lib/auth";
import { ApiError, handle, jsonOk, rateLimit } from "@/lib/api";
import { analyzeForUser } from "@/lib/services/analysis";

export const runtime = "nodejs";
export const maxDuration = 90;

const HARD_LIMIT = 6_000_000; // garde-fou transport ; la limite métier est configurable (ai_budget.max_document_bytes)

export const POST = handle("analyze", async (req: Request) => {
  const user = await getUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Crée un compte gratuit pour analyser une facture.");
  await rateLimit(`analyze:${user.id}`, 8, 600);
  if (Number(req.headers.get("content-length") ?? 0) > HARD_LIMIT) throw new ApiError(413, "file_too_large", "Fichier trop volumineux.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "invalid_form", "Envoi invalide.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "missing_file", "Ajoute une photo ou un PDF de ta facture.");
  if (file.size > HARD_LIMIT) throw new ApiError(413, "file_too_large", "Fichier trop volumineux.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await analyzeForUser(user.id, { bytes, declaredMime: file.type }, form.get("consent") === "true");
  return jsonOk(result);
});
