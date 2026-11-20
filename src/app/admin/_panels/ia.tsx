import { Card, Notice, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Empty, LoadError, Mono, Progress, Section, Table, Td, Tile, TileGrid } from "../_components/bits";
import { fetchAll, getMetrics, getSettingValue } from "../_lib/data";
import { nf, pct, shortId, usdFromMicro } from "../_lib/util";

type Log = { user_id: string | null; kind: string; input_tokens: number; output_tokens: number; cost_micro_usd: number; status: string; latency_ms: number | null };
type Agg = { calls: number; input: number; output: number; cost: number; latencySum: number; latencyN: number };

const KIND_LABELS: Record<string, string> = { analysis: "Analyse de document", chat: "Assistant" };
const STATUS_LABELS: Record<string, string> = { ok: "Réussi", error: "Erreur", refused: "Refusé", invalid_output: "Sortie invalide", timeout: "Délai dépassé" };
const emptyAgg = (): Agg => ({ calls: 0, input: 0, output: 0, cost: 0, latencySum: 0, latencyN: 0 });

function add(a: Agg, l: Log) {
  a.calls += 1;
  a.input += l.input_tokens;
  a.output += l.output_tokens;
  a.cost += Number(l.cost_micro_usd);
  if (l.latency_ms !== null) {
    a.latencySum += l.latency_ms;
    a.latencyN += 1;
  }
}
const latency = (a: Agg) => (a.latencyN > 0 ? `${Math.round(a.latencySum / a.latencyN).toLocaleString("fr-FR")} ms` : "—");

