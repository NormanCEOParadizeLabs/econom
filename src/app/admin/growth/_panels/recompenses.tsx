import { Badge, Card, Field, Input, Notice, PageTitle, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_RULES, type ReferralRules, type RewardTier } from "@/lib/services/referral";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ActionForm, SubmitButton } from "../../_components/action-form";
import { Empty, LoadError, Mono, Section, Table, Td } from "../../_components/bits";
import { dateTimeFr, nf, shortId } from "../../_lib/util";
import { saveReferralRewards } from "../actions";
import { MAX_TIERS, REWARD_BOUNDS as B, REWARD_TYPES } from "../_lib/util";

type Reward = { id: string; user_id: string; tier: number; reward_type: string; amount: number; granted_at: string };
type Rejected = { id: string; referrer_id: string; referred_id: string; rejected_reason: string | null; created_at: string };

const isTier = (t: unknown): t is RewardTier =>
  Boolean(t) && typeof t === "object" && Number.isInteger((t as RewardTier).qualified) && Number.isInteger((t as RewardTier).amount) && (t as RewardTier).type in REWARD_TYPES;
const numOr = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function NumField({ id, name, label, value, bounds, hint }: { id: string; name: string; label: string; value: number; bounds: readonly [number, number]; hint: string }) {
  return (
    <Field label={label} htmlFor={id} hint={`${hint} De ${bounds[0]} à ${bounds[1]}.`}>
      <Input id={id} name={name} type="number" inputMode="numeric" required min={bounds[0]} max={bounds[1]} step={1} defaultValue={value} aria-describedby={`${id}-hint`} />
    </Field>
  );
}

