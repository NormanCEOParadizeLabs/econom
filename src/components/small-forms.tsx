"use client";
import { useActionState, useEffect, useState } from "react";
import { addRealizedSaving, submitDeal, updatePreferences, updateProfile, type FormState } from "@/app/app/actions";
import { Button, Card, Field, Input, Notice, Select, Spinner, Textarea, Toggle, cx } from "@/components/ui";
import { DEAL_CATEGORIES } from "@/lib/format";

function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}
    </>
  );
}

export function AddSavingForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addRealizedSaving, {});
  return (
    <form action={action} className="space-y-3" key={state.ok ? "done" : "form"}>
      <Feedback state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field label="Ce que tu as changé" htmlFor="label"><Input id="label" name="label" maxLength={120} required placeholder="Ex. Nouveau forfait mobile" /></Field>
        <Field label="Économie par mois (€)" htmlFor="amount"><Input id="amount" name="amount" inputMode="decimal" required placeholder="Ex. 12" /></Field>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>{pending ? <Spinner /> : "Ajouter cette économie"}</Button>
    </form>
  );
}

export function ProfileForm({ profile }: { profile: { display_name: string | null; city: string | null; postal_code: string | null } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Field label="Prénom" htmlFor="display_name"><Input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} maxLength={60} autoComplete="given-name" /></Field>
      <div className="grid gap-4 grid-cols-[1fr_8rem]">
        <Field label="Ville" htmlFor="city"><Input id="city" name="city" defaultValue={profile.city ?? ""} maxLength={80} autoComplete="address-level2" /></Field>
        <Field label="Code postal" htmlFor="postal_code"><Input id="postal_code" name="postal_code" defaultValue={profile.postal_code ?? ""} inputMode="numeric" maxLength={5} autoComplete="postal-code" /></Field>
      </div>
      <Button type="submit" disabled={pending}>{pending ? <Spinner /> : "Enregistrer"}</Button>
    </form>
  );
}

export function PreferencesForm({ prefs, pushAvailable }: { prefs: Record<string, boolean>; pushAvailable: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePreferences, {});
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Card className="space-y-3">
        <h2 className="font-display text-lg font-extrabold">Notifications</h2>
        <Toggle id="notif_email" name="notif_email" defaultChecked={prefs.notif_email} label="E-mails utiles" description="Rappels de prélèvement, fins d'engagement, alertes de paiement." />
        <Toggle id="notif_monthly_summary" name="notif_monthly_summary" defaultChecked={prefs.notif_monthly_summary} label="Résumé mensuel" description="Un point sur tes économies, une fois par mois." />
        <Toggle id="notif_deals" name="notif_deals" defaultChecked={prefs.notif_deals} label="Bons plans près de moi" description="Quand un bon plan enregistré en favori arrive à expiration." />
        <Toggle id="notif_push" name="notif_push" defaultChecked={prefs.notif_push && pushAvailable} disabled={!pushAvailable} label="Notifications push" description={pushAvailable ? "Sur cet appareil, une fois l'application installée." : "Pas encore disponibles : elles seront proposées ici dès leur activation."} />
      </Card>
      <Card className="space-y-3">
        <h2 className="font-display text-lg font-extrabold">Confidentialité</h2>
        <Toggle id="analytics_consent" name="analytics_consent" defaultChecked={prefs.analytics_consent} label="Mesure d'usage détaillée" description="Nous aide à améliorer l'application (écrans consultés, clics sur les offres). Sans publicité, sans revente, sans cookie." />
      </Card>
      <Button type="submit" disabled={pending}>{pending ? <Spinner /> : "Enregistrer mes préférences"}</Button>
    </form>
  );
}

const THEMES = [["volt", "VOLT", "#5638F5", "#D8FF55"], ["mint", "MINT CLUB", "#0B6B55", "#A8F5C9"], ["signal", "SIGNAL", "#0B3DFF", "#FF8A5C"]] as const;
const SCHEMES = [["system", "Automatique"], ["light", "Clair"], ["dark", "Sombre"]] as const;

