import Link from "next/link";
import { GROWTH_TEMPLATES } from "@/lib/ai/growth";
import { Badge, Card, Field, Input, LinkButton, Notice, PageTitle, Select, Toggle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { dateFr, euro } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ActionForm, SubmitButton } from "../../_components/action-form";
import { Empty, LoadError, Mono, Section, Table, Td } from "../../_components/bits";
import { eurosInput, nf, type SearchParams } from "../../_lib/util";
import { deleteContent, saveContent } from "../actions";
import { editLinkClass, ExternalLink, RowAction } from "../_components/bits";
import { CopyField } from "../_components/copy-field";
import { attributionLink, CONTENT_STATUSES, growthHref, PAID_REMINDER, PLATFORMS } from "../_lib/util";

type Content = {
  id: string; title: string; platform: string; url: string | null; creator_id: string | null; account_id: string | null; script_id: string | null;
  template_key: string | null; hook: string | null; format: string | null; campaign: string; is_paid_partnership: boolean; cost_cents: number; status: string;
  published_at: string | null; views: number; likes: number; shares: number; comments: number; growth_creators: { name: string } | null;
};
type Option = { id: string; label: string };

const dShort = (iso: string | null) => dateFr(iso, { day: "2-digit", month: "2-digit", year: "numeric" });

