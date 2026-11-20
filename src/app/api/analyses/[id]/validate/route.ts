import { z } from "zod";
import { getUser } from "@/lib/auth";
import { ApiError, handle, jsonOk, parseJson } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { qualifyReferral } from "@/lib/services/referral";

export const runtime = "nodejs";

const Body = z.object({
  type_document: z.enum(["facture_mobile", "facture_internet", "facture_energie", "abonnement", "autre"]),
  fournisseur: z.string().trim().min(1).max(60),
  offre_actuelle: z.string().trim().max(100).nullable(),
  prix_mensuel: z.coerce.number().positive().max(1000),
  data_go: z.coerce.number().min(0).max(10000).nullable(),
  engagement_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

/** L'utilisateur corrige puis confirme les champs extraits : seule cette version validée alimente le comparateur. */
export const POST = handle("analysis.validate", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await getUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Connecte-toi pour continuer.");
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "not_found", "Analyse introuvable.");
  const body = await parseJson(req, Body);
  const { data, error } = await supabaseAdmin()
    .from("document_analyses")
    .update({ validated_data: body, validated_at: new Date().toISOString(), doc_type: body.type_document })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) throw new ApiError(404, "not_found", "Analyse introuvable.");

  // Économie « constatée » : la nouvelle facture validée du même fournisseur de service affiche un prix inférieur à la précédente.
  const db = supabaseAdmin();
  const { data: previous } = await db
    .from("document_analyses")
    .select("id, validated_data")
    .eq("user_id", user.id).eq("doc_type", body.type_document).neq("id", id).not("validated_at", "is", null)
    .order("validated_at", { ascending: false }).limit(1).maybeSingle();
  const before = Number((previous?.validated_data as { prix_mensuel?: number } | null)?.prix_mensuel);
  let observedCents = 0;
  if (Number.isFinite(before) && before > body.prix_mensuel) {
    observedCents = Math.round((before - body.prix_mensuel) * 100);
    await db.from("realized_savings").insert({ user_id: user.id, label: `Facture ${body.fournisseur} en baisse`, monthly_cents: observedCents, kind: "observed" });
  }
  await qualifyReferral(user.id).catch(() => {});
  return jsonOk({ ok: true, observedCents });
});
