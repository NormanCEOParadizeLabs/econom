import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { distanceKm } from "@/lib/engine";

export interface DealView {
  id: string; title: string; category: string; description: string | null; dealLabel: string; conditions: string | null;
  validUntil: string | null; verifiedAt: string | null; sourceUrl: string; useUrl: string | null; isSponsored: boolean; auto: boolean;
  merchant: { name: string; address: string; postalCode: string; city: string; lat: number; lon: number; phone: string | null; website: string | null };
  distanceKm: number | null;
}

const SELECT = "id, title, category, description, deal_label, conditions, valid_until, verified_at, source_url, use_url, is_sponsored, origin, merchant_locations!inner(name, address, postal_code, city, lat, lon, phone, website)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toView(d: any, origin?: { lat: number; lon: number }): DealView {
  const m = d.merchant_locations;
  return {
    id: d.id, title: d.title, category: d.category, description: d.description, dealLabel: d.deal_label, conditions: d.conditions, validUntil: d.valid_until,
    verifiedAt: d.verified_at, sourceUrl: d.source_url, useUrl: d.use_url, isSponsored: d.is_sponsored, auto: d.origin === "auto",
    merchant: { name: m.name, address: m.address, postalCode: m.postal_code, city: m.city, lat: m.lat, lon: m.lon, phone: m.phone, website: m.website },
    distanceKm: origin ? Math.round(distanceKm(origin.lat, origin.lon, m.lat, m.lon) * 10) / 10 : null,
  };
}

/** Bons plans publiables : vérifiés, non expirés, revérification à jour, hors démonstration. */
function publicQuery() {
  const today = new Date().toISOString().slice(0, 10);
  return supabaseAdmin().from("local_deals").select(SELECT).eq("status", "verified").eq("is_demo", false).gte("recheck_by", today).or(`valid_until.is.null,valid_until.gte.${today}`);
}

export async function dealsNear(origin: { lat: number; lon: number }, radiusKm: number, category?: string): Promise<DealView[]> {
  const r = Math.min(100, Math.max(1, radiusKm));
  const dLat = r / 111;
  const dLon = r / (111 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));
  let q = publicQuery().gte("merchant_locations.lat", origin.lat - dLat).lte("merchant_locations.lat", origin.lat + dLat).gte("merchant_locations.lon", origin.lon - dLon).lte("merchant_locations.lon", origin.lon + dLon);
  if (category) q = q.eq("category", category);
  const { data, error } = await q.limit(200);
  if (error) throw new Error("deals_unavailable");
  return (data ?? []).map((d) => toView(d, origin)).filter((d) => (d.distanceKm ?? 0) <= r).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)).slice(0, 60);
}

export async function dealById(id: string): Promise<DealView | null> {
  const { data } = await publicQuery().eq("id", id).maybeSingle();
  return data ? toView(data) : null;
}

export async function dealsByIds(ids: string[]): Promise<DealView[]> {
  if (!ids.length) return [];
  const { data } = await publicQuery().in("id", ids);
  return (data ?? []).map((d) => toView(d));
}

export async function publicDealCount(): Promise<number> {
  const { data } = await publicQuery().limit(1000);
  return data?.length ?? 0;
}
