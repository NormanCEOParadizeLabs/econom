import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export const jsonError = (status: number, code: string, message: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: { code, message, ...extra } }, { status, headers: { "Cache-Control": "no-store" } });

export const jsonOk = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function parseJson<T extends z.ZodType>(req: Request, schema: T, maxBytes = 20_000): Promise<z.infer<T>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "too_large", "Requête trop volumineuse.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "Requête invalide.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, "invalid_input", "Certains champs sont invalides.", {
      fields: parsed.error.issues.slice(0, 8).map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return parsed.data;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "unknown").trim().slice(0, 64);
}

/** Limitation de débit partagée entre instances (compteur en base). */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const { data, error } = await supabaseAdmin().rpc("hit_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) return; // en cas de panne du compteur, ne pas bloquer le service
  if (data !== true) throw new ApiError(429, "rate_limited", "Trop de requêtes. Réessaie dans un instant.");
}

/** Journal applicatif : jamais de contenu utilisateur, uniquement codes et identifiants techniques. */
export function logError(scope: string, err: unknown) {
  const e = err as { name?: string; code?: string; status?: number };
  console.error(JSON.stringify({ level: "error", scope, name: e?.name, code: e?.code, status: e?.status, at: new Date().toISOString() }));
}

export function handle<A extends unknown[]>(scope: string, fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err.status, err.code, err.message, err.extra);
      logError(scope, err);
      return jsonError(500, "internal", "Une erreur est survenue. Réessaie dans un instant.");
    }
  };
}

export async function audit(actorId: string | null, action: string, entity?: string, entityId?: string, meta: Record<string, unknown> = {}) {
  await supabaseAdmin().from("audit_logs").insert({ actor_id: actorId, action, entity, entity_id: entityId, meta });
}
