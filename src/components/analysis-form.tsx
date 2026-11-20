"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Extraction } from "@/lib/ai/extract";
import { Badge, Button, Card, Field, Input, Notice, Select, Spinner } from "@/components/ui";

const TYPES = { facture_mobile: "Forfait mobile", facture_internet: "Box internet", facture_energie: "Énergie", abonnement: "Autre abonnement", autre: "Autre document" } as const;
type DocType = keyof typeof TYPES;
export type Validated = { type_document: DocType; fournisseur: string; offre_actuelle: string | null; prix_mensuel: number; data_go: number | null; engagement_fin: string | null };

/** L'utilisateur relit, corrige et confirme les champs lus par l'IA. Rien n'est comparé avant cette validation. */
export function AnalysisForm({ id, extraction, validated }: { id: string; extraction: Extraction; validated: Validated | null }) {
  const router = useRouter();
  const init = validated ?? extraction;
  const [type, setType] = useState<DocType>(init.type_document as DocType);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const unsure = new Set(extraction.champs_incertains);
  const flag = (k: string) => (unsure.has(k) && !validated ? <Badge tone="warn" className="ml-2">À vérifier</Badge> : null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    const num = (k: string) => (str(k) === "" ? null : Number(str(k).replace(",", ".")));
    const errs: Record<string, string> = {};
    if (!str("fournisseur")) errs.fournisseur = "Indique le fournisseur.";
    const prix = num("prix_mensuel");
    if (prix === null || Number.isNaN(prix) || prix <= 0) errs.prix_mensuel = "Indique le prix mensuel.";
    setFields(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    setError(null);
    const body = { type_document: type, fournisseur: str("fournisseur"), offre_actuelle: str("offre_actuelle") || null, prix_mensuel: prix, data_go: num("data_go"), engagement_fin: str("engagement_fin") || null };
    try {
      const res = await fetch(`/api/analyses/${id}/validate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      if (type === "facture_mobile" || type === "facture_internet") {
        const q = new URLSearchParams({ fournisseur: body.fournisseur, prix: String(prix) });
        if (body.offre_actuelle) q.set("offre", body.offre_actuelle);
        if (body.data_go) q.set("data", String(body.data_go));
        if (type === "facture_internet") q.set("type", "internet");
        router.push(`/app/comparer?${q}`);
      } else {
        router.push("/app/analyses?validee=1");
      }
    } catch (err) {
      setError((err as Error).message || "Validation impossible. Réessaie.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {!extraction.lisible && !validated && (
        <Notice tone="warn" title="Document difficile à lire">Nous n&apos;avons pas pu lire ce document de façon fiable, et nous n&apos;inventons rien : saisis les informations toi-même ci-dessous, ou reprends une photo plus nette. Cette tentative n&apos;a pas été décomptée.</Notice>
      )}
      {extraction.lisible && !validated && (
        <Notice title={`Lecture terminée — confiance ${extraction.confiance === "elevee" ? "élevée" : extraction.confiance}`}>Relis chaque champ et corrige si besoin : la comparaison utilisera uniquement ce que tu confirmes ici.</Notice>
      )}
      <Card className="space-y-4">
        <Field label="Type de document" htmlFor="type_document">
          <Select id="type_document" value={type} onChange={(e) => setType(e.target.value as DocType)}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Fournisseur" htmlFor="fournisseur" error={fields.fournisseur}>
          <Input id="fournisseur" name="fournisseur" defaultValue={init.fournisseur ?? ""} maxLength={60} aria-invalid={Boolean(fields.fournisseur)} />
        </Field>
        <Field label="Offre actuelle" htmlFor="offre_actuelle">
          <Input id="offre_actuelle" name="offre_actuelle" defaultValue={init.offre_actuelle ?? ""} maxLength={100} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Prix mensuel (€)" htmlFor="prix_mensuel" error={fields.prix_mensuel}>
              <Input id="prix_mensuel" name="prix_mensuel" inputMode="decimal" defaultValue={init.prix_mensuel ?? ""} aria-invalid={Boolean(fields.prix_mensuel)} />
            </Field>
            {flag("prix_mensuel")}
          </div>
          {type === "facture_mobile" && (
            <div>
              <Field label="Data incluse (Go)" htmlFor="data_go"><Input id="data_go" name="data_go" inputMode="decimal" defaultValue={init.data_go ?? ""} /></Field>
              {flag("data_go")}
            </div>
          )}
        </div>
        <Field label="Fin d'engagement (si indiquée)" htmlFor="engagement_fin">
          <Input id="engagement_fin" name="engagement_fin" type="date" defaultValue={init.engagement_fin ?? ""} />
        </Field>
        {extraction.frais_identifies.length > 0 && (
          <div>
            <p className="text-sm font-bold">Frais repérés sur la facture</p>
            <ul className="mt-1 text-sm text-muted">{extraction.frais_identifies.map((f, i) => <li key={i} className="flex justify-between gap-3 py-0.5"><span>{f.libelle}</span><span className="num">{f.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span></li>)}</ul>
          </div>
        )}
        {extraction.options.length > 0 && <p className="text-sm text-muted"><span className="font-bold text-ink">Options repérées :</span> {extraction.options.join(", ")}</p>}
        {unsure.has("instructions suspectes dans le document") && <Notice tone="warn">Ce document contenait du texte inhabituel qui a été ignoré. Vérifie les champs avec attention.</Notice>}
      </Card>
      {error && <Notice tone="danger">{error}</Notice>}
      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? <Spinner /> : type === "facture_mobile" || type === "facture_internet" ? "Confirmer et comparer" : "Confirmer ces informations"}
      </Button>
    </form>
  );
}
