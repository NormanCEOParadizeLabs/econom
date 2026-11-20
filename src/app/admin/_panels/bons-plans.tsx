import Link from "next/link";
import { Badge, Card, Field, Input, Notice, PageTitle, Select, Textarea, Toggle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { DEAL_CATEGORIES, dateFr } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { archiveDeal, createDeal, rejectDeal, saveMerchant, validateDeal } from "../actions";
import { ActionForm, SubmitButton } from "../_components/action-form";
import { Empty, LoadError, Section, smallInput, Table, Td } from "../_components/bits";
import { addDays, adminHref, DEAL_DEFAULT_RECHECK_DAYS, DEAL_MAX_RECHECK_DAYS, DEAL_STATUSES, todayParis, type SearchParams } from "../_lib/util";

type Merchant = { id: string; name: string; address: string; postal_code: string; city: string; lat: number; lon: number; phone: string | null; website: string | null };
type Deal = {
  id: string; merchant_id: string; title: string; category: string; description: string | null; deal_label: string; conditions: string | null;
  valid_from: string | null; valid_until: string | null; source_url: string; use_url: string | null; verified_at: string | null; recheck_by: string | null;
  status: string; is_sponsored: boolean; is_demo: boolean; created_at: string;
  merchant_locations: { name: string; city: string; postal_code: string } | null;
};

const dShort = (iso: string | null) => dateFr(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
const DEAL_COLUMNS = "id, merchant_id, title, category, description, deal_label, conditions, valid_from, valid_until, source_url, use_url, verified_at, recheck_by, status, is_sponsored, is_demo, created_at, merchant_locations(name, city, postal_code)";

function SafeLink({ href }: { href: string }) {
  if (!href.startsWith("https://")) return <span className="break-all text-danger">{href} (URL non https)</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold text-brand-strong underline underline-offset-2">{href}</a>;
}

function DealFlags({ d }: { d: Deal }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge tone={d.status === "verified" ? "positive" : d.status === "submitted" ? "warn" : "neutral"}>{DEAL_STATUSES[d.status] ?? d.status}</Badge>
      {d.is_sponsored && <Badge tone="brand">sponsorisé</Badge>}
      {d.is_demo && <Badge tone="accent">DÉMO</Badge>}
    </span>
  );
}

/** Carte de validation : sert à la modération et au recontrôle. */
function ReviewCard({ d, today, mode }: { d: Deal; today: string; mode: "moderation" | "recheck" }) {
  return (
    <Card as="article" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            {d.merchant_locations ? `${d.merchant_locations.name} · ${d.merchant_locations.postal_code} ${d.merchant_locations.city}` : "Commerce inconnu"} · {DEAL_CATEGORIES[d.category] ?? d.category}
          </p>
          <h3 className="font-display text-lg font-extrabold">{d.title}</h3>
          <p className="text-sm font-bold text-brand-strong">{d.deal_label}</p>
        </div>
        <DealFlags d={d} />
      </div>
      {d.description && <p className="text-sm">{d.description}</p>}
      {d.conditions && <p className="text-sm text-muted">Conditions : {d.conditions}</p>}
      <p className="text-sm text-muted">
        Validité : {d.valid_from ? `du ${dShort(d.valid_from)} ` : ""}{d.valid_until ? `jusqu'au ${dShort(d.valid_until)}` : "offre permanente"}
        {mode === "recheck" && <> · vérifié le {dShort(d.verified_at)} · à recontrôler avant le <strong className="text-danger">{dShort(d.recheck_by)}</strong></>}
        {mode === "moderation" && <> · soumis le {dShort(d.created_at)}</>}
      </p>
      <p className="text-sm">Source déclarée : <SafeLink href={d.source_url} /></p>

      <ActionForm action={validateDeal} className="grid gap-3 rounded-2xl bg-surface-2 p-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={d.id} />
        <Field label="URL de la source vérifiée (https://)" htmlFor={`src-${d.id}`}>
          <Input id={`src-${d.id}`} name="source_url" type="url" required maxLength={500} defaultValue={d.source_url.startsWith("https://") ? d.source_url : ""} placeholder="https://" className={smallInput} />
        </Field>
        <Field label="À recontrôler avant le" htmlFor={`recheck-${d.id}`} hint={`Par défaut : dans ${DEAL_DEFAULT_RECHECK_DAYS} jours.`}>
          <Input id={`recheck-${d.id}`} name="recheck_by" type="date" min={addDays(today, 1)} max={addDays(today, DEAL_MAX_RECHECK_DAYS)} defaultValue={addDays(today, DEAL_DEFAULT_RECHECK_DAYS)} className={smallInput} aria-describedby={`recheck-${d.id}-hint`} />
        </Field>
        <label htmlFor={`checked-${d.id}`} className="flex items-start gap-2 text-sm sm:col-span-2">
          <input id={`checked-${d.id}`} name="source_checked" type="checkbox" required className="mt-0.5 h-5 w-5 accent-[var(--brand)]" />
          <span>J&apos;ai ouvert la source et vérifié moi-même que l&apos;avantage et ses conditions sont exacts.</span>
        </label>
        <div className="sm:col-span-2"><SubmitButton>{mode === "moderation" ? "Valider et publier" : "Confirmer la revérification"}</SubmitButton></div>
      </ActionForm>

      <div className="flex flex-wrap gap-2">
        {mode === "moderation" && (
          <ActionForm action={rejectDeal} confirm={`Refuser « ${d.title} » ?`}>
            <input type="hidden" name="id" value={d.id} />
            <SubmitButton variant="outline">Refuser</SubmitButton>
          </ActionForm>
        )}
        <ActionForm action={archiveDeal} confirm={`Archiver « ${d.title} » ? Il ne sera plus affiché.`}>
          <input type="hidden" name="id" value={d.id} />
          <SubmitButton variant="ghost">Archiver</SubmitButton>
        </ActionForm>
      </div>
    </Card>
  );
}

function MerchantFields({ m, prefix }: { m?: Merchant; prefix: string }) {
  return (
    <>
      <Field label="Nom du commerce" htmlFor={`${prefix}-name`}>
        <Input id={`${prefix}-name`} name="name" required maxLength={100} defaultValue={m?.name ?? ""} />
      </Field>
      <Field label="Adresse" htmlFor={`${prefix}-address`}>
        <Input id={`${prefix}-address`} name="address" required minLength={3} maxLength={200} defaultValue={m?.address ?? ""} />
      </Field>
      <Field label="Code postal" htmlFor={`${prefix}-cp`}>
        <Input id={`${prefix}-cp`} name="postal_code" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} defaultValue={m?.postal_code ?? ""} />
      </Field>
      <Field label="Ville" htmlFor={`${prefix}-city`}>
        <Input id={`${prefix}-city`} name="city" required maxLength={80} defaultValue={m?.city ?? ""} />
      </Field>
      <Field label="Latitude" htmlFor={`${prefix}-lat`} hint="Degrés décimaux, ex. 48.8566">
        <Input id={`${prefix}-lat`} name="lat" required inputMode="decimal" defaultValue={m?.lat ?? ""} aria-describedby={`${prefix}-lat-hint`} />
      </Field>
      <Field label="Longitude" htmlFor={`${prefix}-lon`} hint="Degrés décimaux, ex. 2.3522">
        <Input id={`${prefix}-lon`} name="lon" required inputMode="decimal" defaultValue={m?.lon ?? ""} aria-describedby={`${prefix}-lon-hint`} />
      </Field>
      <Field label="Téléphone (facultatif)" htmlFor={`${prefix}-phone`}>
        <Input id={`${prefix}-phone`} name="phone" type="tel" maxLength={20} defaultValue={m?.phone ?? ""} />
      </Field>
      <Field label="Site web (facultatif, https://)" htmlFor={`${prefix}-web`}>
        <Input id={`${prefix}-web`} name="website" type="url" maxLength={500} placeholder="https://" defaultValue={m?.website ?? ""} />
      </Field>
    </>
  );
}

