import { z } from "zod";
import { getUser } from "@/lib/auth";
import { ApiError, handle, jsonOk, parseJson, rateLimit } from "@/lib/api";
import { AiUnavailableError, aiConfigured } from "@/lib/ai/client";
import { askAssistant } from "@/lib/ai/assistant";
import { consumeQuota, refundQuota } from "@/lib/plan";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 90;

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) })).min(1).max(20),
  usePersonalData: z.boolean().default(false),
});

const FALLBACK = "L'assistant est momentanément indisponible. En attendant : le comparateur calcule ton économie sans IA, et la page Aide explique comment résilier ou changer d'opérateur.";

export const POST = handle("assistant", async (req: Request) => {
  const user = await getUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Connecte-toi pour utiliser l'assistant.");
  await rateLimit(`assistant:${user.id}`, 12, 60);
  const body = await parseJson(req, Body, 60_000);
  if (body.messages[body.messages.length - 1].role !== "user") throw new ApiError(400, "invalid_input", "Le dernier message doit venir de toi.");
  if (!aiConfigured()) throw new ApiError(503, "ai_not_configured", FALLBACK, { links: ["/comparateur/mobile", "/aide"] });

  const quota = await consumeQuota(user.id, "ai_chat");
  if (!quota.ok) throw new ApiError(402, "quota_exceeded", `Tu as atteint ta limite de ${quota.limit} messages ce mois-ci.`, { plan: quota.plan, limit: quota.limit });

  if (body.usePersonalData) {
    await supabaseAdmin().from("profiles").update({ ai_consent_at: new Date().toISOString() }).eq("id", user.id).is("ai_consent_at", null);
  }
  try {
    const out = await askAssistant({ userId: user.id, history: body.messages, allowPersonalData: body.usePersonalData });
    return jsonOk(out);
  } catch (err) {
    await refundQuota(user.id, "ai_chat");
    if (err instanceof AiUnavailableError) throw new ApiError(503, `ai_${err.reason}`, FALLBACK, { links: ["/comparateur/mobile", "/aide"] });
    throw err;
  }
});
