import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/plan";

export type AiClient = Pick<Anthropic, "messages">;

let override: AiClient | null = null;
let real: Anthropic | null = null;

/** Tests : injecte un client simulé (aucun appel réseau). */
export function setAiClientForTests(c: AiClient | null) {
  override = c;
}

export function aiConfigured(): boolean {
  return Boolean(override) || Boolean(env.anthropicKey);
}

export function aiClient(): AiClient {
  if (override) return override;
  if (!env.anthropicKey) throw new AiUnavailableError("not_configured");
  real ??= new Anthropic({ apiKey: env.anthropicKey, timeout: 60_000, maxRetries: 1 });
  return real;
}

export class AiUnavailableError extends Error {
  constructor(public reason: "not_configured" | "budget_exceeded" | "api_error" | "timeout" | "refused" | "invalid_output") {
    super(reason);
  }
}

// Tarifs publics en USD par million de tokens (entrée, sortie) — utilisés pour l'estimation des coûts.
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-fable-5-2": [8, 40],
};

export function costMicroUsd(model: string, inputTokens: number, outputTokens: number): number {
  const [i, o] = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return Math.round(inputTokens * i + outputTokens * o); // (tokens / 1e6) × USD × 1e6
}

export interface AiBudget {
  monthly_cap_usd: number;
  alert_ratio: number;
  max_document_bytes: number;
}
export const getAiBudget = () => getSetting<AiBudget>("ai_budget", { monthly_cap_usd: 50, alert_ratio: 0.8, max_document_bytes: 4_000_000 });

/** Plafond de dépense mensuel global : au-delà, l'IA est coupée et le reste de l'application continue. */
export async function assertBudget(): Promise<void> {
  const budget = await getAiBudget();
  const start = new Date().toISOString().slice(0, 7) + "-01T00:00:00Z";
  const { data } = await supabaseAdmin().from("ai_usage_logs").select("cost_micro_usd.sum()").gte("created_at", start).maybeSingle();
  const spent = Number((data as { sum?: number } | null)?.sum ?? 0) / 1e6;
  if (spent >= budget.monthly_cap_usd) throw new AiUnavailableError("budget_exceeded");
  if (spent >= budget.monthly_cap_usd * budget.alert_ratio) {
    const month = start.slice(0, 7);
    const { data: admins } = await supabaseAdmin().from("admins").select("user_id");
    for (const a of admins ?? []) {
      await supabaseAdmin().from("notifications").upsert(
        { user_id: a.user_id, kind: "system", title: "Alerte de consommation IA", body: `Le budget IA mensuel est consommé à plus de ${Math.round(budget.alert_ratio * 100)} %.`, link: "/admin?tab=ia", dedupe_key: `ai-budget-${month}` },
        { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
      );
    }
  }
}

/** Journal de consommation : tokens, coût, statut. Jamais de contenu. */
export async function logAiUsage(row: { userId: string | null; kind: "analysis" | "chat"; inputTokens?: number; outputTokens?: number; status: "ok" | "error" | "refused" | "invalid_output" | "timeout"; latencyMs: number }) {
  const model = env.anthropicModel;
  await supabaseAdmin().from("ai_usage_logs").insert({
    user_id: row.userId,
    kind: row.kind,
    model,
    input_tokens: row.inputTokens ?? 0,
    output_tokens: row.outputTokens ?? 0,
    cost_micro_usd: costMicroUsd(model, row.inputTokens ?? 0, row.outputTokens ?? 0),
    status: row.status,
    latency_ms: row.latencyMs,
  });
}

export function classifyAiError(err: unknown): AiUnavailableError {
  if (err instanceof AiUnavailableError) return err;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new AiUnavailableError("timeout");
  return new AiUnavailableError("api_error");
}