export async function BonsPlansPanel({ sp }: { sp: SearchParams }) {
  await requireAdmin();
  const db = supabaseAdmin();
  const today = todayParis();

  const [pendingRes, overdueRes, dealsRes, merchantsRes] = await Promise.all([
    db.from("local_deals").select(DEAL_COLUMNS).eq("status", "submitted").order("created_at", { ascending: true }).limit(100),
    db.from("local_deals").select(DEAL_COLUMNS).eq("status", "verified").lt("recheck_by", today).order("recheck_by", { ascending: true }).limit(100),
    db.from("local_deals").select(DEAL_COLUMNS).order("created_at", { ascending: false }).limit(100),
    db.from("merchant_locations").select("id, name, address, postal_code, city, lat, lon, phone, website").order("name").limit(500),
  ]);
  const pending = (pendingRes.data ?? []) as unknown as Deal[];
  const overdue = (overdueRes.data ?? []) as unknown as Deal[];
  const deals = (dealsRes.data ?? []) as unknown as Deal[];
  const merchants = (merchantsRes.data ?? []) as Merchant[];
  const editing = sp.commerce ? merchants.find((m) => m.id === sp.commerce) : undefined;

  return (
    <>
      <PageTitle title="Bons plans locaux" subtitle="Un bon plan n'est publié qu'après vérification de sa source par un administrateur." />

      {editing && (
        <Section title={`Modifier les coordonnées — ${editing.name}`} id="commerce" action={<Link href={adminHref({ tab: "bons-plans" })} className="text-sm font-bold text-brand-strong">Fermer</Link>}>
          <Card>
            <ActionForm action={saveMerchant} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={editing.id} />
              <MerchantFields m={editing} prefix="em" />
              <div className="sm:col-span-2"><SubmitButton>Enregistrer les coordonnées</SubmitButton></div>
            </ActionForm>
          </Card>
        </Section>
      )}
      {sp.commerce && !editing && <Notice tone="warn" className="mb-4">Commerce introuvable.</Notice>}

      <Section title={`File de modération (${pending.length})`} description="Soumissions en attente, des plus anciennes aux plus récentes.">
        {pendingRes.error ? <LoadError what="la file de modération" /> : pending.length === 0 ? (
          <Empty>Aucune soumission en attente.</Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{pending.map((d) => <ReviewCard key={d.id} d={d} today={today} mode="moderation" />)}</div>
        )}
      </Section>

      <Section title={`Recontrôle dépassé (${overdue.length})`} description="Bons plans vérifiés dont la date de recontrôle est passée : ils ne sont plus affichés tant qu'ils ne sont pas revérifiés.">
        {overdueRes.error ? <LoadError what="les bons plans à recontrôler" /> : overdue.length === 0 ? (
          <Empty>Aucun bon plan en retard de recontrôle.</Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{overdue.map((d) => <ReviewCard key={d.id} d={d} today={today} mode="recheck" />)}</div>
        )}
      </Section>

      <div className="grid gap-x-6 lg:grid-cols-2">
        <Section title="Ajouter un commerce">
          <Card>
            <ActionForm action={saveMerchant} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
              <MerchantFields prefix="nm" />
              <div className="sm:col-span-2"><SubmitButton>Ajouter le commerce</SubmitButton></div>
            </ActionForm>
          </Card>
        </Section>

        <Section title="Ajouter un bon plan" description="Créé « en attente » : il passe ensuite par la file de modération.">
          {merchants.length === 0 ? (
            <Empty>Ajoute d&apos;abord un commerce pour pouvoir créer un bon plan.</Empty>
          ) : (
            <Card>
              <ActionForm action={createDeal} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
                <Field label="Commerce" htmlFor="nd-merchant">
                  <Select id="nd-merchant" name="merchant_id" required defaultValue="">
                    <option value="" disabled>— Choisir —</option>
                    {merchants.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.postal_code} {m.city})</option>)}
                  </Select>
                </Field>
                <Field label="Catégorie" htmlFor="nd-category">
                  <Select id="nd-category" name="category" required defaultValue="">
                    <option value="" disabled>— Choisir —</option>
                    {Object.entries(DEAL_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <Field label="Titre" htmlFor="nd-title">
                  <Input id="nd-title" name="title" required minLength={3} maxLength={120} />
                </Field>
                <Field label="Libellé de l'avantage" htmlFor="nd-label" hint="Court, ex. « −20 % étudiants »">
                  <Input id="nd-label" name="deal_label" required maxLength={60} aria-describedby="nd-label-hint" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description" htmlFor="nd-desc">
                    <Textarea id="nd-desc" name="description" maxLength={800} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Conditions" htmlFor="nd-cond">
                    <Textarea id="nd-cond" name="conditions" maxLength={600} />
                  </Field>
                </div>
                <Field label="Début de validité (facultatif)" htmlFor="nd-from">
                  <Input id="nd-from" name="valid_from" type="date" />
                </Field>
                <Field label="Fin de validité" htmlFor="nd-until" hint="Vide = offre permanente, revérifiée régulièrement.">
                  <Input id="nd-until" name="valid_until" type="date" aria-describedby="nd-until-hint" />
                </Field>
                <Field label="URL de la source (https://)" htmlFor="nd-src">
                  <Input id="nd-src" name="source_url" type="url" required maxLength={500} placeholder="https://" />
                </Field>
                <Field label="URL d'utilisation (facultatif)" htmlFor="nd-use">
                  <Input id="nd-use" name="use_url" type="url" maxLength={500} placeholder="https://" />
                </Field>
                <Toggle id="nd-sponsored" name="is_sponsored" label="Sponsorisé" description="Relation commerciale : toujours affichée." />
                <Toggle id="nd-demo" name="is_demo" label="DÉMO" description="Donnée de démonstration : jamais publiée." />
                <div className="sm:col-span-2"><SubmitButton>Ajouter à la file de modération</SubmitButton></div>
              </ActionForm>
            </Card>
          )}
        </Section>
      </div>

      <Section title="Commerces" description={`${merchants.length} commerce${merchants.length > 1 ? "s" : ""} enregistré${merchants.length > 1 ? "s" : ""}.`}>
        {merchantsRes.error ? <LoadError what="les commerces" /> : merchants.length === 0 ? (
          <Empty>Aucun commerce enregistré.</Empty>
        ) : (
          <Table caption="Commerces" head={["Commerce", "Adresse", "Coordonnées GPS", "Contact", "Action"]} minWidth="820px">
            {merchants.map((m) => (
              <tr key={m.id}>
                <Td className="font-bold">{m.name}</Td>
                <Td>{m.address}, {m.postal_code} {m.city}</Td>
                <Td className="whitespace-nowrap font-mono text-xs">{m.lat}, {m.lon}</Td>
                <Td>
                  {m.phone ?? "—"}
                  {m.website && <span className="block"><SafeLink href={m.website} /></span>}
                </Td>
                <Td><Link href={`${adminHref({ tab: "bons-plans", commerce: m.id })}#commerce`} className="whitespace-nowrap font-bold text-brand-strong underline underline-offset-2">Modifier les coordonnées</Link></Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Derniers bons plans" description="Les 100 plus récents, tous statuts confondus.">
        {dealsRes.error ? <LoadError what="les bons plans" /> : deals.length === 0 ? (
          <Empty>Aucun bon plan pour le moment.</Empty>
        ) : (
          <Table caption="Derniers bons plans" head={["Bon plan", "Commerce", "Validité", "Vérifié le", "Recontrôle", "État", "Action"]} minWidth="980px">
            {deals.map((d) => (
              <tr key={d.id}>
                <Td>
                  <span className="font-bold">{d.title}</span>
                  <span className="block text-xs text-muted">{DEAL_CATEGORIES[d.category] ?? d.category} · {d.deal_label}</span>
                </Td>
                <Td>{d.merchant_locations ? `${d.merchant_locations.name} (${d.merchant_locations.city})` : "—"}</Td>
                <Td className="whitespace-nowrap">{d.valid_until ? `jusqu'au ${dShort(d.valid_until)}` : "permanente"}</Td>
                <Td className="whitespace-nowrap">{dShort(d.verified_at)}</Td>
                <Td className="whitespace-nowrap">
                  {dShort(d.recheck_by)}
                  {d.status === "verified" && d.recheck_by !== null && d.recheck_by < today && <Badge tone="danger" className="ml-1">dépassé</Badge>}
                </Td>
                <Td><DealFlags d={d} /></Td>
                <Td>
                  {d.status !== "archived" ? (
                    <ActionForm action={archiveDeal} confirm={`Archiver « ${d.title} » ? Il ne sera plus affiché.`}>
                      <input type="hidden" name="id" value={d.id} />
                      <SubmitButton variant="ghost">Archiver</SubmitButton>
                    </ActionForm>
                  ) : "—"}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
