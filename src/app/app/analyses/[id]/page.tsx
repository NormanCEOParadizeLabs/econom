import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteAnalysis } from "@/app/app/actions";
import { AnalysisForm, type Validated } from "@/components/analysis-form";
import { Button, PageTitle } from "@/components/ui";
import { IconTrash } from "@/components/icons";
import { ExtractionSchema } from "@/lib/ai/extract";
import { supabaseServer } from "@/lib/supabase/server";
import { dateFr } from "@/lib/format";

export const metadata: Metadata = { title: "Analyse de facture" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("document_analyses").select("id, extraction, validated_data, created_at").eq("id", id).maybeSingle(); // RLS : uniquement ses propres analyses
  const extraction = ExtractionSchema.safeParse(data?.extraction);
  if (!data || !extraction.success) notFound();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/app/analyses" className="font-bold text-brand-strong">← Historique</Link></p>
      <PageTitle title="Analyse de facture" subtitle={`Analysée le ${dateFr(data.created_at)} · document non conservé`} />
      <AnalysisForm id={data.id} extraction={extraction.data} validated={(data.validated_data as Validated | null) ?? null} />
      <form action={deleteAnalysis} className="mt-6 text-center">
        <input type="hidden" name="id" value={data.id} />
        <Button type="submit" variant="ghost" size="sm" className="!text-danger"><IconTrash width={16} height={16} /> Supprimer cette analyse</Button>
      </form>
    </>
  );
}
