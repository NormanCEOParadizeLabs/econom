import { Badge, Card, Field, Input, Notice, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ActionForm, SubmitButton } from "../../_components/action-form";
import { Empty, LoadError, Mono, Section, Table, Td } from "../../_components/bits";
import { dateTimeFr, nf, pct } from "../../_lib/util";
import { createExperiment, setExperimentStatus } from "../actions";
import { RowAction } from "../_components/bits";
import { EXPERIMENT_STATUSES, MAX_VARIANTS } from "../_lib/util";

type Variant = { key: string; label: string };
type Experiment = { key: string; description: string; variants: unknown; goal_event: string; status: string; created_at: string };
type Results = Record<string, { exposed?: number; converted?: number }>;

const RULE = "Un test A/B ne porte que sur des libellés, des emplacements ou des récompenses. Les montants calculés par le comparateur ne sont jamais modifiés.";

const variantsOf = (v: unknown): Variant[] =>
  (Array.isArray(v) ? v : []).filter((x): x is Variant => Boolean(x) && typeof x === "object" && typeof (x as Variant).key === "string").map((x) => ({ key: x.key, label: String(x.label ?? x.key) }));

export async function ExperiencesPanel() {
  await requireAdmin();
  const db = supabaseAdmin();
  const { data, error } = await db.from("experiments").select("*").order("created_at", { ascending: false }).limit(50);
  const experiments = (data ?? []) as Experiment[];
  const results = await Promise.all(
    experiments.map(async (e) => {
      const r = await db.rpc("experiment_results", { p_key: e.key });
      return r.error || !r.data || typeof r.data !== "object" ? null : (r.data as Results);
    }),
  );

  return (
    <>
      <PageTitle title="Expériences A/B" subtitle="Tirage aléatoire par session de navigation, sans cookie ni identifiant persistant." />
      <Notice tone="warn" className="mb-4" title="Règle non négociable">{RULE}</Notice>

      <Section title="Expériences">
        {error ? (
          <LoadError what="les expériences" />
        ) : experiments.length === 0 ? (
          <Empty>Aucune expérience.</Empty>
        ) : (
          <div className="space-y-4">
            {experiments.map((e, i) => <ExperimentCard key={e.key} e={e} results={results[i]} />)}
          </div>
        )}
      </Section>

      <Section title="Nouvelle expérience" description="Créée en brouillon. Elle n'a d'effet que si l'interface lit sa clé (intégration côté code).">
        <Card>
          <ActionForm action={createExperiment} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
            <Field label="Clé" htmlFor="ex-key" hint="3 à 40 caractères : minuscules, chiffres, tirets bas. Ex. result_share_cta.">
              <Input id="ex-key" name="key" required pattern="[a-z0-9_]{3,40}" maxLength={40} autoCapitalize="none" spellCheck={false} aria-describedby="ex-key-hint" />
            </Field>
            <Field label="Événement objectif" htmlFor="ex-goal" hint="Nom de l'événement qui compte comme conversion. Ex. share_completed.">
              <Input id="ex-goal" name="goal_event" required pattern="[a-z0-9_]{3,60}" maxLength={60} autoCapitalize="none" spellCheck={false} aria-describedby="ex-goal-hint" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="ex-desc" hint="Ce qui change entre les variantes : un libellé, un emplacement ou une récompense.">
                <Input id="ex-desc" name="description" required minLength={5} maxLength={300} aria-describedby="ex-desc-hint" />
              </Field>
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-sm font-bold">Variantes (2 à {MAX_VARIANTS})</legend>
              <div className="space-y-2">
                {Array.from({ length: MAX_VARIANTS }, (_, n) => n + 1).map((n) => (
                  <div key={n} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
                    <Input name={`variant_key_${n}`} aria-label={`Clé de la variante ${n}`} placeholder={`Clé ${n}${n > 2 ? " (facultatif)" : ""}`} pattern="[a-z0-9_]{1,30}" maxLength={30} required={n <= 2} autoCapitalize="none" spellCheck={false} />
                    <Input name={`variant_label_${n}`} aria-label={`Libellé de la variante ${n}`} placeholder={`Libellé ${n}`} maxLength={80} required={n <= 2} />
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">Un libellé ne peut contenir ni montant ni pourcentage.</p>
            </fieldset>
            <div className="sm:col-span-2"><SubmitButton>Créer l&apos;expérience</SubmitButton></div>
          </ActionForm>
        </Card>
      </Section>
    </>
  );
}

function ExperimentCard({ e, results }: { e: Experiment; results: Results | null }) {
  const variants = variantsOf(e.variants);
  // Variantes présentes dans les événements mais absentes de la définition (ancienne configuration).
  const extra = Object.keys(results ?? {}).filter((k) => !variants.some((v) => v.key === k));
  const lines = [...variants, ...extra.map((k) => ({ key: k, label: "(variante non déclarée)" }))];
  const running = e.status === "running";

  return (
    <Card as="article" aria-label={`Expérience ${e.key}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-extrabold"><Mono>{e.key}</Mono></h3>
          <p className="mt-1 text-sm">{e.description}</p>
          <p className="mt-1 text-xs text-muted">Objectif : <Mono>{e.goal_event}</Mono> · créée le {dateTimeFr(e.created_at)}</p>
        </div>
        <span className="flex flex-wrap items-start gap-2">
          <Badge tone={running ? "positive" : e.status === "stopped" ? "danger" : "neutral"}>{EXPERIMENT_STATUSES[e.status] ?? e.status}</Badge>
          {running ? (
            <RowAction action={setExperimentStatus} fields={{ key: e.key, status: "stopped" }} label="Arrêter" confirm={`Arrêter l'expérience « ${e.key} » ? Les visiteurs verront la version par défaut.`} />
          ) : (
            <RowAction action={setExperimentStatus} fields={{ key: e.key, status: "running" }} label={e.status === "stopped" ? "Redémarrer" : "Démarrer"} variant="primary" confirm={`Démarrer l'expérience « ${e.key} » pour tous les visiteurs ?`} />
          )}
        </span>
      </header>
      <div className="mt-3">
        {results === null ? (
          <LoadError what="les résultats" />
        ) : (
          <Table caption={`Résultats de ${e.key}`} head={["Variante", "Libellé", "Exposés", "Conversions", "Taux"]} minWidth="560px">
            {lines.map((v) => {
              const r = results[v.key] ?? {};
              const exposed = Number(r.exposed ?? 0);
              const converted = Number(r.converted ?? 0);
              return (
                <tr key={v.key}>
                  <Td><Mono>{v.key}</Mono></Td>
                  <Td>{v.label}</Td>
                  <Td className="num">{nf(exposed)}</Td>
                  <Td className="num">{nf(converted)}</Td>
                  <Td className="num font-bold">{pct(converted, exposed)}</Td>
                </tr>
              );
            })}
          </Table>
        )}
        <p className="mt-2 text-xs text-muted">Exposés : événements d&apos;exposition portant cette variante. Conversions : événements « {e.goal_event} » portant cette variante. Un écart sur de petits volumes n&apos;est pas concluant.</p>
      </div>
    </Card>
  );
}
