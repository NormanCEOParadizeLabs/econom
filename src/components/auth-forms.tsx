"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/app/(auth)/actions";
import { Button, Field, Input, Notice, Spinner } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { attribution } from "@/lib/track-client";

const initial: AuthState = {};

function Messages({ state }: { state: AuthState }) {
  return (
    <>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.info && <Notice tone="success">{state.info}</Notice>}
    </>
  );
}

function OAuthButtons({ next }: { next: string }) {
  const providers = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "").split(",").map((s) => s.trim()).filter((p): p is "google" | "apple" => p === "google" || p === "apple");
  if (!providers.length) return null;
  const go = async (provider: "google" | "apple") => {
    await supabaseBrowser().auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  };
  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <Button key={p} type="button" variant="outline" full onClick={() => go(p)}>
          Continuer avec {p === "google" ? "Google" : "Apple"}
        </Button>
      ))}
      <p className="text-center text-xs text-muted py-1">ou avec ton e-mail</p>
    </div>
  );
}

function PasswordInput({ id, autoComplete, error }: { id: string; autoComplete: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name="password" type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={autoComplete === "new-password" ? 10 : 1} maxLength={72} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-hint`} className="pr-24" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-bold text-brand-strong hover:bg-surface-2">
        {show ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
}

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {linkError && !state.error && <Notice tone="warn">Ce lien n&apos;est plus valide. Connecte-toi ou demande un nouveau lien.</Notice>}
      <Messages state={state} />
      <OAuthButtons next={next} />
      <input type="hidden" name="next" value={next} />
      <Field label="Adresse e-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoCapitalize="none" />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <PasswordInput id="password" autoComplete="current-password" />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>{pending ? <Spinner label="Connexion en cours" /> : "Me connecter"}</Button>
      <p className="text-center text-sm"><Link href="/mot-de-passe-oublie" className="font-bold text-brand-strong underline underline-offset-4">Mot de passe oublié ?</Link></p>
    </form>
  );
}

export function SignupForm({ referral, source }: { referral: string; source: string }) {
  const [state, action, pending] = useActionState(signUp, initial);
  const [attr, setAttr] = useState<{ source?: string; campaign?: string }>({});
  useEffect(() => setAttr(attribution()), []);
  if (state.info) return <Notice tone="success" title="Vérifie ta boîte mail">{state.info}</Notice>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <OAuthButtons next="/app/bienvenue" />
      <input type="hidden" name="source" value={source || attr.source || ""} />
      <input type="hidden" name="campaign" value={attr.campaign ?? ""} />
      <Field label="Prénom (facultatif)" htmlFor="name">
        <Input id="name" name="name" autoComplete="given-name" maxLength={60} />
      </Field>
      <Field label="Adresse e-mail" htmlFor="email" error={state.fields?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoCapitalize="none" aria-invalid={Boolean(state.fields?.email)} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" hint="10 caractères minimum. Une phrase facile à retenir fait très bien l'affaire." error={state.fields?.password}>
        <PasswordInput id="password" autoComplete="new-password" error={state.fields?.password} />
      </Field>
      <Field label="Code de parrainage (facultatif)" htmlFor="referral">
        <Input id="referral" name="referral" defaultValue={referral} maxLength={8} autoCapitalize="characters" className="uppercase tracking-widest" />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" name="terms" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]" aria-describedby={state.fields?.terms ? "terms-error" : undefined} />
          <span>
            J&apos;accepte les <Link href="/cgu" target="_blank" className="font-bold underline underline-offset-4">conditions d&apos;utilisation</Link> et j&apos;ai lu la{" "}
            <Link href="/confidentialite" target="_blank" className="font-bold underline underline-offset-4">politique de confidentialité</Link>.
          </span>
        </label>
        {state.fields?.terms && <p id="terms-error" role="alert" className="mt-1 text-xs font-semibold text-danger">{state.fields.terms}</p>}
      </div>
      <Button type="submit" full size="lg" disabled={pending}>{pending ? <Spinner label="Création du compte" /> : "Créer mon compte gratuit"}</Button>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <Field label="Adresse e-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoCapitalize="none" />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>{pending ? <Spinner /> : "Recevoir le lien"}</Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <Field label="Nouveau mot de passe" htmlFor="password" hint="10 caractères minimum.">
        <PasswordInput id="password" autoComplete="new-password" />
      </Field>
      <Button type="submit" full size="lg" disabled={pending}>{pending ? <Spinner /> : "Enregistrer le mot de passe"}</Button>
    </form>
  );
}
