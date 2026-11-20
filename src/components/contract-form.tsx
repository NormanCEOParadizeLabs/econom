"use client";
import { useActionState } from "react";
import { deleteContract, saveContract, type FormState } from "@/app/app/actions";
import { Button, Card, Field, Input, LinkButton, Notice, Select, Spinner, Textarea, Toggle } from "@/components/ui";
import { IconTrash } from "@/components/icons";
import { CONTRACT_CATEGORIES } from "@/lib/format";

export interface ContractRow {
  id: string; name: string; category: string; price_cents: number; frequency: string; next_charge_date: string | null; commitment_end: string | null;
  renewal_date: string | null; cancellation_terms: string | null; manage_url: string | null; notes: string | null; reminder_days: number | null; to_review: boolean;
}

export function ContractForm({ contract, canRemind }: { contract?: ContractRow; canRemind: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveContract, {});
  const e = state.fields ?? {};
  return (
    <>
      <form action={action} className="space-y-4" noValidate>
        {contract && <input type="hidden" name="id" value={contract.id} />}
        {state.error && (
          <Notice tone={state.code === "plan_limit" ? "warn" : "danger"}>
            {state.error}
            {state.code === "plan_limit" && <div className="mt-3"><LinkButton href="/app/premium" size="sm">Découvrir ECONOM. Plus</LinkButton></div>}
          </Notice>
        )}
        <Card className="space-y-4">
          <Field label="Nom" htmlFor="name" error={e.name}><Input id="name" name="name" defaultValue={contract?.name} maxLength={80} required placeholder="Ex. Salle de sport" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie" htmlFor="category">
              <Select id="category" name="category" defaultValue={contract?.category ?? "streaming"}>{Object.entries(CONTRACT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            </Field>
            <Field label="Prix (€)" htmlFor="price" error={e.price}><Input id="price" name="price" inputMode="decimal" required defaultValue={contract ? (contract.price_cents / 100).toFixed(2).replace(".", ",") : ""} placeholder="Ex. 13,49" /></Field>
            <Field label="Fréquence" htmlFor="frequency">
              <Select id="frequency" name="frequency" defaultValue={contract?.frequency ?? "monthly"}>
                <option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option><option value="quarterly">Chaque trimestre</option><option value="yearly">Chaque année</option>
              </Select>
            </Field>
            <Field label="Prochain prélèvement" htmlFor="next_charge_date" error={e.next_charge_date}><Input id="next_charge_date" name="next_charge_date" type="date" defaultValue={contract?.next_charge_date ?? ""} /></Field>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-extrabold">Engagement et résiliation</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fin d'engagement" htmlFor="commitment_end"><Input id="commitment_end" name="commitment_end" type="date" defaultValue={contract?.commitment_end ?? ""} /></Field>
            <Field label="Date de renouvellement" htmlFor="renewal_date"><Input id="renewal_date" name="renewal_date" type="date" defaultValue={contract?.renewal_date ?? ""} /></Field>
          </div>
          <Field label="Conditions de résiliation" htmlFor="cancellation_terms"><Textarea id="cancellation_terms" name="cancellation_terms" defaultValue={contract?.cancellation_terms ?? ""} maxLength={600} placeholder="Ex. préavis d'un mois, en ligne depuis l'espace client" /></Field>
          <Field label="Lien pour gérer l'abonnement" htmlFor="manage_url" error={e.manage_url}><Input id="manage_url" name="manage_url" type="url" inputMode="url" defaultValue={contract?.manage_url ?? ""} placeholder="https://" /></Field>
        </Card>
        <Card className="space-y-4">
          <Field label="Rappel avant prélèvement (jours)" htmlFor="reminder_days" hint={canRemind ? "Laisse vide pour ne pas recevoir de rappel." : "Les rappels d'échéance font partie d'ECONOM. Plus : ta valeur est enregistrée et s'activera avec Plus."} error={e.reminder_days}>
            <Input id="reminder_days" name="reminder_days" inputMode="numeric" defaultValue={contract?.reminder_days ?? ""} placeholder="Ex. 3" />
          </Field>
          <Field label="Notes" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={contract?.notes ?? ""} maxLength={1000} /></Field>
          <Toggle id="to_review" name="to_review" defaultChecked={contract?.to_review} label="À vérifier" description="Marque cet abonnement si tu n'es pas sûr de l'utiliser assez." />
        </Card>
        <Button type="submit" size="lg" full disabled={pending}>{pending ? <Spinner /> : contract ? "Enregistrer" : "Ajouter cet abonnement"}</Button>
      </form>
      {contract && (
        <form action={deleteContract} className="mt-4 text-center">
          <input type="hidden" name="id" value={contract.id} />
          <Button type="submit" variant="ghost" size="sm" className="!text-danger"><IconTrash width={16} height={16} /> Supprimer de mon suivi</Button>
          <p className="mt-1 text-xs text-muted">Cela ne résilie pas l&apos;abonnement chez le fournisseur.</p>
        </form>
      )}
    </>
  );
}
