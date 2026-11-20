"use client";
import { useState } from "react";
import { Button, Field, Input, Notice, Spinner } from "@/components/ui";

export function DeleteAccount({ hasSubscription }: { hasSubscription: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true); setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: String(f.get("confirm")).trim().toUpperCase(), password: f.get("password") }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.code === "invalid_input" ? "Écris SUPPRIMER pour confirmer." : json.error?.message);
      window.location.assign("/?compte=supprime");
    } catch (err) {
      setError((err as Error).message || "Suppression impossible."); setPending(false);
    }
  }
  if (!open) return <Button variant="ghost" className="!text-danger" onClick={() => setOpen(true)}>Supprimer mon compte</Button>;
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border-2 border-danger/40 p-4">
      <p className="font-bold">Supprimer définitivement mon compte</p>
      <p className="text-sm text-muted">Toutes tes données (abonnements suivis, analyses, comparaisons, économies) seront effacées immédiatement et ne pourront pas être récupérées.{hasSubscription && " Ton abonnement ECONOM. Plus sera résilié sans remboursement de la période en cours."}</p>
      <Field label="Ton mot de passe" htmlFor="del-password"><Input id="del-password" name="password" type="password" autoComplete="current-password" required /></Field>
      <Field label="Écris SUPPRIMER pour confirmer" htmlFor="del-confirm"><Input id="del-confirm" name="confirm" autoComplete="off" autoCapitalize="characters" required /></Field>
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" variant="danger" disabled={pending}>{pending ? <Spinner /> : "Supprimer définitivement"}</Button></div>
    </form>
  );
}