/** Apparence : préférence propre à l'appareil, stockée localement (aucun envoi au serveur). */
export function AppearancePicker() {
  const [theme, setTheme] = useState("volt");
  const [scheme, setScheme] = useState("system");
  useEffect(() => {
    try {
      setTheme(localStorage.getItem("econom.theme") ?? "volt");
      setScheme(localStorage.getItem("econom.scheme") ?? "system");
    } catch {}
  }, []);
  const apply = (t: string, s: string) => {
    setTheme(t); setScheme(s);
    const d = document.documentElement;
    d.dataset.theme = t;
    if (s === "system") delete d.dataset.scheme; else d.dataset.scheme = s;
    try { localStorage.setItem("econom.theme", t); localStorage.setItem("econom.scheme", s); } catch {}
  };
  return (
    <Card className="space-y-4">
      <h2 className="font-display text-lg font-extrabold">Apparence</h2>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Mode d&apos;affichage</legend>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
          {SCHEMES.map(([k, label]) => <button key={k} type="button" aria-pressed={scheme === k} onClick={() => apply(theme, k)} className={cx("min-h-11 rounded-full text-sm font-bold", scheme === k ? "bg-surface shadow" : "text-muted")}>{label}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Identité visuelle</legend>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(([k, label, a, b]) => (
            <button key={k} type="button" aria-pressed={theme === k} onClick={() => apply(k, scheme)} className={cx("pressable rounded-2xl border-2 p-3 text-left", theme === k ? "border-brand" : "border-line")}>
              <span className="flex gap-1"><span className="h-6 w-6 rounded-full" style={{ background: a }} /><span className="h-6 w-6 rounded-full" style={{ background: b }} /></span>
              <span className="mt-2 block text-xs font-extrabold">{label}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

export function DealSubmitForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitDeal, {});
  const e = state.fields ?? {};
  if (state.ok) return <Notice tone="success">{state.ok}</Notice>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <Card className="space-y-4">
        <Field label="Nom du commerce" htmlFor="merchant" error={e.merchant}><Input id="merchant" name="merchant" maxLength={100} required /></Field>
        <Field label="Adresse" htmlFor="address" error={e.address}><Input id="address" name="address" maxLength={200} required autoComplete="off" placeholder="Numéro et rue" /></Field>
        <div className="grid grid-cols-[8rem_1fr] gap-4">
          <Field label="Code postal" htmlFor="postal_code" error={e.postal_code}><Input id="postal_code" name="postal_code" inputMode="numeric" maxLength={5} required /></Field>
          <Field label="Ville" htmlFor="city" error={e.city}><Input id="city" name="city" maxLength={80} required /></Field>
        </div>
      </Card>
      <Card className="space-y-4">
        <Field label="Titre du bon plan" htmlFor="title" error={e.title}><Input id="title" name="title" maxLength={120} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie" htmlFor="category"><Select id="category" name="category">{Object.entries(DEAL_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Avantage" htmlFor="deal_label" error={e.deal_label}><Input id="deal_label" name="deal_label" maxLength={60} required placeholder="Ex. −10 % ou Gratuit" /></Field>
        </div>
        <Field label="Conditions" htmlFor="conditions"><Textarea id="conditions" name="conditions" maxLength={600} /></Field>
        <Field label="Valable jusqu'au" htmlFor="valid_until" hint="Laisse vide si l'offre est permanente."><Input id="valid_until" name="valid_until" type="date" /></Field>
        <Field label="Lien qui prouve l'offre" htmlFor="source_url" error={e.source_url} hint="Page officielle du commerce ou de la collectivité. Sans preuve, pas de publication."><Input id="source_url" name="source_url" type="url" inputMode="url" required placeholder="https://" /></Field>
      </Card>
      <Button type="submit" size="lg" full disabled={pending}>{pending ? <Spinner /> : "Proposer ce bon plan"}</Button>
    </form>
  );
}