export async function IaPanel() {
  await requireAdmin();
  const since = new Date(new Date().getTime() - 30 * 86_400_000).toISOString();
  const [logs, metrics, budget] = await Promise.all([
    fetchAll<Log>((from, to) =>
      supabaseAdmin().from("ai_usage_logs")
        .select("user_id, kind, input_tokens, output_tokens, cost_micro_usd, status, latency_ms")
        .gte("created_at", since).order("id", { ascending: false }).range(from, to),
    ),
    getMetrics(),
    getSettingValue("ai_budget"),
  ]);

  const total = emptyAgg();
  const byKind = new Map<string, Agg>();
  const byStatus = new Map<string, number>();
  const byUser = new Map<string, Agg>();
  for (const l of logs.rows) {
    add(total, l);
    if (!byKind.has(l.kind)) byKind.set(l.kind, emptyAgg());
    add(byKind.get(l.kind)!, l);
    byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
    if (l.user_id) {
      if (!byUser.has(l.user_id)) byUser.set(l.user_id, emptyAgg());
      add(byUser.get(l.user_id)!, l);
    }
  }
  const errors = total.calls - (byStatus.get("ok") ?? 0);
  const top = [...byUser.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 10);

  const cap = Number(budget.monthly_cap_usd ?? 0);
  const alertRatio = Number(budget.alert_ratio ?? 0.8);
  const monthMicro = metrics ? Number(metrics.ai_cost_micro_usd_month ?? 0) : null;
  const monthUsd = monthMicro === null ? null : monthMicro / 1e6;
  const ratio = monthUsd !== null && cap > 0 ? monthUsd / cap : 0;

  return (
    <>
      <PageTitle title="Intelligence artificielle" subtitle="Consommation des 30 derniers jours. Les coûts sont des estimations calculées à partir des tokens, en dollars US." />
      {logs.failed && <LoadError what="le journal d'utilisation de l'IA" />}
      {logs.truncated && <Notice tone="warn" className="mb-4">Volume important : les ventilations ci-dessous portent sur les {nf(logs.rows.length)} appels les plus récents de la période.</Notice>}

      <Section title="Budget du mois en cours">
        <Card>
          {monthUsd === null ? (
            <LoadError what="le coût du mois" />
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p><span className="num text-2xl font-black">{usdFromMicro(monthMicro)}</span> <span className="text-sm text-muted">estimés depuis le 1er du mois</span></p>
                <p className="text-sm text-muted">{cap > 0 ? <>Plafond : <strong className="text-ink">{cap.toLocaleString("fr-FR", { style: "currency", currency: "USD" })}</strong> · {pct(monthUsd, cap)} utilisé</> : "Aucun plafond défini."}</p>
              </div>
              {cap > 0 && <Progress ratio={ratio} alertAt={alertRatio} label="Part du plafond mensuel IA utilisée" />}
              {cap > 0 && ratio >= 1 && <p className="mt-2 text-sm font-bold text-danger">Plafond mensuel atteint.</p>}
              {cap > 0 && ratio < 1 && ratio >= alertRatio && <p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-300">Seuil d&apos;alerte ({pct(alertRatio, 1)}) dépassé.</p>}
              <p className="mt-2 text-xs text-muted">Le plafond se règle dans l&apos;onglet Paramètres.</p>
            </>
          )}
        </Card>
      </Section>

      <Section title="Synthèse (30 j)">
        <TileGrid>
          <Tile label="Appels" value={nf(total.calls)} />
          <Tile label="Coût estimé" value={usdFromMicro(total.cost)} />
          <Tile label="Taux d'erreur" value={pct(errors, total.calls)} hint={`${nf(errors)} appel${errors > 1 ? "s" : ""} non réussi${errors > 1 ? "s" : ""}.`} tone={errors > 0 ? "warn" : undefined} />
          <Tile label="Latence moyenne" value={latency(total)} />
          <Tile label="Utilisateurs actifs IA" value={nf(byUser.size)} />
          <Tile label="Coût moyen par utilisateur actif IA" value={byUser.size > 0 ? usdFromMicro(total.cost / byUser.size) : "—"} />
        </TileGrid>
      </Section>

      <Section title="Par type d'appel">
        {total.calls === 0 ? <Empty>Aucun appel IA sur les 30 derniers jours.</Empty> : (
          <Table caption="Appels IA par type" head={["Type", "Appels", "Tokens en entrée", "Tokens en sortie", "Coût estimé", "Latence moyenne"]}>
            {[...byKind.entries()].sort((a, b) => b[1].calls - a[1].calls).map(([kind, a]) => (
              <tr key={kind}>
                <Td className="font-bold">{KIND_LABELS[kind] ?? kind}</Td>
                <Td className="num">{nf(a.calls)}</Td>
                <Td className="num">{nf(a.input)}</Td>
                <Td className="num">{nf(a.output)}</Td>
                <Td className="num">{usdFromMicro(a.cost)}</Td>
                <Td className="num">{latency(a)}</Td>
              </tr>
            ))}
            <tr className="bg-surface-2 font-bold">
              <Td>Total</Td>
              <Td className="num">{nf(total.calls)}</Td>
              <Td className="num">{nf(total.input)}</Td>
              <Td className="num">{nf(total.output)}</Td>
              <Td className="num">{usdFromMicro(total.cost)}</Td>
              <Td className="num">{latency(total)}</Td>
            </tr>
          </Table>
        )}
      </Section>

      <div className="grid gap-x-6 lg:grid-cols-2">
        <Section title="Par statut">
          {total.calls === 0 ? <Empty>Aucun appel à ventiler.</Empty> : (
            <Table caption="Appels IA par statut" head={["Statut", "Appels", "Part"]} minWidth="320px">
              {[...byStatus.entries()].sort((a, b) => b[1] - a[1]).map(([status, n]) => (
                <tr key={status}>
                  <Td className={status === "ok" ? "font-bold" : "font-bold text-danger"}>{STATUS_LABELS[status] ?? status}</Td>
                  <Td className="num">{nf(n)}</Td>
                  <Td className="num">{pct(n, total.calls)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Section>

        <Section title="Top 10 des consommateurs" description="Identifiants tronqués, sans e-mail.">
          {top.length === 0 ? <Empty>Aucun consommateur identifié sur la période.</Empty> : (
            <Table caption="Dix plus gros consommateurs IA" head={["Utilisateur", "Appels", "Tokens (entrée + sortie)", "Coût estimé"]} minWidth="420px">
              {top.map(([userId, a]) => (
                <tr key={userId}>
                  <Td><Mono>{shortId(userId)}</Mono></Td>
                  <Td className="num">{nf(a.calls)}</Td>
                  <Td className="num">{nf(a.input + a.output)}</Td>
                  <Td className="num font-bold">{usdFromMicro(a.cost)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Section>
      </div>
    </>
  );
}
