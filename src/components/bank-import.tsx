"use client";
import Link from "next/link";
import { useState } from "react";
import { importContracts } from "@/app/app/actions";
import type { RecurringCandidate } from "@/lib/bank-import";
import { Badge, Button, Card, LinkButton, Notice, Spinner } from "@/components/ui";
import { IconDoc, IconLock } from "@/components/icons";
import { CONTRACT_CATEGORIES, FREQ_LABEL, dateFr, euro } from "@/lib/format";

interface Analysis { transactions: number; from: string; to: string; candidates: RecurringCandidate[] }

export function BankImport({ plan, freeLimit }: { plan: "free" | "plus"; freeLimit: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<{ added: number; skipped: number; limited: boolean } | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(null); setDone(null);
    try {
      const body = new FormData(); body.set("file", file);
      const res = await fetch("/api/bank-import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      setAnalysis(json);
      setPicked(new Set((json.candidates as RecurringCandidate[]).filter((c) => c.confidence === "elevee").map((c) => c.key)));
    } catch (e) {
      setError((e as Error).message || "Analyse impossible.");
    } finally {
      setBusy(false);
    }
  }
  async function add() {
    if (!analysis) return;
    setBusy(true);
    const res = await importContracts(analysis.candidates.filter((c) => picked.has(c.key)).map(({ name, category, priceCents, previousPriceCents, frequency, firstSeen, nextChargeDate }) => ({ name, category, priceCents, previousPriceCents, frequency, firstSeen, nextChargeDate })));
    setBusy(false);
    if (res.error) setError(res.error); else setDone(res);
  }
  const toggle = (k: string) => setPicked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const monthsBetween = (a: string, b: string) => Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / (864e5 * 30.4)));

  if (done) {
    return (
      <Notice tone={done.added ? "success" : "warn"} title={`${done.added} abonnement${done.added > 1 ? "s" : ""} ajouté${done.added > 1 ? "s" : ""}`}>
        {done.skipped > 0 && <p>{done.skipped} déjà présent{done.skipped > 1 ? "s" : ""} dans ton suivi.</p>}
        {done.limited && <p>La formule gratuite permet de suivre {freeLimit} abonnement : les autres n&apos;ont pas été ajoutés. ECONOM. Plus les suit tous.</p>}
        <div className="mt-3 flex flex-wrap gap-2"><LinkButton href="/app/abonnements" size="sm">Voir mes abonnements et mes conseils</LinkButton>{done.limited && <LinkButton href="/app/premium" size="sm" variant="outline">Découvrir Plus</LinkButton>}</div>
      </Notice>
    );
  }
  return (
    <div className="space-y-4">
      {!analysis && (
        <>
          <Card className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent text-on-accent"><IconDoc width={30} height={30} /></div>
            <input id="releve" type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            <label htmlFor="releve" className="pressable mt-4 inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand px-6 font-bold text-on-brand">{busy ? <Spinner label="Analyse" /> : "Choisir mon relevé (CSV)"}</label>
            <p className="mt-2 text-xs text-muted">Idéalement 6 à 12 mois d&apos;opérations · 2 Mo maximum</p>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-extrabold">Comment obtenir ce fichier</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>Connecte-toi à ta banque en ligne (site ou application).</li>
              <li>Ouvre ton compte courant, puis cherche « Exporter », « Télécharger » ou « Relevé d&apos;opérations ».</li>
              <li>Choisis le format <strong className="text-ink">CSV</strong> et la période la plus longue possible.</li>
            </ol>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><IconLock width={20} height={20} /> Ce qui arrive à ton relevé</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-muted">
              <li>• Il est lu une seule fois par notre serveur pour repérer les prélèvements réguliers, puis écarté : <strong className="text-ink">il n&apos;est ni conservé, ni transmis à une IA ou à un tiers</strong>.</li>
              <li>• ECONOM. ne te demande jamais tes identifiants bancaires.</li>
              <li>• Seuls les abonnements que tu coches sont enregistrés dans ton compte.</li>
            </ul>
          </Card>
        </>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      {analysis && (
        <>
          <Notice title={`${analysis.candidates.length} prélèvement${analysis.candidates.length > 1 ? "s" : ""} régulier${analysis.candidates.length > 1 ? "s" : ""} repéré${analysis.candidates.length > 1 ? "s" : ""}`}>
            {analysis.transactions} opérations analysées, du {dateFr(analysis.from)} au {dateFr(analysis.to)}. Coche ceux que tu veux suivre : la détection est automatique et peut se tromper.
          </Notice>
          {analysis.candidates.length === 0 && <Notice tone="warn">Aucun prélèvement régulier détecté sur cette période. Essaie avec un export plus long, ou ajoute tes abonnements à la main.</Notice>}
          <ul className="space-y-2">
            {analysis.candidates.map((c) => {
              const months = monthsBetween(c.firstSeen, c.lastSeen);
              return (
                <li key={c.key}>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-[1.25rem] border-2 bg-surface p-4 ${picked.has(c.key) ? "border-brand" : "border-line"}`}>
                    <input type="checkbox" checked={picked.has(c.key)} onChange={() => toggle(c.key)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-bold">{c.name}<Badge>{CONTRACT_CATEGORIES[c.category]}</Badge>{c.confidence === "moyenne" && <Badge tone="warn">À confirmer</Badge>}</span>
                      <span className="block text-xs text-muted">{c.occurrences} prélèvements depuis le {dateFr(c.firstSeen)}{months >= 2 ? ` · au moins ${months} mois` : ""} · {euro(c.totalPaidCents)} versés sur la période</span>
                      {c.previousPriceCents !== null && c.previousPriceCents < c.priceCents && <span className="mt-1 block text-xs font-bold text-danger">Prix en hausse : {euro(c.previousPriceCents)} → {euro(c.priceCents)}</span>}
                    </span>
                    <span className="text-right"><span className="num block font-black">{euro(c.priceCents)}</span><span className="text-xs text-muted">{FREQ_LABEL[c.frequency]}</span></span>
                  </label>
                </li>
              );
            })}
          </ul>
          {plan === "free" && picked.size > freeLimit && <Notice tone="warn">La formule gratuite permet de suivre {freeLimit} abonnement. Tu vois ici toute l&apos;analyse ; pour les enregistrer tous, il faut ECONOM. Plus. <Link href="/app/premium" className="font-bold underline underline-offset-4">Découvrir Plus</Link></Notice>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setAnalysis(null); setError(null); }}>Autre fichier</Button>
            <Button className="flex-1" disabled={busy || picked.size === 0} onClick={add}>{busy ? <Spinner /> : `Ajouter ${picked.size} abonnement${picked.size > 1 ? "s" : ""} à mon suivi`}</Button>
          </div>
        </>
      )}
    </div>
  );
}
