"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Extraction } from "@/lib/ai/extract";
import { AnalysisForm } from "@/components/analysis-form";
import { Button, Card, LinkButton, Notice, Spinner } from "@/components/ui";
import { IconDoc, IconLock, IconScan } from "@/components/icons";

const MAX = 4_000_000;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Réduit une photo trop lourde dans le navigateur avant envoi (aucun envoi intermédiaire). */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 1_500_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? new File([blob], "facture.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function Scanner({ remaining, limit, plan }: { remaining: number; limit: number; plan: "free" | "plus" }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [done, setDone] = useState<{ id: string; extraction: Extraction } | null>(null);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError({ message: "Format non accepté. Choisis une photo (JPG, PNG, WebP) ou un PDF." });
    if (f.type === "application/pdf" && f.size > MAX) return setError({ message: "Ce PDF dépasse 4 Mo. Envoie seulement la première page ou une photo." });
    setFile(f);
  }

  async function send() {
    if (!file || !consent) return;
    setPending(true);
    setError(null);
    try {
      const small = await shrink(file);
      if (small.size > MAX) throw Object.assign(new Error("Fichier trop volumineux (4 Mo maximum)."), { code: "file_too_large" });
      const body = new FormData();
      body.set("file", small);
      body.set("consent", "true");
      const res = await fetch("/api/analyze", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw Object.assign(new Error(json.error?.message ?? "Analyse impossible."), { code: json.error?.code });
      setDone(json);
    } catch (e) {
      const err = e as Error & { code?: string };
      setError({ message: err.message || "Connexion impossible. Réessaie.", code: err.code });
    } finally {
      setPending(false);
    }
  }

  if (done) return <AnalysisForm id={done.id} extraction={done.extraction} validated={null} />;

  const exhausted = remaining <= 0;
  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.75rem] bg-accent text-on-accent"><IconScan width={36} height={36} /></div>
        <p className="mt-3 text-sm text-muted">{remaining} analyse{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} sur {limit} ce mois-ci</p>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" id="facture" onChange={(e) => pick(e.target.files?.[0])} />
        {file ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3 text-left">
            <span className="flex min-w-0 items-center gap-2"><IconDoc className="shrink-0" /><span className="truncate text-sm font-bold">{file.name}</span></span>
            <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-brand-strong hover:bg-surface">Changer</button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <label htmlFor="facture" className={`pressable inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand px-6 font-bold text-on-brand ${exhausted ? "pointer-events-none opacity-50" : ""}`}>
              <IconScan width={20} height={20} /> Choisir une photo ou un PDF
            </label>
            <p className="text-xs text-muted">Photo, capture d&apos;écran ou PDF — 4 Mo maximum.</p>
          </div>
        )}
      </Card>

      {exhausted && (
        <Notice tone="warn" title="Quota du mois atteint">
          {plan === "plus" ? "Tu as utilisé toutes tes analyses de ce mois." : "Tu as utilisé tes analyses gratuites de ce mois. ECONOM. Plus en inclut davantage."} Le comparateur manuel reste disponible, sans limite.
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton href="/app/comparer" size="sm">Comparer à la main</LinkButton>
            {plan === "free" && <LinkButton href="/app/premium" size="sm" variant="outline">Découvrir Plus</LinkButton>}
          </div>
        </Notice>
      )}

      <Card>
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><IconLock width={20} height={20} /> Ce qui arrive à ton document</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>• Il est transmis à Anthropic (Claude), notre prestataire d&apos;IA, uniquement pour lire les champs utiles : fournisseur, offre, prix, volume, engagement.</li>
          <li>• Il n&apos;est <strong className="text-ink">pas conservé</strong> par ECONOM. : seuls les champs lus sont enregistrés dans ton compte.</li>
          <li>• Les IBAN, noms, adresses et numéros ne sont pas recopiés. Tu peux masquer ces zones avant de prendre la photo.</li>
        </ul>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]" />
          <span>J&apos;accepte que ce document soit transmis à Anthropic pour cette analyse. <Link href="/confidentialite" target="_blank" className="font-bold underline underline-offset-4">En savoir plus</Link></span>
        </label>
      </Card>

      {error && (
        <Notice tone="danger">
          {error.message}
          {error.code?.startsWith("ai_") && <div className="mt-3"><LinkButton href="/app/comparer" size="sm">Comparer à la main</LinkButton></div>}
        </Notice>
      )}
      <Button size="lg" full disabled={!file || !consent || pending || exhausted} onClick={send}>
        {pending ? <><Spinner label="Analyse en cours" /> Lecture de ta facture…</> : "Analyser ma facture"}
      </Button>
    </div>
  );
}
