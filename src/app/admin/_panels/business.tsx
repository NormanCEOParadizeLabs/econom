import { Badge, Notice, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { euro } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Empty, LoadError, Mono, Section, Table, Td, Tile, TileGrid } from "../_components/bits";
import { countRows, getMetrics } from "../_lib/data";
import { BILLING_STATUSES, dateTimeFr, nf, pct, shortId, usdFromMicro } from "../_lib/util";

type SubEvent = { id: number; user_id: string | null; type: string; from_status: string | null; to_status: string | null; amount_cents: number | null; created_at: string };

const FEATURES: [string, string][] = [
  ["user_contracts", "Abonnements suivis"],
  ["document_analyses", "Documents analysés"],
  ["comparison_results", "Comparaisons enregistrées"],
  ["favorites", "Favoris"],
  ["referrals", "Parrainages"],
];

export async function BusinessPanel() {
  await requireAdmin();
  const statuses = Object.keys(BILLING_STATUSES);
  const [metrics, statusCounts, featureCounts, eventsRes] = await Promise.all([
    getMetrics(),
    Promise.all(statuses.map((s) => countRows("subscriptions", { column: "status", value: s }))),
    Promise.all(FEATURES.map(([table]) => countRows(table))),
    supabaseAdmin().from("subscription_events").select("id, user_id, type, from_status, to_status, amount_cents, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const events = (eventsRes.data ?? []) as SubEvent[];
  const totalSubs = statusCounts.reduce<number>((sum, n) => sum + (n ?? 0), 0);

  return (
    <>
      <PageTitle title="Business" subtitle="Abonnements, revenus encaissés et utilisation des fonctionnalités." />

      <Section title="Revenus et coûts">
        {!metrics ? <LoadError what="les indicateurs" /> : (
          <>
            <TileGrid>
              <Tile label="Revenus encaissés (30 j)" value={euro(Number(metrics.revenue_paid_cents_30d ?? 0))} hint="Encaissé via Stripe (factures payées), avant frais Stripe." tone="positive" />
              <Tile label="Coût de fonctionnement estimé (mois)" value={usdFromMicro(metrics.ai_cost_micro_usd_month)} hint="Coût IA du mois en cours uniquement, en dollars US." />
              <Tile label="Résiliations programmées" value={nf(metrics.plus_canceling)} hint="Abonnés actifs qui partent en fin de période." tone={Number(metrics.plus_canceling) > 0 ? "warn" : undefined} />
              <Tile label="Résiliés" value={nf(metrics.plus_canceled)} hint="Abonnements au statut résilié." />
            </TileGrid>
            <Notice tone="info" className="mt-3">
              L&apos;estimation du coût de fonctionnement ne comprend <strong>que le coût IA</strong>. L&apos;hébergement, la base de données et les frais Stripe ne sont pas inclus :
              ce n&apos;est donc pas une marge. Les revenus sont en euros et le coût IA en dollars, sans conversion.
            </Notice>
          </>
        )}
      </Section>

      <Section title="Abonnements par statut">
        <Table caption="Abonnements par statut" head={["Statut", "Comptes", "Part"]} minWidth="360px">
          {statuses.map((s, i) => (
            <tr key={s}>
              <Td className="font-bold">{BILLING_STATUSES[s]}</Td>
              <Td className="num">{statusCounts[i] === null ? "indisponible" : nf(statusCounts[i])}</Td>
              <Td className="num">{statusCounts[i] === null ? "—" : pct(statusCounts[i] ?? 0, totalSubs)}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Utilisation des fonctionnalités" description="Nombre total de lignes enregistrées, tous utilisateurs confondus.">
        <TileGrid>
          {FEATURES.map(([table, label], i) => (
            <Tile key={table} label={label} value={featureCounts[i] === null ? "—" : nf(featureCounts[i])} hint={featureCounts[i] === null ? "Lecture impossible." : undefined} />
          ))}
        </TileGrid>
      </Section>

      <Section title="Derniers événements d'abonnement" description="Les 50 plus récents.">
        {eventsRes.error ? <LoadError what="les événements d'abonnement" /> : events.length === 0 ? (
          <Empty>Aucun événement d&apos;abonnement enregistré.</Empty>
        ) : (
          <Table caption="Derniers événements d'abonnement" head={["Date", "Utilisateur", "Type", "Transition", "Montant"]}>
            {events.map((e) => (
              <tr key={e.id}>
                <Td className="whitespace-nowrap">{dateTimeFr(e.created_at)}</Td>
                <Td>{e.user_id ? <Mono>{shortId(e.user_id)}</Mono> : <span className="text-muted">compte supprimé</span>}</Td>
                <Td className="font-mono text-xs">{e.type}</Td>
                <Td className="whitespace-nowrap">
                  {e.from_status || e.to_status ? (
                    <>
                      {e.from_status ? BILLING_STATUSES[e.from_status] ?? e.from_status : "—"} → {e.to_status ? <Badge tone={e.to_status === "canceled" || e.to_status === "past_due" || e.to_status === "unpaid" ? "danger" : "neutral"}>{BILLING_STATUSES[e.to_status] ?? e.to_status}</Badge> : "—"}
                    </>
                  ) : "—"}
                </Td>
                <Td className="num whitespace-nowrap">{e.amount_cents === null ? "—" : euro(e.amount_cents)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