export async function ContenusPanel({ sp }: { sp: SearchParams }) {
  await requireAdmin();
  const db = supabaseAdmin();
  const [contents, creators, accounts, scripts] = await Promise.all([
    db.from("growth_contents").select("*, growth_creators(name)").order("created_at", { ascending: false }).limit(300),
    db.from("growth_creators").select("id, name").order("name").limit(500),
    db.from("growth_accounts").select("id, platform, handle").order("handle").limit(500),
    db.from("growth_scripts").select("id, title, needs_review").order("created_at", { ascending: false }).limit(200),
  ]);
  const rows = (contents.data ?? []) as Content[];
  const editing = sp.edit ? rows.find((r) => r.id === sp.edit) : undefined;
  const showForm = Boolean(editing) || sp.new === "1";
  const creatorOptions: Option[] = (creators.data ?? []).map((c) => ({ id: c.id, label: c.name }));
  const accountOptions: Option[] = (accounts.data ?? []).map((a) => ({ id: a.id, label: `${PLATFORMS[a.platform] ?? a.platform} · ${a.handle}` }));
  const scriptOptions: Option[] = (scripts.data ?? []).map((s) => ({ id: s.id, label: `${s.title}${s.needs_review ? " (à relire)" : ""}` }));

  return (
    <>
      <PageTitle
        title="Bibliothèque de contenus"
        subtitle="Chaque vidéo a sa campagne (utm_campaign) : c'est elle qui relie visites, diagnostics et inscriptions au contenu."
        action={!showForm ? <LinkButton href={growthHref({ tab: "contenus", new: 1 })} size="sm">+ Nouveau contenu</LinkButton> : undefined}
      />
      {sp.edit && !editing && !contents.error && <Notice tone="warn" className="mb-4">Ce contenu n&apos;existe plus.</Notice>}

      {showForm && (
        <Section title={editing ? `Modifier « ${editing.title} »` : "Nouveau contenu"} action={<Link href={growthHref({ tab: "contenus" })} className={editLinkClass}>Fermer</Link>}>
          <Card>
            <ContentForm key={editing?.id ?? "new"} c={editing} creators={creatorOptions} accounts={accountOptions} scripts={scriptOptions} />
          </Card>
        </Section>
      )}

      <Section title="Contenus" description={rows.length ? `${nf(rows.length)} contenu${rows.length > 1 ? "s" : ""} (300 plus récents).` : undefined}>
        {contents.error ? (
          <LoadError what="les contenus" />
        ) : rows.length === 0 ? (
          <Empty>Aucun contenu. Ajoute la première vidéo avec « Nouveau contenu ».</Empty>
        ) : (
          <Table caption="Bibliothèque des vidéos" head={["Contenu", "Créateur", "Statut", "Lien d'attribution", "Statistiques saisies", "Coût", "Actions"]} minWidth="1120px">
            {rows.map((c) => (
              <tr key={c.id}>
                <Td className="max-w-[18rem]">
                  <span className="block text-xs font-bold uppercase tracking-wide text-muted">{PLATFORMS[c.platform] ?? c.platform}{c.format ? ` · ${c.format}` : ""}</span>
                  <span className="font-bold">{c.title}</span>
                  {c.hook && <span className="block text-xs text-muted">Hook : {c.hook}</span>}
                  {c.url && <span className="block text-xs"><ExternalLink href={c.url}>Voir la vidéo</ExternalLink></span>}
                </Td>
                <Td className="whitespace-nowrap">{c.growth_creators?.name ?? "—"}</Td>
                <Td>
                  <span className="flex flex-col items-start gap-1">
                    <Badge tone={c.status === "publie" ? "positive" : "neutral"}>{CONTENT_STATUSES[c.status] ?? c.status}</Badge>
                    {c.published_at && <span className="whitespace-nowrap text-xs text-muted">{dShort(c.published_at)}</span>}
                    {c.is_paid_partnership && <Badge tone="warn">Partenariat rémunéré</Badge>}
                  </span>
                </Td>
                <Td className="min-w-[19rem]">
                  <CopyField value={attributionLink(env.appUrl, c.platform, c.campaign)} label={`Lien d'attribution de « ${c.title} »`} />
                  <span className="mt-1 block text-xs text-muted">Campagne : <Mono>{c.campaign}</Mono></span>
                  {c.is_paid_partnership && <p role="note" className="mt-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-bold">{PAID_REMINDER}</p>}
                </Td>
                <Td className="num whitespace-nowrap text-xs">
                  {nf(c.views)} vues<br />{nf(c.likes)} likes<br />{nf(c.shares)} partages<br />{nf(c.comments)} commentaires
                </Td>
                <Td className="num whitespace-nowrap">{c.cost_cents > 0 ? euro(c.cost_cents) : "—"}</Td>
                <Td>
                  <span className="flex flex-col items-start gap-1.5">
                    <Link href={growthHref({ tab: "contenus", edit: c.id })} className={editLinkClass}>Modifier</Link>
                    <RowAction action={deleteContent} fields={{ id: c.id }} label="Supprimer" variant="ghost" confirm={`Supprimer « ${c.title} » ? Son lien d'attribution ne sera plus suivi dans le tableau de bord.`} />
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}

function RefSelect({ id, name, label, options, value, empty }: { id: string; name: string; label: string; options: Option[]; value: string | null | undefined; empty: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <Select id={id} name={name} defaultValue={value ?? ""}>
        <option value="">{empty}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </Select>
    </Field>
  );
}

function ContentForm({ c, creators, accounts, scripts }: { c?: Content; creators: Option[]; accounts: Option[]; scripts: Option[] }) {
  return (
    <ActionForm action={saveContent} resetOnSuccess={!c} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="sm:col-span-2">
        <Field label="Titre" htmlFor="ct-title">
          <Input id="ct-title" name="title" required maxLength={160} defaultValue={c?.title ?? ""} />
        </Field>
      </div>
      <Field label="Plateforme" htmlFor="ct-platform">
        <Select id="ct-platform" name="platform" defaultValue={c?.platform ?? "tiktok"}>
          {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="URL de la vidéo" htmlFor="ct-url" hint="Facultatif. Doit commencer par https://.">
          <Input id="ct-url" name="url" type="url" inputMode="url" maxLength={500} placeholder="https://" defaultValue={c?.url ?? ""} aria-describedby="ct-url-hint" />
        </Field>
      </div>
      <Field label="Campagne (utm_campaign)" htmlFor="ct-campaign" hint={c ? "Ne la change plus une fois le lien publié : l'attribution repartirait de zéro." : "Vide = générée depuis le titre. Minuscules, chiffres, tirets."}>
        <Input id="ct-campaign" name="campaign" pattern="[a-z0-9\-]{3,60}" maxLength={60} defaultValue={c?.campaign ?? ""} autoCapitalize="none" spellCheck={false} aria-describedby="ct-campaign-hint" />
      </Field>
      <RefSelect id="ct-creator" name="creator_id" label="Créateur" options={creators} value={c?.creator_id} empty="Aucun" />
      <RefSelect id="ct-account" name="account_id" label="Compte de publication" options={accounts} value={c?.account_id} empty="Aucun" />
      <RefSelect id="ct-script" name="script_id" label="Script lié" options={scripts} value={c?.script_id} empty="Aucun" />
      <Field label="Modèle" htmlFor="ct-template">
        <Select id="ct-template" name="template_key" defaultValue={c?.template_key ?? ""}>
          <option value="">Aucun</option>
          {GROWTH_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
        </Select>
      </Field>
      <Field label="Format" htmlFor="ct-format" hint="Ex. screencast, voix off, écran partagé.">
        <Input id="ct-format" name="format" maxLength={60} defaultValue={c?.format ?? ""} aria-describedby="ct-format-hint" />
      </Field>
      <Field label="Statut" htmlFor="ct-status">
        <Select id="ct-status" name="status" defaultValue={c?.status ?? "brouillon"}>
          {Object.entries(CONTENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label="Hook" htmlFor="ct-hook">
          <Input id="ct-hook" name="hook" maxLength={200} defaultValue={c?.hook ?? ""} />
        </Field>
      </div>
      <Field label="Date de publication" htmlFor="ct-date">
        <Input id="ct-date" name="published_at" type="date" defaultValue={c?.published_at ?? ""} />
      </Field>
      <Field label="Coût (€)" htmlFor="ct-cost" hint="Rémunération et production. Sert au coût d'acquisition.">
        <Input id="ct-cost" name="cost" type="number" inputMode="decimal" min={0} max={1000000} step={0.01} defaultValue={c ? eurosInput(c.cost_cents) : "0"} aria-describedby="ct-cost-hint" />
      </Field>
      <div className="self-end">
        <Toggle id="ct-paid" name="is_paid_partnership" label="Partenariat rémunéré" description={PAID_REMINDER} defaultChecked={c?.is_paid_partnership ?? false} />
      </div>
      <fieldset className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4 lg:col-span-3">
        <legend className="mb-1.5 text-sm font-bold">Statistiques relevées à la main sur la plateforme</legend>
        {([["views", "Vues"], ["likes", "Likes"], ["shares", "Partages"], ["comments", "Commentaires"]] as const).map(([name, label]) => (
          <Field key={name} label={label} htmlFor={`ct-${name}`}>
            <Input id={`ct-${name}`} name={name} type="number" inputMode="numeric" min={0} step={1} defaultValue={c?.[name] ?? 0} />
          </Field>
        ))}
      </fieldset>
      <div className="sm:col-span-2 lg:col-span-3"><SubmitButton>{c ? "Enregistrer le contenu" : "Créer le contenu"}</SubmitButton></div>
    </ActionForm>
  );
}
