import Link from "next/link";
import { Badge, Notice, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { euro } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Empty, LoadError, Mono, Section, Table, Td, Tile, TileGrid } from "../../_components/bits";
import { nf, pct, type SearchParams } from "../../_lib/util";
import { growthHref, PERIODS, PLATFORMS, REWARD_TYPES } from "../_lib/util";

type Campaign = {
  id: string; title: string; campaign: string; platform: string; cost_cents: number; views: number; is_paid_partnership: boolean; creator: string | null;
  visits: number; diagnostics: number; signups: number; referrals_qualified: number; premium: number;
};
type GrowthMetrics = {
  diagnostics: number; cards_generated: number; share_sheet_opened: number; share_completed: number; link_copied: number; referral_link_opened: number;
  signups: number; referral_signups: number; referral_qualified: number; referral_rejected: number; rewards_granted: number;
  rewards_by_type: Record<string, number> | null; referee_activation_rate: number | null; viral_coefficient: number | null; active_referrers: number;
  premium_viewed: number; premium_converted: number; challenges_created: number; challenge_joins: number;
  retention: Record<string, number | null> | null; by_campaign: Campaign[] | null;
};

const ratio = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${(Number(v) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
const coef = (v: number | null | undefined) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 3 }));

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <ol className="space-y-2.5 rounded-2xl border border-line bg-surface p-4">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : 0;
        return (
          <li key={s.label}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-bold">{i + 1}. {s.label}</span>
              <span className="num">
                <strong>{nf(s.value)}</strong>
                {i > 0 && <span className="ml-2 text-xs text-muted">{pct(s.value, prev)} de l&apos;étape précédente</span>}
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(s.value > 0 ? 1.5 : 0, (s.value / max) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export async function TableauPanel({ sp }: { sp: SearchParams }) {
  await requireAdmin();
  const days = PERIODS.find((d) => String(d) === sp.jours) ?? 30;
  const { data, error } = await supabaseAdmin().rpc("growth_metrics", { p_days: days });
  const m = !error && data && typeof data === "object" ? (data as GrowthMetrics) : null;

  const periodNav = (
    <nav aria-label="Période" className="flex gap-1.5">
      {PERIODS.map((d) => (
        <Link
          key={d}
          href={growthHref({ tab: "tableau", jours: d })}
          aria-current={d === days ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-bold ${d === days ? "bg-ink text-bg" : "border border-line bg-surface hover:border-brand"}`}
        >
          {d} j
        </Link>
      ))}
    </nav>
  );

  if (!m) {
    return (
      <>
        <PageTitle title="Tableau de bord croissance" action={periodNav} />
        <LoadError what="les indicateurs de croissance" />
      </>
    );
  }

  const rewards = Object.entries(m.rewards_by_type ?? {});
  const campaigns = m.by_campaign ?? [];
  const totalCost = campaigns.reduce((a, c) => a + c.cost_cents, 0);
  const totalSignups = campaigns.reduce((a, c) => a + c.signups, 0);

  return (
    <>
      <PageTitle title="Tableau de bord croissance" subtitle={`${days} derniers jours. Événements anonymes et comptes créés sur la période.`} action={periodNav} />

      <Section title="Diagnostic et partage">
        <TileGrid>
          <Tile label="Diagnostics terminés" value={nf(m.diagnostics)} />
          <Tile label="Cartes générées" value={nf(m.cards_generated)} hint="Cartes d'économie prêtes à partager." />
          <Tile label="Feuilles de partage ouvertes" value={nf(m.share_sheet_opened)} hint="Intention seulement : pas un partage." />
          <Tile label="Partages confirmés" value={nf(m.share_completed)} hint="Événement share_completed." tone="positive" />
          <Tile label="Liens copiés" value={nf(m.link_copied)} />
          <Tile label="Ouvertures de liens de parrainage" value={nf(m.referral_link_opened)} />
        </TileGrid>
        <Notice className="mt-3">
          Une ouverture de la feuille de partage n&apos;est pas un partage : seuls les <Mono>share_completed</Mono> comptent comme partages confirmés.
          Les deux chiffres sont toujours affichés séparément.
        </Notice>
      </Section>

      <Section title="Entonnoir viral" description="Volumes d'événements sur la période, étape par étape. Ce n'est pas le suivi d'une même cohorte : un taux peut dépasser 100 %.">
        <Funnel
          steps={[
            { label: "Ouverture d'un lien de parrainage", value: m.referral_link_opened },
            { label: "Diagnostic terminé", value: m.diagnostics },
            { label: "Carte générée", value: m.cards_generated },
            { label: "Partage confirmé", value: m.share_completed },
            { label: "Inscription attribuée au parrainage", value: m.referral_signups },
            { label: "Filleul qualifié", value: m.referral_qualified },
          ]}
        />
      </Section>

      <Section title="Inscriptions et parrainage">
        <TileGrid>
          <Tile label="Inscriptions" value={nf(m.signups)} />
          <Tile label="Inscriptions attribuées au parrainage" value={nf(m.referral_signups)} hint={`${pct(m.referral_signups, m.signups)} des inscriptions`} />
          <Tile label="Filleuls qualifiés" value={nf(m.referral_qualified)} tone="positive" />
          <Tile label="Refusés (anti-fraude)" value={nf(m.referral_rejected)} tone={m.referral_rejected > 0 ? "warn" : undefined} hint="Motifs dans l'onglet Récompenses." />
          <Tile label="Taux d'activation des filleuls" value={ratio(m.referee_activation_rate)} hint="Filleuls qualifiés ÷ inscriptions attribuées, sur la période." />
          <Tile label="Coefficient viral estimé" value={coef(m.viral_coefficient)} hint="Inscriptions attribuées au parrainage ÷ inscriptions de la période." />
          <Tile label="Parrains actifs" value={nf(m.active_referrers)} hint="Parrains avec au moins un filleul inscrit sur la période." />
          <Tile
            label="Récompenses distribuées"
            value={nf(m.rewards_granted)}
            hint={rewards.length ? rewards.map(([t, c]) => `${REWARD_TYPES[t] ?? t} : ${nf(c)}`).join(" · ") : "Aucune sur la période."}
          />
        </TileGrid>
        <Notice className="mt-3" title="Définition du coefficient viral estimé">
          Nombre de nouveaux inscrits attribués au parrainage, divisé par le nombre total d&apos;inscrits de la période.
          C&apos;est une estimation : elle ne mesure pas le nombre d&apos;invitations envoyées par utilisateur, et 1 signifierait que chaque inscrit vient d&apos;un parrainage.
        </Notice>
      </Section>

      <Section title="Premium et défis">
        <TileGrid>
          <Tile label="Vues Premium" value={nf(m.premium_viewed)} hint="Pages et écrans d'offre Plus affichés." />
          <Tile label="Conversions Premium" value={nf(m.premium_converted)} hint={`${pct(m.premium_converted, m.premium_viewed)} des vues`} tone="positive" />
          <Tile label="Défis créés" value={nf(m.challenges_created)} />
          <Tile label="Défis rejoints" value={nf(m.challenge_joins)} hint="Participations enregistrées sur la période." />
        </TileGrid>
      </Section>

      <Section
        title="Rétention"
        description="Part des inscrits revenus au moins n jours après leur inscription (connexion ou activité). Cohortes : comptes créés dans les 60 jours précédant J−n. Indépendant de la période choisie."
      >
        <TileGrid>
          <Tile label="Rétention J1" value={ratio(m.retention?.d1)} />
          <Tile label="Rétention J7" value={ratio(m.retention?.d7)} />
          <Tile label="Rétention J30" value={ratio(m.retention?.d30)} />
        </TileGrid>
      </Section>

      <Section
        title="Par contenu / créateur"
        description="Attribution par utm_campaign, depuis la création du contenu (toutes périodes). Coût d'acquisition = coût ÷ inscriptions."
      >
        {campaigns.length === 0 ? (
          <Empty>Aucun contenu suivi. Ajoute une vidéo dans l&apos;onglet Contenus pour obtenir son lien d&apos;attribution.</Empty>
        ) : (
          <>
            <Table caption="Résultats par contenu" head={["Contenu", "Créateur", "Visites", "Diagnostics", "Inscriptions", "Parrainages qualifiés", "Premium", "Coût", "Coût d'acquisition"]} minWidth="980px">
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={growthHref({ tab: "contenus", edit: c.id })} className="font-bold text-brand-strong underline underline-offset-2">{c.title}</Link>
                    <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted">
                      {PLATFORMS[c.platform] ?? c.platform} · <Mono>{c.campaign}</Mono>
                      {c.is_paid_partnership && <Badge tone="warn">Partenariat rémunéré</Badge>}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{c.creator ?? "—"}</Td>
                  <Td className="num">{nf(c.visits)}</Td>
                  <Td className="num">{nf(c.diagnostics)}</Td>
                  <Td className="num font-bold">{nf(c.signups)}</Td>
                  <Td className="num">{nf(c.referrals_qualified)}</Td>
                  <Td className="num">{nf(c.premium)}</Td>
                  <Td className="num whitespace-nowrap">{euro(c.cost_cents)}</Td>
                  <Td className="num whitespace-nowrap font-bold">{c.signups > 0 ? euro(Math.round(c.cost_cents / c.signups)) : "—"}</Td>
                </tr>
              ))}
            </Table>
            <p className="mt-2 text-xs text-muted">
              Total : {euro(totalCost)} dépensés, {nf(totalSignups)} inscription{totalSignups > 1 ? "s" : ""} attribuée{totalSignups > 1 ? "s" : ""}
              {totalSignups > 0 ? ` — coût d'acquisition moyen ${euro(Math.round(totalCost / totalSignups))}` : ""}. Les 200 contenus les plus récents sont affichés.
            </p>
          </>
        )}
      </Section>
    </>
  );
}
