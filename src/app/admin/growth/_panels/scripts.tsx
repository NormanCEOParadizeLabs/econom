import type { ReactNode } from "react";
import { aiConfigured } from "@/lib/ai/client";
import { GROWTH_TEMPLATES, GrowthScriptSchema, growthTemplate, PAID_MENTION, type GrowthScript } from "@/lib/ai/growth";
import { Badge, Card, Field, Notice, PageTitle, Select, Toggle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { dateFr } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ActionForm, SubmitButton } from "../../_components/action-form";
import { Empty, LoadError, Mono, Section, Table, Td } from "../../_components/bits";
import { dateTimeFr, nf } from "../../_lib/util";
import { addScriptHooks, deleteScript, generateScript, markScriptReviewed } from "../actions";
import { ExternalLink, RowAction } from "../_components/bits";

type Row = { id: string; template_key: string; title: string; content: unknown; needs_review: boolean; review_notes: string | null; created_at: string };
type Source = { label: string; url: string; checkedAt: string | null };

const RULE = "Aucun script ne doit être publié sans relecture humaine. Les montants proviennent uniquement des offres vérifiées du catalogue.";

function readContent(content: unknown): { script: GrowthScript | null; sources: Source[]; paid: boolean } {
  const c = content && typeof content === "object" ? (content as Record<string, unknown>) : {};
  const parsed = GrowthScriptSchema.safeParse(c.script);
  const sources = (Array.isArray(c.sources) ? c.sources : []).filter(
    (s): s is Source => Boolean(s) && typeof s === "object" && typeof (s as Source).url === "string" && typeof (s as Source).label === "string",
  );
  return { script: parsed.success ? parsed.data : null, sources, paid: c.paid === true };
}

export async function ScriptsPanel() {
  await requireAdmin();
  const { data, error } = await supabaseAdmin().from("growth_scripts").select("id, template_key, title, content, needs_review, review_notes, created_at").order("created_at", { ascending: false }).limit(40);
  const rows = (data ?? []) as Row[];
  const ready = aiConfigured();

  return (
    <>
      <PageTitle title="Scripts vidéo" subtitle="Scripts sans visage (screencast, démonstration, voix off), rédigés par Claude à partir de faits calculés par le comparateur." />
      <Notice tone="warn" className="mb-4" title="Règle de publication">{RULE}</Notice>

      <Section title="Générer un script">
        <Card>
          {!ready && (
            <Notice tone="info" className="mb-4" title="IA non configurée">
              La clé <Mono>ANTHROPIC_API_KEY</Mono> est absente de cet environnement : la génération est désactivée. Le reste de Growth Studio fonctionne normalement.
            </Notice>
          )}
          <ActionForm action={generateScript} className="grid gap-3 sm:grid-cols-2">
            <Field label="Modèle" htmlFor="sc-template" hint="Les modèles chiffrés exigent au moins une offre vérifiée et non expirée dans le catalogue.">
              <Select id="sc-template" name="template_key" defaultValue={GROWTH_TEMPLATES[0].key} aria-describedby="sc-template-hint">
                {GROWTH_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.title}{t.usesCatalog ? "" : " (sans montant)"}</option>)}
              </Select>
            </Field>
            <div className="self-center">
              <Toggle id="sc-paid" name="paid" label="Collaboration rémunérée" description={`Le script inclura la mention « ${PAID_MENTION} ».`} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton disabled={!ready}>Générer avec Claude</SubmitButton>
              <p className="mt-2 text-xs text-muted">La génération prend jusqu&apos;à une minute. Chaque appel est décompté du budget IA et inscrit au journal d&apos;audit.</p>
            </div>
          </ActionForm>
        </Card>
      </Section>

      <Section title="Scripts enregistrés" description={rows.length ? `${nf(rows.length)} script${rows.length > 1 ? "s" : ""} (40 plus récents).` : undefined}>
        {error ? (
          <LoadError what="les scripts" />
        ) : rows.length === 0 ? (
          <Empty>Aucun script pour l&apos;instant.</Empty>
        ) : (
          <div className="space-y-4">{rows.map((r) => <ScriptCard key={r.id} row={r} />)}</div>
        )}
      </Section>
    </>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{title}</h4>
      {children}
    </div>
  );
}

