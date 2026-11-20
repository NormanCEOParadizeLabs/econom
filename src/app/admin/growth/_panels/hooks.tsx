import Link from "next/link";
import { GROWTH_TEMPLATES, growthTemplate } from "@/lib/ai/growth";
import { Badge, Card, Field, Input, LinkButton, Notice, PageTitle, Select, Textarea } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ActionForm, SubmitButton } from "../../_components/action-form";
import { Empty, LoadError, Section, Table, Td } from "../../_components/bits";
import { nf, type SearchParams } from "../../_lib/util";
import { deleteHook, saveHook, seedBaseHooks } from "../actions";
import { editLinkClass, RowAction } from "../_components/bits";
import { growthHref, HOOK_STATUSES } from "../_lib/util";

type Hook = { id: string; text: string; template_key: string | null; status: string; notes: string | null };

const TONES: Record<string, "neutral" | "brand" | "positive" | "danger"> = { a_tester: "neutral", teste: "brand", gagnant: "positive", abandonne: "danger" };

export async function HooksPanel({ sp }: { sp: SearchParams }) {
  await requireAdmin();
  const status = sp.statut && sp.statut in HOOK_STATUSES ? sp.statut : "";
  let query = supabaseAdmin().from("growth_hooks").select("*").order("created_at", { ascending: false }).limit(500);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  const rows = (data ?? []) as Hook[];
  const editing = sp.edit ? rows.find((r) => r.id === sp.edit) : undefined;
  const showForm = Boolean(editing) || sp.new === "1";

  return (
    <>
      <PageTitle
        title="Bibliothèque de hooks"
        subtitle="Les premières secondes d'une vidéo. Note ce qui a été testé, ce qui gagne et ce qui est abandonné."
        action={!showForm ? <LinkButton href={growthHref({ tab: "hooks", new: 1 })} size="sm">+ Nouveau hook</LinkButton> : undefined}
      />
      {sp.edit && !editing && !error && <Notice tone="warn" className="mb-4">Ce hook n&apos;existe plus (ou n&apos;est pas dans ce filtre).</Notice>}

      {showForm && (
        <Section title={editing ? "Modifier le hook" : "Nouveau hook"} action={<Link href={growthHref({ tab: "hooks" })} className={editLinkClass}>Fermer</Link>}>
          <Card>
            <ActionForm key={editing?.id ?? "new"} action={saveHook} resetOnSuccess={!editing} className="grid gap-3 sm:grid-cols-2">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div className="sm:col-span-2">
                <Field label="Texte du hook" htmlFor="hk-text" hint="3 à 200 caractères. Aucun montant qui ne vienne pas d'une offre vérifiée.">
                  <Input id="hk-text" name="text" required minLength={3} maxLength={200} defaultValue={editing?.text ?? ""} aria-describedby="hk-text-hint" />
                </Field>
              </div>
              <Field label="Modèle" htmlFor="hk-template">
                <Select id="hk-template" name="template_key" defaultValue={editing?.template_key ?? ""}>
                  <option value="">Aucun</option>
                  {GROWTH_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
                </Select>
              </Field>
              <Field label="Statut" htmlFor="hk-status">
                <Select id="hk-status" name="status" defaultValue={editing?.status ?? "a_tester"}>
                  {Object.entries(HOOK_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes" htmlFor="hk-notes">
                  <Textarea id="hk-notes" name="notes" maxLength={400} defaultValue={editing?.notes ?? ""} />
                </Field>
              </div>
              <div className="sm:col-span-2"><SubmitButton>{editing ? "Enregistrer le hook" : "Ajouter le hook"}</SubmitButton></div>
            </ActionForm>
          </Card>
        </Section>
      )}

      <Section
        title="Hooks"
        description={rows.length ? `${nf(rows.length)} hook${rows.length > 1 ? "s" : ""}.` : undefined}
        action={
          <ActionForm action={seedBaseHooks}>
            <SubmitButton variant="outline">Ajouter les 8 hooks de base</SubmitButton>
          </ActionForm>
        }
      >
        <nav aria-label="Filtrer par statut" className="mb-3 flex flex-wrap gap-1.5">
          {[["", "Tous"], ...Object.entries(HOOK_STATUSES)].map(([k, v]) => (
            <Link
              key={k || "tous"}
              href={growthHref({ tab: "hooks", statut: k })}
              aria-current={k === status ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-bold ${k === status ? "bg-ink text-bg" : "border border-line bg-surface hover:border-brand"}`}
            >
              {v}
            </Link>
          ))}
        </nav>
        {error ? (
          <LoadError what="les hooks" />
        ) : rows.length === 0 ? (
          <Empty>{status ? "Aucun hook avec ce statut." : "Bibliothèque vide. Commence par « Ajouter les 8 hooks de base »."}</Empty>
        ) : (
          <Table caption="Bibliothèque de hooks" head={["Hook", "Modèle", "Statut", "Notes", "Actions"]} minWidth="820px">
            {rows.map((h) => (
              <tr key={h.id}>
                <Td className="max-w-[24rem] font-bold">{h.text}</Td>
                <Td className="max-w-[14rem] text-xs text-muted">{h.template_key ? (growthTemplate(h.template_key)?.title ?? h.template_key) : "—"}</Td>
                <Td><Badge tone={TONES[h.status] ?? "neutral"}>{HOOK_STATUSES[h.status] ?? h.status}</Badge></Td>
                <Td className="max-w-[16rem] whitespace-pre-wrap break-words text-xs text-muted">{h.notes ?? "—"}</Td>
                <Td>
                  <span className="flex flex-wrap items-start gap-1.5">
                    <Link href={growthHref({ tab: "hooks", edit: h.id, statut: status })} className={editLinkClass}>Modifier</Link>
                    <RowAction action={deleteHook} fields={{ id: h.id }} label="Supprimer" variant="ghost" confirm="Supprimer ce hook ?" />
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
