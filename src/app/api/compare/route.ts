import { getUser } from "@/lib/auth";
import { clientIp, handle, jsonOk, parseJson, rateLimit } from "@/lib/api";
import { CompareBody, runComparison } from "@/lib/services/comparison";

export const runtime = "nodejs";

/** Comparateur manuel : accessible sans compte. L'enregistrement nécessite d'être connecté. */
export const POST = handle("compare", async (req: Request) => {
  await rateLimit(`compare:${clientIp(req)}`, 40, 60);
  const body = await parseJson(req, CompareBody);
  const user = await getUser();
  return jsonOk(await runComparison(body, user?.id ?? null));
});