export async function RecompensesPanel() {
  await requireAdmin();
  const db = supabaseAdmin();
  const [setting, rewards, rejected] = await Promise.all([
    db.from("admin_settings").select("value, updated_at").eq("key", "referral_rewards").maybeSingle(),
    db.from("referral_rewards").select("id, user_id, tier, reward_type, amount, granted_at").order("granted_at", { ascending: false }).limit(50),
    db.from("referrals").select("id, referrer_id, referred_id, rejected_reason, created_at").eq("status", "rejected").order("created_at", { ascending: false }).limit(100),
  ]);
  const raw = setting.data?.value && typeof setting.data.value === "object" ? (setting.data.value as Partial<ReferralRules>) : {};
  const stored = Array.isArray(raw.tiers) ? raw.tiers.filter(isTier) : [];
  const tiers = (stored.length ? stored : DEFAULT_RULES.tiers).slice(0, MAX_TIERS);
  const rewardRows = (rewards.data ?? []) as Reward[];
  const rejectedRows = (rejected.data ?? []) as Rejected[];

  return (
    <>
      <PageTitle title="Récompenses de parrainage" subtitle="Paliers, plafonds anti-fraude et historique. Chaque modification est validée côté serveur et inscrite au journal d'audit." />
      {setting.error && <Notice tone="danger" className="mb-4">Impossible de lire les règles actuelles : les valeurs affichées sont celles par défaut. Ne les enregistre pas sans vérifier.</Notice>}

      <Section title="Règles" description={setting.data?.updated_at ? `Dernière modification : ${dateTimeFr(setting.data.updated_at)}` : undefined}>
        <Card>
          <Notice tone="info" className="mb-4" title="Effet d'une modification">
            Les récompenses déjà distribuées ne sont jamais reprises. Une récompense est accordée une seule fois par parrain, par seuil et par type : si tu changes le type
            ou le seuil d&apos;un palier, les parrains qui ont déjà atteint ce seuil recevront la nouvelle récompense à leur prochain filleul qualifié.
          </Notice>
          <ActionForm action={saveReferralRewards} className="space-y-5">
            <fieldset>
              <legend className="mb-1.5 text-sm font-bold">Paliers (1 à {MAX_TIERS}, seuils strictement croissants)</legend>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <caption className="sr-only">Paliers de récompense</caption>
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-wide text-muted">
                      <th scope="col" className="py-1.5 pr-2">Palier</th>
                      <th scope="col" className="py-1.5 pr-2">Filleuls qualifiés</th>
                      <th scope="col" className="py-1.5 pr-2">Récompense</th>
                      <th scope="col" className="py-1.5">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: MAX_TIERS }, (_, i) => i + 1).map((n) => {
                      const t = tiers[n - 1];
                      return (
                        <tr key={n}>
                          <th scope="row" className="py-1.5 pr-2 font-bold">{n}</th>
                          <td className="py-1.5 pr-2">
                            <Input name={`tier_qualified_${n}`} aria-label={`Palier ${n} : nombre de filleuls qualifiés`} type="number" inputMode="numeric" min={B.qualified[0]} max={B.qualified[1]} step={1} required={n === 1} defaultValue={t?.qualified ?? ""} />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Select name={`tier_type_${n}`} aria-label={`Palier ${n} : type de récompense`} defaultValue={t?.type ?? "bonus_analyses"}>
                              {Object.entries(REWARD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </Select>
                          </td>
                          <td className="py-1.5">
                            <Input name={`tier_amount_${n}`} aria-label={`Palier ${n} : quantité`} type="number" inputMode="numeric" min={1} max={B.plus_days[1]} step={1} defaultValue={t?.amount ?? ""} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Laisse le seuil vide pour ignorer une ligne. Quantité : {B.bonus_analyses[0]} à {B.bonus_analyses[1]} analyses, {B.plus_days[0]} à {B.plus_days[1]} jours de Plus ;
                le rapport avancé vaut toujours 1. Les jours de Plus offerts ne créent aucun abonnement payant.
              </p>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumField id="rr-month" name="max_qualified_per_month" label="Plafond mensuel de filleuls qualifiés par parrain" value={numOr(raw.max_qualified_per_month, DEFAULT_RULES.max_qualified_per_month)} bounds={B.max_qualified_per_month} hint="Au-delà, la qualification est reportée au mois suivant." />
              <NumField id="rr-ip" name="max_same_ip" label="Maximum de comptes depuis une même origine" value={numOr(raw.max_same_ip, DEFAULT_RULES.max_same_ip)} bounds={B.max_same_ip} hint="Filleuls qualifiés par parrain depuis la même origine réseau." />
              <NumField id="rr-days" name="attribution_days" label="Durée d'attribution (jours)" value={numOr(raw.attribution_days, DEFAULT_RULES.attribution_days)} bounds={B.attribution_days} hint="Durée de validité d'un lien de parrainage ouvert." />
            </div>
            <SubmitButton>Enregistrer les règles</SubmitButton>
          </ActionForm>
        </Card>
      </Section>

      <Section title="Dernières récompenses" description="Les 50 plus récentes.">
        {rewards.error ? (
          <LoadError what="l'historique des récompenses" />
        ) : rewardRows.length === 0 ? (
          <Empty>Aucune récompense distribuée pour l&apos;instant.</Empty>
        ) : (
          <Table caption="Historique des récompenses" head={["Date", "Parrain", "Palier atteint", "Récompense", "Quantité"]} minWidth="640px">
            {rewardRows.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{dateTimeFr(r.granted_at)}</Td>
                <Td><Mono title={r.user_id}>{shortId(r.user_id)}</Mono></Td>
                <Td className="num">{nf(r.tier)} filleul{r.tier > 1 ? "s" : ""}</Td>
                <Td>{REWARD_TYPES[r.reward_type] ?? r.reward_type}</Td>
                <Td className="num font-bold">{nf(r.amount)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Parrainages refusés" description="Refus anti-fraude, avec leur motif (100 plus récents). Aucune adresse IP n'est conservée en clair.">
        {rejected.error ? (
          <LoadError what="les parrainages refusés" />
        ) : rejectedRows.length === 0 ? (
          <Empty>Aucun parrainage refusé.</Empty>
        ) : (
          <Table caption="Parrainages refusés" head={["Inscription", "Parrain", "Filleul", "Motif"]} minWidth="640px">
            {rejectedRows.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{dateTimeFr(r.created_at)}</Td>
                <Td><Mono title={r.referrer_id}>{shortId(r.referrer_id)}</Mono></Td>
                <Td><Mono title={r.referred_id}>{shortId(r.referred_id)}</Mono></Td>
                <Td><Badge tone="danger">{r.rejected_reason ?? "motif non renseigné"}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
