"use client";
import { useActionState } from "react";
import { createChallenge, joinChallenge, type ChallengeState } from "@/app/app/defis/actions";
import { Button, Field, Input, Notice, Spinner, Toggle } from "@/components/ui";

export function CreateChallengeForm({ defaultNick }: { defaultNick: string }) {
  const [state, action, pending] = useActionState<ChallengeState, FormData>(createChallenge, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Field label="Nom du défi" htmlFor="title"><Input id="title" name="title" maxLength={80} required defaultValue="On trouve 100 € d'économies à nous trois ?" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Objectif collectif (€)" htmlFor="goal"><Input id="goal" name="goal" inputMode="numeric" required defaultValue="100" /></Field>
        <Field label="Ton pseudo dans le défi" htmlFor="nickname"><Input id="nickname" name="nickname" maxLength={30} required defaultValue={defaultNick} /></Field>
      </div>
      <Button type="submit" size="lg" full disabled={pending}>{pending ? <Spinner /> : "Créer le défi"}</Button>
    </form>
  );
}

export function JoinChallengeForm({ token, defaultNick }: { token: string; defaultNick: string }) {
  const [state, action, pending] = useActionState<ChallengeState, FormData>(joinChallenge, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <input type="hidden" name="token" value={token} />
      <Field label="Ton pseudo dans le défi" htmlFor="nickname" hint="C'est le seul nom que verront les autres participants."><Input id="nickname" name="nickname" maxLength={30} required defaultValue={defaultNick} /></Field>
      <Toggle id="share" name="share" defaultChecked label="Partager mes totaux avec le groupe" description="Seuls tes totaux d'économies sont visibles — jamais tes contrats, tes factures ni le détail de tes dépenses. Modifiable à tout moment." />
      <Button type="submit" size="lg" full disabled={pending}>{pending ? <Spinner /> : "Rejoindre le défi"}</Button>
    </form>
  );
}
