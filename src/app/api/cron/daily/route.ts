import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { logError } from "@/lib/api";
import { runDaily } from "@/lib/services/cron";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Tâche planifiée quotidienne. Protégée par un secret partagé (en-tête Authorization: Bearer). */
export async function POST(req: Request) {
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const expected = env.cronSecret;
  if (!expected || expected.length < 16 || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return new Response("Non autorisé", { status: 401 });
  }
  try {
    return Response.json({ ok: true, stats: await runDaily() });
  } catch (err) {
    logError("cron.daily", err);
    return new Response("Échec", { status: 500 });
  }
}
