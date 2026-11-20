import { Card, Field, Input, Notice, PageTitle, Toggle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveAiBudget, saveEnergyComparator, savePlanLimits, saveReferral } from "../actions";
import { ActionForm, SubmitButton } from "../_components/action-form";
import { Section } from "../_components/bits";
import { dateTimeFr } from "../_lib/util";

type Row = { key: string; value: Record<string, unknown> | null; updated_at: string | null };

function NumField({ id, name, label, value, min, max, step = 1, hint }: { id: string; name: string; label: string; value: unknown; min: number; max: number; step?: number; hint?: string }) {
  const v = typeof value === "number" || typeof value === "string" ? value : "";
  return (
    <Field label={label} htmlFor={id} hint={hint ?? `De ${min.toLocaleString("fr-FR")} à ${max.toLocaleString("fr-FR")}.`}>
      <Input id={id} name={name} type="number" required min={min} max={max} step={step} defaultValue={v} aria-describedby={`${id}-hint`} />
    </Field>
  );
}

export async function ParametresPanel() {
  await requireAdmin();
  const { data, error } = await supabaseAdmin().from("admin_settings").select("key, value, updated_at");
  const rows = new Map(((data ?? []) as Row[]).map((r) => [r.key, r]));
  const get = (key: string) => rows.get(key)?.value ?? {};
  const updated = (key: string) => (rows.get(key)?.updated_at ? `Dernière modification : ${dateTimeFr(rows.get(key)?.updated_at)}` : undefined);
  const limits = get("plan_limits");
  const budget = get("ai_budget");
  const referral = get("referral");
  const energyPublic = get("energy_comparator").public === true;

  return (
    <>
      <PageTitle title="Paramètres" subtitle="Chaque modification est validée côté serveur et inscrite au journal d'audit." />
      {error && <Notice tone="danger" className="mb-4">Impossible de lire les paramètres actuels : les champs ci-dessous peuvent être vides. Ne les enregistre pas sans vérifier.</Notice>}

      <Section title="Limites des formules" description={updated("plan_limits") ?? "Quotas mensuels par utilisateur."}>
        <Card>
          <ActionForm action={savePlanLimits} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumField id="pl-fa" name="free_ai_analyses" label="Analyses IA par mois — gratuit" value={limits.free_ai_analyses} min={0} max={100} />
            <NumField id="pl-pa" name="plus_ai_analyses" label="Analyses IA par mois — Plus" value={limits.plus_ai_analyses} min={0} max={1000} />
            <NumField id="pl-fc" name="free_ai_chat" label="Messages assistant par mois — gratuit" value={limits.free_ai_chat} min={0} max={1000} />
            <NumField id="pl-pc" name="plus_ai_chat" label="Messages assistant par mois — Plus" value={limits.plus_ai_chat} min={0} max={10000} />
            <NumField id="pl-ct" name="free_contracts" label="Abonnements suivis — gratuit" value={limits.free_contracts} min={0} max={50} />
            <div className="sm:col-span-2 lg:col-span-3"><SubmitButton>Enregistrer les limites</SubmitButton></div>
          </ActionForm>
        </Card>
      </Section>

      <Section title="Budget IA" description={updated("ai_budget")}>
        <Card>
          <ActionForm action={saveAiBudget} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumField id="ab-cap" name="monthly_cap_usd" label="Plafond mensuel (USD)" value={budget.monthly_cap_usd} min={0} max={10000} step={0.01} />
            <NumField id="ab-ratio" name="alert_ratio" label="Seuil d'alerte (part du plafond)" value={budget.alert_ratio} min={0.1} max={1} step={0.01} hint="Entre 0,1 et 1. Ex. 0,8 = alerte à 80 % du plafond." />
            <NumField id="ab-bytes" name="max_document_bytes" label="Taille maximale d'un document (octets)" value={budget.max_document_bytes} min={100000} max={20000000} hint="De 100 000 à 20 000 000 octets (4 000 000 ≈ 4 Mo)." />
            <div className="sm:col-span-2 lg:col-span-3"><SubmitButton>Enregistrer le budget IA</SubmitButton></div>
          </ActionForm>
        </Card>
      </Section>

      <Section title="Parrainage" description={updated("referral")}>
        <Card>
          <ActionForm action={saveReferral} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumField id="rf-n" name="qualified_needed" label="Filleuls qualifiés requis" value={referral.qualified_needed} min={1} max={50} />
            <NumField id="rf-d" name="bonus_days" label="Jours de Plus offerts" value={referral.bonus_days} min={1} max={365} />
            <div className="sm:col-span-2 lg:col-span-3"><SubmitButton>Enregistrer le parrainage</SubmitButton></div>
          </ActionForm>
        </Card>
      </Section>

      <Section title="Comparateur énergie" description={updated("energy_comparator")}>
        <Card>
          <Notice tone="warn" title="À n'activer qu'après validation" className="mb-4">
            N&apos;active pas le comparateur énergie tant que les données (offres électricité et gaz) et les règles de calcul énergie n&apos;ont pas été validées.
            Une comparaison fausse induirait les utilisateurs en erreur.
          </Notice>
          <p className="mb-3 text-sm">État actuel : <strong className={energyPublic ? "text-positive" : ""}>{energyPublic ? "public" : "désactivé"}</strong></p>
          <ActionForm action={saveEnergyComparator} className="space-y-3" confirm="Modifier la visibilité publique du comparateur énergie ?">
            <Toggle id="en-public" name="public" label="Comparateur énergie visible publiquement" defaultChecked={energyPublic} />
            <label htmlFor="en-confirm" className="flex items-start gap-2 text-sm">
              <input id="en-confirm" name="confirm_validated" type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--brand)]" />
              <span>Je confirme que les données et les règles de calcul énergie ont été validées (requis pour activer).</span>
            </label>
            <SubmitButton>Enregistrer</SubmitButton>
          </ActionForm>
        </Card>
      </Section>
    </>
  );
}
