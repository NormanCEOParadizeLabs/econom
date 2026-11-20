import Link from "next/link";
import { Badge, Card, Field, Input, LinkButton, Notice, PageTitle, Select, Textarea, Toggle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { euro } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ActionForm, SubmitButton } from "../../_components/action-form";
import { Empty, LoadError, Section, Table, Td, Tile, TileGrid } from "../../_components/bits";
import { eurosInput, nf, type SearchParams } from "../../_lib/util";
import { deleteCreator, saveCreator } from "../actions";
import { editLinkClass, RowAction } from "../_components/bits";
import { CREATOR_KINDS, CREATOR_STATUSES, growthHref, PLATFORMS } from "../_lib/util";

type Creator = {
  id: string; name: string; platform: string; handle: string | null; kind: string; is_paid: boolean; rate_cents: number | null; status: string; notes: string | null;
};

export async function CreateursPanel({ sp }: { sp: SearchParams }) {
  await requireAdmin();
  const db = supabaseAdmin();
  const [creators, contents] = await Promise.all([
    db.from("growth_creators").select("*").order("created_at", { ascending: false }).limit(500),
    db.from("growth_contents").select("creator_id, cost_cents").not("creator_id", "is", null).limit(5000),
  ]);
  const rows = (creators.data ?? []) as Creator[];
  const stats = new Map<string, { count: number; cost: number }>();
  for (const c of (contents.data ?? []) as { creator_id: string; cost_cents: number }[]) {
    const s = stats.get(c.creator_id) ?? { count: 0, cost: 0 };
    stats.set(c.creator_id, { count: s.count + 1, cost: s.cost + c.cost_cents });
  }
  const editing = sp.edit ? rows.find((r) => r.id === sp.edit) : undefined;
  const showForm = Boolean(editing) || sp.new === "1";
  const totalCost = [...stats.values()].reduce((a, s) => a + s.cost, 0);
  const totalContents = [...stats.values()].reduce((a, s) => a + s.count, 0);

  return (
    <>
      <PageTitle
        title="Créateurs"
        subtitle="UGC, sans visage, interne ou micro-influence. Une collaboration rémunérée doit toujours être signalée dans la publication."
        action={!showForm ? <LinkButton href={growthHref({ tab: "createurs", new: 1 })} size="sm">+ Nouveau créateur</LinkButton> : undefined}
      />
      {sp.edit && !editing && !creators.error && <Notice tone="warn" className="mb-4">Ce créateur n&apos;existe plus.</Notice>}

      {showForm && (
        <Section title={editing ? `Modifier « ${editing.name} »` : "Nouveau créateur"} action={<Link href={growthHref({ tab: "createurs" })} className={editLinkClass}>Fermer</Link>}>
          <Card><CreatorForm key={editing?.id ?? "new"} c={editing} /></Card>
        </Section>
      )}

      <Section title="Vue d'ensemble">
        <TileGrid>
          <Tile label="Créateurs" value={nf(rows.length)} hint={`${nf(rows.filter((r) => r.status === "actif").length)} actif(s)`} />
          <Tile label="Contenus rattachés" value={contents.error ? "—" : nf(totalContents)} />
          <Tile label="Total des coûts" value={contents.error ? "—" : euro(totalCost)} hint="Somme des coûts saisis sur les contenus rattachés." />
        </TileGrid>
      </Section>

      <Section title="Liste des créateurs">
        {creators.error ? (
          <LoadError what="les créateurs" />
        ) : rows.length === 0 ? (
          <Empty>Aucun créateur. Ajoute le premier avec « Nouveau créateur ».</Empty>
        ) : (
          <Table caption="Créateurs" head={["Créateur", "Type", "Rémunération", "Statut", "Contenus", "Total des coûts", "Notes", "Actions"]} minWidth="980px">
            {rows.map((c) => {
              const s = stats.get(c.id) ?? { count: 0, cost: 0 };
              return (
                <tr key={c.id}>
                  <Td>
                    <span className="font-bold">{c.name}</span>
                    <span className="block text-xs text-muted">{PLATFORMS[c.platform] ?? c.platform}{c.handle ? ` · ${c.handle}` : ""}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{CREATOR_KINDS[c.kind] ?? c.kind}</Td>
                  <Td className="whitespace-nowrap">
                    {c.is_paid ? <Badge tone="warn">Rémunéré</Badge> : <Badge>Non rémunéré</Badge>}
                    {c.rate_cents !== null && <span className="num mt-1 block text-xs text-muted">Tarif : {euro(c.rate_cents)}</span>}
                  </Td>
                  <Td><Badge tone={c.status === "actif" ? "positive" : "neutral"}>{CREATOR_STATUSES[c.status] ?? c.status}</Badge></Td>
                  <Td className="num">{contents.error ? "—" : nf(s.count)}</Td>
                  <Td className="num whitespace-nowrap font-bold">{contents.error ? "—" : euro(s.cost)}</Td>
                  <Td className="max-w-[16rem] whitespace-pre-wrap break-words text-xs text-muted">{c.notes ?? "—"}</Td>
                  <Td>
                    <span className="flex flex-col items-start gap-1.5">
                      <Link href={growthHref({ tab: "createurs", edit: c.id })} className={editLinkClass}>Modifier</Link>
                      <RowAction action={deleteCreator} fields={{ id: c.id }} label="Supprimer" variant="ghost" confirm={`Supprimer « ${c.name} » ? Ses contenus sont conservés, sans créateur.`} />
                    </span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Section>
    </>
  );
}

function CreatorForm({ c }: { c?: Creator }) {
  return (
    <ActionForm action={saveCreator} resetOnSuccess={!c} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Nom" htmlFor="cr-name">
        <Input id="cr-name" name="name" required maxLength={80} defaultValue={c?.name ?? ""} />
      </Field>
      <Field label="Plateforme" htmlFor="cr-platform">
        <Select id="cr-platform" name="platform" defaultValue={c?.platform ?? "tiktok"}>
          {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Pseudo" htmlFor="cr-handle">
        <Input id="cr-handle" name="handle" maxLength={60} placeholder="@pseudo" defaultValue={c?.handle ?? ""} autoCapitalize="none" spellCheck={false} />
      </Field>
      <Field label="Type" htmlFor="cr-kind">
        <Select id="cr-kind" name="kind" defaultValue={c?.kind ?? "ugc"}>
          {Object.entries(CREATOR_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Statut" htmlFor="cr-status">
        <Select id="cr-status" name="status" defaultValue={c?.status ?? "prospect"}>
          {Object.entries(CREATOR_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Tarif par contenu (€)" htmlFor="cr-rate" hint="Facultatif.">
        <Input id="cr-rate" name="rate" type="number" inputMode="decimal" min={0} max={1000000} step={0.01} defaultValue={c ? eurosInput(c.rate_cents) : ""} aria-describedby="cr-rate-hint" />
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Toggle id="cr-paid" name="is_paid" label="Créateur rémunéré" description="Ses contenus doivent être publiés avec la mention « Collaboration commerciale »." defaultChecked={c?.is_paid ?? false} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label="Notes" htmlFor="cr-notes">
          <Textarea id="cr-notes" name="notes" maxLength={1000} defaultValue={c?.notes ?? ""} />
        </Field>
      </div>
      <div className="sm:col-span-2 lg:col-span-3"><SubmitButton>{c ? "Enregistrer le créateur" : "Ajouter le créateur"}</SubmitButton></div>
    </ActionForm>
  );
}