function ScriptCard({ row }: { row: Row }) {
  const { script, sources, paid } = readContent(row.content);
  const issues = (row.review_notes ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const template = growthTemplate(row.template_key);

  return (
    <Card as="article" aria-label={row.title}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{template?.title ?? row.template_key} · {dateTimeFr(row.created_at)}</p>
          <h3 className="font-display text-lg font-extrabold">{row.title}</h3>
        </div>
        <span className="flex flex-wrap gap-1">
          {row.needs_review ? <Badge tone="warn">À relire</Badge> : <Badge tone="positive">Validé</Badge>}
          {paid && <Badge tone="accent">{PAID_MENTION}</Badge>}
          {script && <Badge>{script.duree_secondes} s</Badge>}
          <Badge>Sans visage</Badge>
        </span>
      </header>

      {issues.length > 0 ? (
        <Notice tone="danger" className="mt-3" title={`Contrôle automatique : ${issues.length} problème${issues.length > 1 ? "s" : ""} détecté${issues.length > 1 ? "s" : ""}`}>
          <ul className="list-disc pl-5">{issues.map((i, n) => <li key={n}>{i}</li>)}</ul>
        </Notice>
      ) : (
        <p className="mt-3 text-xs text-muted">Contrôle automatique : aucun montant hors faits ni terme interdit détecté. Cela ne remplace pas la relecture.</p>
      )}

      {!script ? (
        <Notice tone="danger" className="mt-3">Le contenu de ce script est illisible (format inattendu). Supprime-le et relance une génération.</Notice>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          <Block title="Hook (2 secondes)"><p className="text-base font-bold">{script.hook}</p></Block>
          <Block title="Variantes de hook">
            <ul className="list-disc space-y-0.5 pl-5">{script.variantes_hook.map((v, i) => <li key={i}>{v}</li>)}</ul>
          </Block>
          <Block title="Déroulé plan par plan">
            <Table caption={`Déroulé de « ${row.title} »`} head={["Temps", "Plan visuel", "Voix off", "Caption"]} minWidth="720px">
              {script.deroule.map((d, i) => (
                <tr key={i}>
                  <Td className="num whitespace-nowrap font-bold">{d.temps}</Td>
                  <Td>{d.plan_visuel}</Td>
                  <Td>{d.voix_off}</Td>
                  <Td className="font-semibold">{d.caption}</Td>
                </tr>
              ))}
            </Table>
          </Block>
          <div className="grid gap-4 md:grid-cols-2">
            <Block title="Démonstration de l'application"><p className="whitespace-pre-wrap">{script.demonstration_app}</p></Block>
            <Block title="CTA"><p className="font-bold">{script.cta}</p></Block>
            <Block title="Variantes de montage">
              <ul className="list-disc space-y-0.5 pl-5">{script.variantes_montage.map((v, i) => <li key={i}>{v}</li>)}</ul>
            </Block>
            <Block title="Captions de publication">
              <ul className="list-disc space-y-1 pl-5">{script.captions_publication.map((v, i) => <li key={i} className="whitespace-pre-wrap">{v}</li>)}</ul>
            </Block>
          </div>
          {(paid || script.mention_partenariat) && (
            <Notice tone="warn" title="Mention de partenariat à afficher">{script.mention_partenariat || `Mention absente du script : ajoute « ${PAID_MENTION} » avant publication.`}</Notice>
          )}
          <Block title="Sources des montants">
            {sources.length === 0 ? (
              <p className="text-muted">Aucune source : ce script ne doit citer aucun montant.</p>
            ) : (
              <ul className="space-y-1">
                {sources.map((s) => (
                  <li key={s.url}>
                    <span className="font-semibold">{s.label}</span> — <ExternalLink href={s.url}>{s.url}</ExternalLink>
                    <span className="text-muted"> · vérifiée le {dateFr(s.checkedAt, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                  </li>
                ))}
              </ul>
            )}
            {script.faits_utilises.length > 0 && <p className="mt-1 text-xs text-muted">Faits utilisés : {script.faits_utilises.join(", ")}</p>}
          </Block>
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-start gap-2 border-t border-line pt-4">
        {row.needs_review && (
          <RowAction
            action={markScriptReviewed}
            fields={{ id: row.id }}
            label="Marquer comme relu"
            variant="primary"
            confirm={issues.length ? "Le contrôle automatique a signalé des problèmes sur ce script. Confirmes-tu l'avoir relu et corrigé avant publication ?" : "Confirmes-tu avoir relu ce script et vérifié chaque montant avec sa source ?"}
          />
        )}
        {script && <RowAction action={addScriptHooks} fields={{ id: row.id }} label="Ajouter les hooks à la bibliothèque" />}
        <RowAction action={deleteScript} fields={{ id: row.id }} label="Supprimer" variant="ghost" confirm={`Supprimer le script « ${row.title} » ?`} />
      </footer>
    </Card>
  );
}
