import { ApiError, handle, jsonOk } from "@/lib/api";
import { getMe } from "@/lib/me";

export const runtime = "nodejs";

/** Formule et quotas vérifiés en base : c'est cette réponse, et non l'écran de retour du paiement, qui fait foi. */
export const GET = handle("me", async () => {
  const me = await getMe();
  if (!me) throw new ApiError(401, "unauthenticated", "Non connecté.");
  return jsonOk({ plan: me.plan, status: me.sub?.status ?? "free", quota: me.quota });
});
