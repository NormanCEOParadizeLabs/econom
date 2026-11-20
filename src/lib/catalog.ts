import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CatalogOffer, OfferCategory } from "@/lib/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToOffer(r: any): CatalogOffer {
  return {
    id: r.id,
    provider: r.providers?.name ?? "—",
    category: r.category,
    name: r.name,
    monthlyCents: r.monthly_cents,
    introMonths: r.intro_months,
    afterCents: r.after_cents,
    commitmentMonths: r.commitment_months,
    activationFeeCents: r.activation_fee_cents,
    simFeeCents: r.sim_fee_cents,
    terminationFeeCents: r.termination_fee_cents,
    dataGb: r.data_gb === null ? null : Number(r.data_gb),
    roamingGb: r.roaming_gb === null ? null : Number(r.roaming_gb),
    fiveG: r.five_g,
    hostNetwork: r.host_network,
    technology: r.technology,
    downloadMbps: r.download_mbps,
    uploadMbps: r.upload_mbps,
    hasTv: r.has_tv,
    hasPhone: r.has_phone,
    conditions: r.conditions,
    promoConditions: r.promo_conditions,
    url: r.url,
    isPartner: r.is_partner,
    isDemo: r.is_demo,
    status: r.status,
    verifiedAt: r.verified_at,
    validUntil: r.valid_until,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sources: (r.offer_sources ?? []).map((s: any) => ({ url: s.url, label: s.label, checkedAt: s.checked_at })),
  };
}

export const OFFER_SELECT = "*, providers(name, slug), offer_sources(url, label, checked_at)";

/** Offres publiables uniquement : vérifiées, non expirées, hors démonstration. */
export async function loadPublicOffers(category: OfferCategory, client: SupabaseClient = supabaseAdmin()): Promise<CatalogOffer[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from("offers")
    .select(OFFER_SELECT)
    .eq("category", category)
    .eq("status", "verified")
    .eq("is_demo", false)
    .gte("valid_until", today);
  if (error) throw new Error("Catalogue indisponible");
  return (data ?? []).map(rowToOffer);
}
