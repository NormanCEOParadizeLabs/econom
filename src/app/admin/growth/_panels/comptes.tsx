import Link from "next/link";
import { Card, Field, Input, LinkButton, Notice, PageTitle, Select, Textarea } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ActionForm, SubmitButton } from "../../_components/action-form";
import { Empty, LoadError, Section, Table, Td } from "../../_components/bits";
import { dateTimeFr, nf, type SearchParams } from "../../_lib/util";
import { deleteAccount, saveAccount } from "../actions";
import { editLinkClass, RowAction } from "../_components/bits";
import { growthHref, PLATFORMS } from "../_lib/util";

type Account = { id: string; platform: string; handle: string; followers: number | null; notes: string | null; created_at: string };

export async function ComptesPanel({ sp }: { sp: SearchParams }) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin().from("growth_accounts").select("*").order("platform").order("handle").limit(500);
  const rows = (data ?? []) as Account[];
  const editing = sp.edit ? rows.find((r) => r.id === sp.edit) : undefined;
  const showForm = Boolean(editing) || sp.new === "1";

  return (
    <>
      <PageTitle
        title="Comptes de publication"
        subtitle="Les comptes ECONOM. sur lesquels les vidéos sont publiées. Le nombre d'abonnés est saisi à la main."
        action={!showForm ? <LinkButton href={growthHref({ tab: "comptes", new: 1 })} size="sm">+ Nouveau compte</LinkButton> : undefined}
      />
      {sp.edit && !editing && !error && <Notice tone="warn" className="mb-4">Ce compte n&apos;existe plus.</Notice>}

      {showForm && (
        <Section title={editing ? `Modifier « ${editing.handle} »` : "Nouveau compte"} action={<Link href={growthHref({ tab: "comptes" })} className={editLinkClass}>Fermer</Link>}>
          <Card>
            <ActionForm key={editing?.id ?? "new"} action={saveAccount} resetOnSuccess={!editing} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <Field label="Plateforme" htmlFor="ac-platform">
                <Select id="ac-platform" name="platform" defaultValue={editing?.platform ?? "tiktok"}>
                  {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Pseudo" htmlFor="ac-handle">
                <Input id="ac-handle" name="handle" required maxLength={60} placeholder="@econom" defaultValue={editing?.handle ?? ""} autoCapitalize="none" spellCheck={false} />
              </Field>
              <Field label="Abonnés" htmlFor="ac-followers" hint="Facultatif. Relevé à la main.">
                <Input id="ac-followers" name="followers" type="number" inputMode="numeric" min={0} step={1} defaultValue={editing?.followers ?? ""} aria-describedby="ac-followers-hint" />
              </Field>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Notes" htmlFor="ac-notes">
                  <Textarea id="ac-notes" name="notes" maxLength={600} defaultValue={editing?.notes ?? ""} />
                </Field>
              </div>
              <div className="sm:col-span-2 lg:col-span-3"><SubmitButton>{editing ? "Enregistrer le compte" : "Ajouter le compte"}</SubmitButton></div>
            </ActionForm>
          </Card>
        </Section>
      )}

      <Section title="Liste des comptes">
        {error ? (
          <LoadError what="les comptes" />
        ) : rows.length === 0 ? (
          <Empty>Aucun compte. Ajoute le premier avec « Nouveau compte ».</Empty>
        ) : (
          <Table caption="Comptes de publication" head={["Plateforme", "Pseudo", "Abonnés", "Notes", "Ajouté le", "Actions"]} minWidth="760px">
            {rows.map((a) => (
              <tr key={a.id}>
                <Td className="whitespace-nowrap">{PLATFORMS[a.platform] ?? a.platform}</Td>
                <Td className="font-bold">{a.handle}</Td>
                <Td className="num">{a.followers === null ? "—" : nf(a.followers)}</Td>
                <Td className="max-w-[18rem] whitespace-pre-wrap break-words text-xs text-muted">{a.notes ?? "—"}</Td>
                <Td className="whitespace-nowrap text-xs">{dateTimeFr(a.created_at)}</Td>
                <Td>
                  <span className="flex flex-wrap items-start gap-1.5">
                    <Link href={growthHref({ tab: "comptes", edit: a.id })} className={editLinkClass}>Modifier</Link>
                    <RowAction action={deleteAccount} fields={{ id: a.id }} label="Supprimer" variant="ghost" confirm={`Supprimer le compte « ${a.handle} » ?`} />
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
