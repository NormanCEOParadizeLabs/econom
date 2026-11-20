import "server-only";
import { z } from "zod";
import { compare, eurosToCents, type CompareOutput } from "@/lib/engine";
import { loadPublicOffers } from "@/lib/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";
import { qualifyReferral } from "@/lib/services/referral";

const euros = z.coerce.number().min(0).max(1000);

export const CompareBody = z.object({
  category: z.enum(["mobile", "internet"]),
  months: z.union([z.literal(12), z.literal(24)]),
  currentProvider: z.string().max(60).optional(),
  currentPlan: z.string().max(100).optional(),
  currentMonthlyEuros: euros.refine((v) => v > 0, "Indique ton prix mensuel actuel."),
  exitFeeEuros: euros.default(0),
  priceChange: z.object({ afterMonths: z.number().int().min(0).max(48), newMonthlyEuros: euros }).nullable().default(null),
  needs: z
    .object({
      minDataGb: z.coerce.number().min(0).max(10000).optional(),
      minRoamingGb: z.coerce.number().min(0).max(10000).optional(),
      require5G: z.boolean().optional(),
      networks: z.array(z.enum(["Orange", "SFR", "Bouygues Telecom", "Free"])).max(4).optional(),
      noCommitmentOnly: z.boolean().optional(),
      technology: z.enum(["fibre", "adsl", "box-4g-5g", "cable"]).nullable().optional(),
      minDownloadMbps: z.coerce.number().min(0).max(100000).optional(),
      requireTv: z.boolean().optional(),
      requirePhone: z.boolean().optional(),
    })
    .default({}),
  save: z.boolean().default(false),
  anonId: z.string().max(40).optional(),
  source: z.string().max(40).optional(),
});
export type CompareBodyT = z.infer<typeof CompareBody>;

export async function runComparison(body: CompareBodyT, userId: string | null): Promise<CompareOutput & { savedId: string | null }> {
  const out = compare({
    category: body.category,
    months: body.months,
    current: {
      monthlyCents: eurosToCents(body.currentMonthlyEuros),
      exitFeeCents: eurosToCents(body.exitFeeEuros),
      priceChange: body.priceChange ? { afterMonths: body.priceChange.afterMonths, newMonthlyCents: eurosToCents(body.priceChange.newMonthlyEuros) } : null,
    },
    needs: body.needs,
    offers: await loadPublicOffers(body.category),
  });

  let savedId: string | null = null;
  if (userId && body.save) {
    const db = supabaseAdmin();
    const best = out.results[0];
    const { data } = await db
      .from("comparison_results")
      .insert({
        user_id: userId,
        category: body.category,
        months: body.months,
        input: { currentProvider: body.currentProvider, currentPlan: body.currentPlan, currentMonthlyEuros: body.currentMonthlyEuros, exitFeeEuros: body.exitFeeEuros, needs: body.needs },
        results: out.results.slice(0, 10).map((r) => ({ offerId: r.offer.id, provider: r.offer.provider, name: r.offer.name, url: r.offer.url, verifiedAt: r.offer.verifiedAt, switchCostCents: r.switchCostCents, netSavingCents: r.netSavingCents })),
        best_net_saving_cents: best?.netSavingCents ?? null,
      })
      .select("id")
      .single();
    savedId = data?.id ?? null;
    // Une opportunité n'est créée que si l'économie nette est réellement positive.
    if (best?.isSaving && savedId) {
      await db.from("saving_opportunities").delete().eq("user_id", userId).eq("category", body.category).eq("status", "potential");
      await db.from("saving_opportunities").insert({
        user_id: userId, comparison_id: savedId, offer_id: best.offer.id, category: body.category,
        title: `${best.offer.provider} — ${best.offer.name}`, months: body.months,
        net_saving_cents: best.netSavingCents, monthly_saving_cents: best.monthlyEquivalentSavingCents,
      });
    }
    if (savedId) await qualifyReferral(userId).catch(() => {});
  }
  await track("comparison_completed", { userId, anonId: body.anonId, source: body.source, props: { category: body.category, months: body.months, results: out.results.length, saving: Boolean(out.results[0]?.isSaving) } });
  return { ...out, savedId };
}
