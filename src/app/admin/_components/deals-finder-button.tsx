"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Notice, Spinner } from "@/components/ui";

interface Report { city: string; found: number; published: number; pending: number; rejected: { title: string; reason: string }[] }

export function DealsFinderButton() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setReport(null);
    try {
      const res = await fetch("/api/admin/deals-finder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ city }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      setReport(json); router.refresh();
    } catch (err) { setError((err as Error).message || "Recherche impossible."); } finally { setBusy(false); }
  }
  return (
    <div className="rounded-[1.5rem] border border-line bg-surface p-5">
      <h3 className="font-display text-lg font-extrabold">Recherche automatique par Claude</h3>
      <p className="mt-1 text-sm text-muted">Claude cherche des offres sur des sites officiels. Chaque offre n&apos;est publiée que si la citation fournie est retrouvée mot pour mot sur la page source ; sinon elle arrive dans la file de modération. Une recherche coûte quelques centimes d&apos;API et dure une à deux minutes. La tâche quotidienne fait de même pour les villes configurées et retire les offres dont la preuve a disparu.</p>
      <form onSubmit={run} className="mt-3 flex gap-2">
        <label htmlFor="finder-city" className="sr-only">Ville</label>
        <Input id="finder-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville, ex. Lyon" required minLength={2} maxLength={60} />
        <Button type="submit" disabled={busy}>{busy ? <Spinner label="Recherche en cours" /> : "Chercher"}</Button>
      </form>
      {error && <Notice tone="danger" className="mt-3">{error}</Notice>}
      {report && (
        <Notice tone="success" className="mt-3" title={`${report.city} : ${report.published} publié(s), ${report.pending} en attente`}>
          {report.found} offre(s) proposée(s) par Claude.
          {report.rejected.length > 0 && <ul className="mt-1 list-disc pl-5">{report.rejected.map((r, i) => <li key={i}>{r.title} — {r.reason}</li>)}</ul>}
        </Notice>
      )}
    </div>
  );
}
