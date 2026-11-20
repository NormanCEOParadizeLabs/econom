import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button, Card, Field, Input, LinkButton, Notice, PageTitle, Select, Textarea, Toggle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { dateFr, euro } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { archiveOffer, deleteDraftOffer, extendOffer, saveOffer, verifyOffer } from "../actions";
import { ActionForm, SubmitButton } from "../_components/action-form";
import { Empty, LoadError, Mono, Section, Table, Td } from "../_components/bits";
import {
  addDays, adminHref, dateTimeFr, eurosInput, HOST_NETWORKS, OFFER_CATEGORIES, OFFER_MAX_VALIDITY_DAYS, OFFER_STATUSES, shortId, TECHNOLOGIES,
  todayParis, type SearchParams,
} from "../_lib/util";

type Provider = { id: string; slug: string; name: string };
type Offer = {
  id: string; provider_id: string; category: string; name: string; monthly_cents: number; intro_months: number; after_cents: number;
  commitment_months: number; activation_fee_cents: number; sim_fee_cents: number; termination_fee_cents: number;
  data_gb: number | null; roaming_gb: number | null; five_g: boolean; host_network: string | null; technology: string | null;
  download_mbps: number | null; upload_mbps: number | null; has_tv: boolean; has_phone: boolean; attrs: Record<string, unknown> | null;
  conditions: string | null; promo_conditions: string | null; url: string; is_partner: boolean; is_demo: boolean; status: string;
  verified_at: string | null; valid_until: string | null; updated_at: string; providers: { name: string } | null;
};
type Source = { id: string; url: string; label: string | null; evidence: string | null; checked_at: string };
type History = { id: number; monthly_cents: number; intro_months: number; after_cents: number; status: string; valid_until: string | null; changed_by: string | null; changed_at: string };

const DATA_RULE = "Ne saisis que des tarifs lus sur le site officiel du fournisseur. Les données de démonstration doivent être cochées DÉMO et ne sont jamais publiées.";
const dShort = (iso: string | null) => dateFr(iso, { day: "2-digit", month: "2-digit", year: "numeric" });

