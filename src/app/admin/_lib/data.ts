import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Lit toutes les lignes d'une requête par pages de 1000 (limite PostgREST), jusqu'à `max`. */
export async function fetchAll<T>(page: (from: number, to: number) => Page<T>, max = 20000): Promise<{ rows: T[]; truncated: boolean; failed: boolean }> {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; from < max; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) return { rows, truncated: false, failed: true };
    rows.push(...(data ?? []));
    if (!data || data.length < size) return { rows, truncated: false, failed: false };
  }
  return { rows, truncated: true, failed: false };
}

/** Nombre exact de lignes d'une table (null si la lecture échoue). */
export async function countRows(table: string, filter?: { column: string; value: string }): Promise<number | null> {
  let q = supabaseAdmin().from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.column, filter.value);
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

export type Metrics = Record<string, number> & { events_by_name_30d?: Record<string, number>; signups_by_source_30d?: Record<string, number> };

export async function getMetrics(): Promise<Metrics | null> {
  const { data, error } = await supabaseAdmin().rpc("admin_metrics");
  if (error || !data || typeof data !== "object") return null;
  return data as Metrics;
}

export async function getSettingValue(key: string): Promise<Record<string, unknown>> {
  const { data } = await supabaseAdmin().from("admin_settings").select("value").eq("key", key).maybeSingle();
  return data?.value && typeof data.value === "object" ? (data.value as Record<string, unknown>) : {};
}
