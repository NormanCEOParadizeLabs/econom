import { PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { euro } from "@/lib/format";
import { Empty, LoadError, Section, Table, Td, Tile, TileGrid } from "../_components/bits";
import { getMetrics } from "../_lib/data";
import { nf, pct } from "../_lib/util";

function CountTable({ caption, head, data, empty }: { caption: string; head: [string, string]; data: Record<string, number> | undefined; empty: string }) {
  const rows = Object.entries(data ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <Table caption={caption} head={head} minWidth="320px">
      {rows.map(([name, count]) => (
        <tr key={name}>
          <Td className="font-mono text-xs">{name}</Td>
          <Td className="num text-right font-bold">{nf(count)}</Td>
        </tr>
      ))}
    </Table>
  );
}

export async function ApercuPanel() {
  await requireAdmin();
  const m = await getMetrics();
  if (!m) {
    return (
      <>
        <PageTitle title="Aperçu" />
        <LoadError what="les indicateurs" />
      </>
    );
  }
  const users = Number(m.users_total ?? 0);
  const plus = Number(m.plus_active ?? 0);

  return (
    <>
      <PageTitle title="Aperçu" subtitle="Indicateurs calculés en base à l'instant de l'affichage." />

      <Section title="Utilisateurs">
        <TileGrid>
          <Tile label="Inscrits" value={nf(users)} />
          <Tile label="Nouveaux (7 j)" value={nf(m.users_7d)} />
          <Tile label="Actifs (30 j)" value={nf(m.active_30d)} hint="Comptes ayant généré au moins un événement produit." />
          <Tile label="Conversion gratuit → Plus" value={pct(plus, users)} hint="Plus actifs ÷ inscrits." />
        </TileGrid>
      </Section>

      <Section title="ECONOM. Plus">
        <TileGrid>
          <Tile label="Plus actifs" value={nf(plus)} hint="Statuts actif et essai." tone="positive" />
          <Tile label="Paiements en retard" value={nf(m.plus_past_due)} tone={Number(m.plus_past_due) > 0 ? "danger" : undefined} />
          <Tile label="Résiliations programmées" value={nf(m.plus_canceling)} hint="Actifs qui s'arrêtent en fin de période." />
          <Tile label="Résiliés" value={nf(m.plus_canceled)} />
          <Tile label="Revenus encaissés (30 j)" value={euro(Number(m.revenue_paid_cents_30d ?? 0))} hint="Encaissé via Stripe (factures payées)." />
        </TileGrid>
      </Section>

      <Section title="Comparateur et économies">
        <TileGrid>
          <Tile label="Comparaisons (30 j)" value={nf(m.comparisons_30d)} />
          <Tile
            label="Économies potentielles cumulées"
            value={euro(Number(m.potential_savings_cents ?? 0), { decimals: false })}
            hint="Estimations issues des comparaisons, non réalisées : ce n'est pas de l'argent économisé."
          />
          <Tile
            label="Économies confirmées (par mois)"
            value={euro(Number(m.confirmed_monthly_cents ?? 0), { decimals: false })}
            hint="Déclarées par les utilisateurs ou constatées sur facture, en euros par mois."
            tone="positive"
          />
        </TileGrid>
      </Section>

      <Section title="Catalogue">
        <TileGrid>
          <Tile label="Offres vérifiées" value={nf(m.offers_verified)} hint="Publiées, hors démo." />
          <Tile label="Offres expirant sous 7 j" value={nf(m.offers_expiring_7d)} tone={Number(m.offers_expiring_7d) > 0 ? "warn" : undefined} />
          <Tile label="Offres expirées" value={nf(m.offers_expired)} hint="Vérifiées mais plus affichées." tone={Number(m.offers_expired) > 0 ? "danger" : undefined} />
          <Tile label="Bons plans vérifiés" value={nf(m.deals_verified)} hint="Hors démo." />
          <Tile label="Bons plans en attente" value={nf(m.deals_pending)} tone={Number(m.deals_pending) > 0 ? "warn" : undefined} />
        </TileGrid>
      </Section>

      <div className="grid gap-x-6 lg:grid-cols-2">
        <Section title="Événements produit (30 j)">
          <CountTable caption="Événements produit sur 30 jours" head={["Événement", "Nombre"]} data={m.events_by_name_30d} empty="Aucun événement enregistré sur 30 jours." />
        </Section>
        <Section title="Inscriptions par source (30 j)">
          <CountTable caption="Inscriptions par source sur 30 jours" head={["Source", "Inscriptions"]} data={m.signups_by_source_30d} empty="Aucune inscription attribuée sur 30 jours." />
        </Section>
      </div>
    </>
  );
}