function OfferBadges({ o, today }: { o: Pick<Offer, "status" | "valid_until" | "is_partner" | "is_demo">; today: string }) {
  const expired = o.status === "verified" && o.valid_until !== null && o.valid_until < today;
  const soon = o.status === "verified" && o.valid_until !== null && !expired && o.valid_until <= addDays(today, 7);
  return (
    <span className="flex flex-wrap gap-1">
      <Badge tone={o.status === "verified" ? "positive" : "neutral"}>{OFFER_STATUSES[o.status] ?? o.status}</Badge>
      {expired && <Badge tone="danger">expirée</Badge>}
      {soon && <Badge tone="warn">expire bientôt</Badge>}
      {o.is_partner && <Badge tone="brand">partenaire</Badge>}
      {o.is_demo && <Badge tone="accent">DÉMO</Badge>}
    </span>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  // Seules les URL https sont rendues cliquables.
  if (!href.startsWith("https://")) return <span className="break-all">{children}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold text-brand-strong underline underline-offset-2">{children}</a>;
}

export async function OffresPanel({ sp }: { sp: SearchParams }) {
  await requireAdmin();
  if (sp.edit || sp.new === "1") return <OfferSheet id={sp.edit} note={sp.note} />;
  return <OfferList sp={sp} />;
}

// ───────────────────────────── Liste

async function OfferList({ sp }: { sp: SearchParams }) {
  const category = sp.categorie && sp.categorie in OFFER_CATEGORIES ? sp.categorie : "";
  const status = sp.statut && sp.statut in OFFER_STATUSES ? sp.statut : "";
  let query = supabaseAdmin().from("offers").select("*, providers(name)").order("updated_at", { ascending: false }).limit(300);
  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  const offers = (data ?? []) as Offer[];
  const today = todayParis();

  return (
    <>
      <PageTitle title="Offres du comparateur" action={<LinkButton href={adminHref({ tab: "offres", new: 1 })} size="sm">+ Nouvelle offre</LinkButton>} />
      <Notice tone="warn" className="mb-4">{DATA_RULE}</Notice>
      {sp.note === "supprimee" && <Notice tone="success" className="mb-4">Brouillon supprimé.</Notice>}

      <form method="get" action="/admin" className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="offres" />
        <div>
          <label htmlFor="f-categorie" className="mb-1.5 block text-sm font-bold">Catégorie</label>
          <Select id="f-categorie" name="categorie" defaultValue={category}>
            <option value="">Toutes</option>
            {Object.entries(OFFER_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="f-statut" className="mb-1.5 block text-sm font-bold">Statut</label>
          <Select id="f-statut" name="statut" defaultValue={status}>
            <option value="">Tous</option>
            {Object.entries(OFFER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <Button type="submit" variant="outline">Filtrer</Button>
      </form>

      {error ? (
        <LoadError what="les offres" />
      ) : offers.length === 0 ? (
        <Empty>{category || status ? "Aucune offre ne correspond à ces filtres." : "Aucune offre dans le catalogue. Ajoute la première avec « Nouvelle offre »."}</Empty>
      ) : (
        <>
          <Table caption="Catalogue des offres" head={["Offre", "Prix", "Promo", "Frais", "Data / débit", "Vérifiée le", "Valide jusqu'au", "État", "Actions"]} minWidth="1180px">
            {offers.map((o) => {
              const fees = o.activation_fee_cents + o.sim_fee_cents;
              return (
                <tr key={o.id}>
                  <Td>
                    <span className="block text-xs font-bold uppercase tracking-wide text-muted">{o.providers?.name ?? "—"} · {OFFER_CATEGORIES[o.category] ?? o.category}</span>
                    <Link href={adminHref({ tab: "offres", edit: o.id })} className="font-bold text-brand-strong underline underline-offset-2">{o.name}</Link>
                  </Td>
                  <Td className="num whitespace-nowrap font-bold">{euro(o.monthly_cents)}</Td>
                  <Td className="whitespace-nowrap">{o.intro_months > 0 ? <>{o.intro_months} mois, puis <span className="num font-bold">{euro(o.after_cents)}</span></> : "—"}</Td>
                  <Td className="whitespace-nowrap">
                    {fees > 0 ? euro(fees) : "—"}
                    {o.termination_fee_cents > 0 && <span className="block text-xs text-muted">résiliation {euro(o.termination_fee_cents)}</span>}
                    {o.commitment_months > 0 && <span className="block text-xs text-muted">engagement {o.commitment_months} mois</span>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {o.data_gb !== null ? `${Number(o.data_gb).toLocaleString("fr-FR")} Go${o.five_g ? " · 5G" : ""}` : o.download_mbps !== null ? `${o.download_mbps.toLocaleString("fr-FR")} Mb/s${o.technology ? ` · ${TECHNOLOGIES[o.technology] ?? o.technology}` : ""}` : "—"}
                  </Td>
                  <Td className="whitespace-nowrap">{dShort(o.verified_at)}</Td>
                  <Td className="whitespace-nowrap">{dShort(o.valid_until)}</Td>
                  <Td><OfferBadges o={o} today={today} /></Td>
                  <Td>
                    <div className="flex min-w-44 flex-col items-start gap-1.5">
                      <LinkButton href={adminHref({ tab: "offres", edit: o.id })} variant="outline" size="sm">Modifier</LinkButton>
                      {o.status !== "verified" && (
                        <ActionForm action={verifyOffer}>
                          <input type="hidden" name="id" value={o.id} />
                          <SubmitButton>Marquer vérifiée aujourd&apos;hui</SubmitButton>
                        </ActionForm>
                      )}
                      {o.status !== "archived" && (
                        <ActionForm action={archiveOffer} confirm={`Désactiver « ${o.name} » ? Elle ne sera plus proposée dans le comparateur.`}>
                          <input type="hidden" name="id" value={o.id} />
                          <SubmitButton variant="ghost">Désactiver</SubmitButton>
                        </ActionForm>
                      )}
                      {o.status === "draft" && (
                        <ActionForm action={deleteDraftOffer} confirm={`Supprimer définitivement le brouillon « ${o.name} » ?`}>
                          <input type="hidden" name="id" value={o.id} />
                          <SubmitButton variant="ghost" className="text-danger">Supprimer le brouillon</SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
          {offers.length === 300 && <p className="mt-2 text-xs text-muted">Affichage limité aux 300 offres les plus récemment modifiées : utilise les filtres pour affiner.</p>}
        </>
      )}
    </>
  );
}

// ───────────────────────────── Fiche (création / édition)

const NOTES: Record<string, { tone: "success" | "warn"; text: string }> = {
  creee: { tone: "success", text: "Offre créée en brouillon." },
  verifiee: { tone: "success", text: "Offre créée et marquée vérifiée aujourd'hui." },
  "source-ko": { tone: "warn", text: "Offre créée en brouillon, mais la source n'a pas pu être enregistrée. Ajoute-la de nouveau ci-dessous." },
  "verif-ko": { tone: "warn", text: "Offre créée en brouillon, mais la vérification a échoué. Contrôle les dates puis réessaie." },
};

function Group({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-surface p-4">
      <legend className="px-1.5 font-display text-base font-extrabold">{title}</legend>
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

async function OfferSheet({ id, note }: { id?: string; note?: string }) {
  const db = supabaseAdmin();
  const today = todayParis();
  const maxDate = addDays(today, OFFER_MAX_VALIDITY_DAYS);
  const { data: providerRows } = await db.from("providers").select("id, slug, name").order("name").limit(500);
  const providers = (providerRows ?? []) as Provider[];

  let o: Offer | null = null;
  let sources: Source[] = [];
  let history: History[] = [];
  if (id) {
    const valid = /^[0-9a-f-]{36}$/i.test(id);
    const { data } = valid ? await db.from("offers").select("*, providers(name)").eq("id", id).maybeSingle() : { data: null };
    o = (data as Offer | null) ?? null;
    if (!o) {
      return (
        <>
          <PageTitle title="Offre introuvable" />
          <Empty>Cette offre n&apos;existe pas ou a été supprimée. <Link href={adminHref({ tab: "offres" })} className="font-bold text-brand-strong underline">Retour au catalogue</Link></Empty>
        </>
      );
    }
    const [s, h] = await Promise.all([
      db.from("offer_sources").select("id, url, label, evidence, checked_at").eq("offer_id", o.id).order("checked_at", { ascending: false }).limit(50),
      db.from("offer_price_history").select("id, monthly_cents, intro_months, after_cents, status, valid_until, changed_by, changed_at").eq("offer_id", o.id).order("changed_at", { ascending: false }).limit(50),
    ]);
    sources = (s.data ?? []) as Source[];
    history = (h.data ?? []) as History[];
  }
  const attrs = o?.attrs && Object.keys(o.attrs).length > 0 ? JSON.stringify(o.attrs, null, 2) : "";

  return (
    <>
      <p className="mb-3"><Link href={adminHref({ tab: "offres" })} className="text-sm font-bold text-brand-strong">← Retour au catalogue</Link></p>
      <PageTitle title={o ? o.name : "Nouvelle offre"} subtitle={o ? `${o.providers?.name ?? "Opérateur inconnu"} · ${OFFER_CATEGORIES[o.category] ?? o.category}` : undefined} action={o ? <OfferBadges o={o} today={today} /> : undefined} />
      <Notice tone="warn" className="mb-4">{DATA_RULE}</Notice>
      {note && NOTES[note] && <Notice tone={NOTES[note].tone} className="mb-4">{NOTES[note].text}</Notice>}

      <ActionForm action={saveOffer} resetOnSuccess className="space-y-4">
        {o && <input type="hidden" name="id" value={o.id} />}

        <Group title="Opérateur" hint="Choisis un opérateur existant, ou laisse « Nouvel opérateur » et renseigne son identifiant et son nom.">
          <Field label="Opérateur" htmlFor="o-provider">
            <Select id="o-provider" name="provider_id" defaultValue={o?.provider_id ?? ""}>
              <option value="">— Nouvel opérateur —</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>)}
            </Select>
          </Field>
          <Field label="Identifiant du nouvel opérateur" htmlFor="o-pslug" hint="Minuscules, chiffres et tirets. Ex. : mon-operateur">
            <Input id="o-pslug" name="provider_slug" pattern="[a-z0-9\-]{2,40}" maxLength={40} autoComplete="off" aria-describedby="o-pslug-hint" />
          </Field>
          <Field label="Nom du nouvel opérateur" htmlFor="o-pname">
            <Input id="o-pname" name="provider_name" maxLength={60} autoComplete="off" />
          </Field>
          <Field label="Site du nouvel opérateur" htmlFor="o-pweb" hint="Facultatif, https:// uniquement.">
            <Input id="o-pweb" name="provider_website" type="url" placeholder="https://" maxLength={500} aria-describedby="o-pweb-hint" />
          </Field>
        </Group>

        <Group title="Offre">
          <Field label="Catégorie" htmlFor="o-category">
            <Select id="o-category" name="category" defaultValue={o?.category ?? "mobile"} required>
              {Object.entries(OFFER_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Nom de l'offre" htmlFor="o-name">
            <Input id="o-name" name="name" required maxLength={120} defaultValue={o?.name ?? ""} />
          </Field>
          <Field label="URL officielle de l'offre" htmlFor="o-url" hint="Page de l'offre sur le site du fournisseur (https://).">
            <Input id="o-url" name="url" type="url" required placeholder="https://" maxLength={500} defaultValue={o?.url ?? ""} aria-describedby="o-url-hint" />
          </Field>
        </Group>

        <Group title="Prix" hint="Montants en euros TTC (ex. 19,99). Ils sont enregistrés en centimes.">
          <Field label="Prix mensuel (€)" htmlFor="o-monthly">
            <Input id="o-monthly" name="monthly" inputMode="decimal" required defaultValue={eurosInput(o?.monthly_cents)} />
          </Field>
          <Field label="Durée de la promo (mois)" htmlFor="o-intro" hint="0 = pas de promotion.">
            <Input id="o-intro" name="intro_months" type="number" min={0} max={48} step={1} defaultValue={o?.intro_months ?? 0} aria-describedby="o-intro-hint" />
          </Field>
          <Field label="Prix après promo (€)" htmlFor="o-after" hint="Sans promo (0 mois) : laisse vide ou saisis le prix mensuel.">
            <Input id="o-after" name="after" inputMode="decimal" defaultValue={o && o.intro_months > 0 ? eurosInput(o.after_cents) : ""} aria-describedby="o-after-hint" />
          </Field>
          <Field label="Engagement (mois)" htmlFor="o-commit">
            <Input id="o-commit" name="commitment_months" type="number" min={0} max={48} step={1} defaultValue={o?.commitment_months ?? 0} />
          </Field>
          <Field label="Frais d'activation (€)" htmlFor="o-activation">
            <Input id="o-activation" name="activation_fee" inputMode="decimal" defaultValue={eurosInput(o?.activation_fee_cents ?? 0)} />
          </Field>
          <Field label="Frais de carte SIM (€)" htmlFor="o-sim">
            <Input id="o-sim" name="sim_fee" inputMode="decimal" defaultValue={eurosInput(o?.sim_fee_cents ?? 0)} />
          </Field>
          <Field label="Frais de résiliation (€)" htmlFor="o-term">
            <Input id="o-term" name="termination_fee" inputMode="decimal" defaultValue={eurosInput(o?.termination_fee_cents ?? 0)} />
          </Field>
        </Group>

        <Group title="Mobile" hint="À remplir pour les forfaits mobiles.">
          <Field label="Data (Go)" htmlFor="o-data">
            <Input id="o-data" name="data_gb" inputMode="decimal" defaultValue={o?.data_gb ?? ""} />
          </Field>
          <Field label="Data en itinérance (Go)" htmlFor="o-roaming">
            <Input id="o-roaming" name="roaming_gb" inputMode="decimal" defaultValue={o?.roaming_gb ?? ""} />
          </Field>
          <Field label="Réseau hôte" htmlFor="o-host">
            <Select id="o-host" name="host_network" defaultValue={o?.host_network ?? ""}>
              <option value="">— Non précisé —</option>
              {HOST_NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Toggle id="o-5g" name="five_g" label="5G incluse" defaultChecked={o?.five_g ?? false} />
        </Group>

        <Group title="Internet" hint="À remplir pour les box internet.">
          <Field label="Technologie" htmlFor="o-tech">
            <Select id="o-tech" name="technology" defaultValue={o?.technology ?? ""}>
              <option value="">— Non précisée —</option>
              {Object.entries(TECHNOLOGIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Débit descendant (Mb/s)" htmlFor="o-down">
            <Input id="o-down" name="download_mbps" type="number" min={1} step={1} defaultValue={o?.download_mbps ?? ""} />
          </Field>
          <Field label="Débit montant (Mb/s)" htmlFor="o-up">
            <Input id="o-up" name="upload_mbps" type="number" min={1} step={1} defaultValue={o?.upload_mbps ?? ""} />
          </Field>
          <Toggle id="o-tv" name="has_tv" label="TV incluse" defaultChecked={o?.has_tv ?? false} />
          <Toggle id="o-phone" name="has_phone" label="Téléphonie fixe incluse" defaultChecked={o?.has_phone ?? false} />
        </Group>

        <Group title="Conditions et transparence">
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Conditions" htmlFor="o-cond">
              <Textarea id="o-cond" name="conditions" maxLength={1200} defaultValue={o?.conditions ?? ""} />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Conditions de la promo" htmlFor="o-promo">
              <Textarea id="o-promo" name="promo_conditions" maxLength={600} defaultValue={o?.promo_conditions ?? ""} />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Paramètres spécifiques (JSON)" htmlFor="o-attrs" hint={'Énergie et cas particuliers. Objet JSON, ex. {"puissance_kva": 6}. Laisse vide sinon.'}>
              <Textarea id="o-attrs" name="attrs" maxLength={4000} spellCheck={false} className="font-mono text-sm" defaultValue={attrs} aria-describedby="o-attrs-hint" />
            </Field>
          </div>
          <Toggle id="o-partner" name="is_partner" label="Partenaire" description="Relation commerciale : toujours affichée aux utilisateurs." defaultChecked={o?.is_partner ?? false} />
          <Toggle id="o-demo" name="is_demo" label="DÉMO" description="Donnée de démonstration : jamais publiée." defaultChecked={o?.is_demo ?? false} />
        </Group>

        <Group title="Validité de la vérification" hint={`Pour marquer l'offre vérifiée : date future, au plus ${OFFER_MAX_VALIDITY_DAYS} jours (jusqu'au ${dShort(maxDate)}).`}>
          <Field label="Valide jusqu'au" htmlFor="o-valid">
            <Input id="o-valid" name="valid_until" type="date" max={maxDate} defaultValue={o?.valid_until ?? ""} />
          </Field>
          {o && <p className="self-end text-sm text-muted">Dernière vérification : {dShort(o.verified_at)}</p>}
        </Group>

        <Group title="Ajouter une source" hint="Page officielle où le tarif a été lu. Au moins une source https est exigée pour vérifier l'offre.">
          <Field label="URL de la source" htmlFor="o-src-url">
            <Input id="o-src-url" name="source_url" type="url" placeholder="https://" maxLength={500} />
          </Field>
          <Field label="Libellé" htmlFor="o-src-label">
            <Input id="o-src-label" name="source_label" maxLength={120} placeholder="Ex. Fiche tarifaire officielle" />
          </Field>
          <Field label="Date de consultation" htmlFor="o-src-date" hint="Par défaut : aujourd'hui.">
            <Input id="o-src-date" name="source_checked_at" type="date" max={today} aria-describedby="o-src-date-hint" />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Citation / preuve" htmlFor="o-src-ev" hint="Extrait exact de la page prouvant le tarif (400 caractères max).">
              <Textarea id="o-src-ev" name="source_evidence" maxLength={400} aria-describedby="o-src-ev-hint" />
            </Field>
          </div>
        </Group>

        <div className="flex flex-wrap gap-2">
          <SubmitButton name="intent" value="draft" variant="outline" size="md">Enregistrer comme brouillon</SubmitButton>
          <SubmitButton name="intent" value="verify" size="md">Enregistrer et marquer vérifiée aujourd&apos;hui</SubmitButton>
        </div>
        {o?.status === "verified" && <p className="text-xs text-muted">« Enregistrer comme brouillon » retire l&apos;offre du comparateur jusqu&apos;à la prochaine vérification.</p>}
      </ActionForm>

      {o && (
        <>
          <Section title="Sources enregistrées">
            {sources.length === 0 ? (
              <Empty>Aucune source. Ajoute une source officielle avant de vérifier l&apos;offre.</Empty>
            ) : (
              <Table caption="Sources de l'offre" head={["Consultée le", "Source", "Citation / preuve"]}>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <Td className="whitespace-nowrap">{dShort(s.checked_at)}</Td>
                    <Td><ExternalLink href={s.url}>{s.label ?? s.url}</ExternalLink></Td>
                    <Td className="text-muted">{s.evidence ?? "—"}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>

          {o.status === "verified" && (
            <Section title="Prolonger la vérification" description="À utiliser après avoir relu le tarif sur le site officiel : enregistre une nouvelle source datée d'aujourd'hui.">
              <Card>
                <ActionForm action={extendOffer} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={o.id} />
                  <Field label="Nouvelle date d'expiration" htmlFor="x-valid" hint={`Au plus tard le ${dShort(maxDate)}.`}>
                    <Input id="x-valid" name="valid_until" type="date" required min={addDays(today, 1)} max={maxDate} defaultValue={maxDate} aria-describedby="x-valid-hint" />
                  </Field>
                  <Field label="URL de la source relue" htmlFor="x-url">
                    <Input id="x-url" name="source_url" type="url" required placeholder="https://" maxLength={500} defaultValue={sources[0]?.url ?? o.url} />
                  </Field>
                  <Field label="Libellé" htmlFor="x-label">
                    <Input id="x-label" name="source_label" maxLength={120} defaultValue={sources[0]?.label ?? ""} />
                  </Field>
                  <Field label="Citation / preuve" htmlFor="x-ev">
                    <Input id="x-ev" name="source_evidence" maxLength={400} />
                  </Field>
                  <div className="sm:col-span-2"><SubmitButton>Prolonger la vérification</SubmitButton></div>
                </ActionForm>
              </Card>
            </Section>
          )}

          <Section title="Historique des prix" description="Alimenté automatiquement à chaque changement de prix, de statut ou de date d'expiration.">
            {history.length === 0 ? (
              <Empty>Aucun historique pour cette offre.</Empty>
            ) : (
              <Table caption="Historique des prix de l'offre" head={["Date", "Prix mensuel", "Promo", "Prix après", "Statut", "Valide jusqu'au", "Par"]}>
                {history.map((h) => (
                  <tr key={h.id}>
                    <Td className="whitespace-nowrap">{dateTimeFr(h.changed_at)}</Td>
                    <Td className="num font-bold">{euro(h.monthly_cents)}</Td>
                    <Td>{h.intro_months > 0 ? `${h.intro_months} mois` : "—"}</Td>
                    <Td className="num">{euro(h.after_cents)}</Td>
                    <Td>{OFFER_STATUSES[h.status] ?? h.status}</Td>
                    <Td className="whitespace-nowrap">{dShort(h.valid_until)}</Td>
                    <Td>{h.changed_by ? <Mono title={h.changed_by}>{shortId(h.changed_by)}</Mono> : <span className="text-muted">voir journal d&apos;audit</span>}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>

          <Section title="Retirer l'offre">
            <div className="flex flex-wrap gap-3">
              {o.status !== "archived" && (
                <ActionForm action={archiveOffer} confirm={`Désactiver « ${o.name} » ? Elle ne sera plus proposée dans le comparateur.`}>
                  <input type="hidden" name="id" value={o.id} />
                  <SubmitButton variant="outline">Désactiver l&apos;offre</SubmitButton>
                </ActionForm>
              )}
              {o.status === "draft" ? (
                <ActionForm action={deleteDraftOffer} confirm={`Supprimer définitivement le brouillon « ${o.name} » ?`}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="back" value="1" />
                  <SubmitButton variant="danger">Supprimer le brouillon</SubmitButton>
                </ActionForm>
              ) : (
                <p className="self-center text-sm text-muted">Seuls les brouillons peuvent être supprimés.</p>
              )}
            </div>
          </Section>
        </>
      )}
    </>
  );
}
