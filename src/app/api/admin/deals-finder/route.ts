import { z } from "zod";
import { getUser, isAdmin } from "@/lib/auth";
import { ApiError, audit, handle, jsonOk, parseJson, rateLimit } from "@/lib/api";
import { AiUnavailableError } from "@/lib/ai/client";
import { findDealsForCity } from "@/lib/ai/deals-finder";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Lance une recherche de bons plans pour une ville (administrateurs uniquement). */
export const POST = handle("admin.deals-finder", async (req: Request) => {
  const user = await getUser();
  if (!user || !(await isAdmin())) throw new ApiError(403, "forbidden", "Accès refusé.");
  await rateLimit(`deals-finder:${user.id}`, 10, 3600);
  const { city } = await parseJson(req, z.object({ city: z.string().trim().min(2).max(60).regex(/^[\p{L} '\-]+$/u, "Nom de ville invalide.") }));
  await audit(user.id, "deals_finder.manual", "city", city);
  try {
    return jsonOk(await findDealsForCity(city));
  } catch (err) {
    if (err instanceof AiUnavailableError) throw new ApiError(503, `ai_${err.reason}`, err.reason === "not_configured" ? "La clé Claude n'est pas configurée." : "La recherche est momentanément indisponible.");
    throw err;
  }
});
