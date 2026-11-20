"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DealView } from "@/lib/services/deals";
import { DealsMap } from "@/components/deals-map";
import { Badge, Button, Card, EmptyState, Input, LinkButton, Notice, Select, Spinner, cx } from "@/components/ui";
import { IconChevron, IconPin } from "@/components/icons";
import { DEAL_CATEGORIES, dateFr } from "@/lib/format";
import { trackClient } from "@/lib/track-client";

interface Place { label: string; lat: number; lon: number }

export function DealsExplorer({ defaultQuery }: { defaultQuery: string }) {
  const [query, setQuery] = useState(defaultQuery);
  const [place, setPlace] = useState<Place | null>(null);
  const [choices, setChoices] = useState<Place[]>([]);
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState(15);
  const [deals, setDeals] = useState<DealView[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // La position n'est gardée que pour la session de navigation, sur l'appareil.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("econom.place");
      if (saved) setPlace(JSON.parse(saved));
    } catch {}
  }, []);

  const load = useCallback(async (p: Place, cat: string, r: number) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/deals?lat=${p.lat}&lon=${p.lon}&radius=${r}${cat ? `&category=${cat}` : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      setDeals(json.deals); setTotal(json.total);
    } catch (e) {
      setError((e as Error).message || "Chargement impossible.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { if (place) void load(place, category, radius); }, [place, category, radius, load]);

  const choose = (p: Place) => {
    setPlace(p); setChoices([]);
    try { sessionStorage.setItem("econom.place", JSON.stringify(p)); } catch {}
  };

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      if (!json.results.length) setError("Ville introuvable. Essaie avec le code postal.");
      else if (json.results.length === 1) choose(json.results[0]);
      else setChoices(json.results);
    } catch (e) {
      setError((e as Error).message || "Recherche impossible.");
    } finally {
      setBusy(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) return setError("La géolocalisation n'est pas disponible sur cet appareil.");
    setBusy(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBusy(false); choose({ label: "Ma position", lat: Math.round(pos.coords.latitude * 1000) / 1000, lon: Math.round(pos.coords.longitude * 1000) / 1000 }); },
      () => { setBusy(false); setError("Position non partagée. Tu peux saisir ta ville ou ton code postal."); },
      { maximumAge: 600000, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <form onSubmit={search} className="flex gap-2">
          <label htmlFor="ville" className="sr-only">Ville ou code postal</label>
          <Input id="ville" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ville ou code postal" maxLength={80} autoComplete="postal-code" />
          <Button type="submit" disabled={busy}>Chercher</Button>
        </form>
        <button type="button" onClick={locate} className="inline-flex items-center gap-2 text-sm font-bold text-brand-strong"><IconPin width={18} height={18} /> Utiliser ma position, une seule fois</button>
        <p className="text-xs text-muted">Ta position sert uniquement à cette recherche : elle n&apos;est ni enregistrée dans ton compte ni suivie en continu.</p>
        {choices.length > 0 && <ul className="flex flex-wrap gap-2">{choices.map((c) => <li key={c.label}><button type="button" onClick={() => choose(c)} className="rounded-full bg-surface-2 px-3 py-2 text-sm font-bold hover:bg-brand hover:text-on-brand">{c.label}</button></li>)}</ul>}
      </Card>

      {error && <Notice tone="warn">{error}</Notice>}

      {place && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand"><IconPin width={12} height={12} /> {place.label}</Badge>
            <label htmlFor="cat" className="sr-only">Catégorie</label>
            <Select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="!w-auto !min-h-10 text-sm">
              <option value="">Toutes les catégories</option>
              {Object.entries(DEAL_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <label htmlFor="rayon" className="sr-only">Rayon</label>
            <Select id="rayon" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="!w-auto !min-h-10 text-sm">
              {[5, 15, 30, 50].map((r) => <option key={r} value={r}>{r} km</option>)}
            </Select>
            {busy && <Spinner />}
          </div>
          {deals && deals.length > 0 && <DealsMap center={place} points={deals.map((d) => ({ id: d.id, lat: d.merchant.lat, lon: d.merchant.lon, label: d.merchant.name, sub: d.dealLabel }))} onSelect={setSelected} />}
          {deals && deals.length === 0 && (
            <EmptyState icon={<IconPin />} title={total === 0 ? "Aucun bon plan vérifié pour l'instant" : "Rien de vérifié dans ce rayon"} action={<LinkButton href="/app/bons-plans/proposer" variant="outline">Proposer un bon plan</LinkButton>}>
              {total === 0
                ? "Nous ne publions que des offres dont la source a été contrôlée. Le registre s'ouvre progressivement : plutôt aucune promotion qu'une promotion inventée."
                : "Élargis le rayon ou change de catégorie. Nous n'affichons que des offres dont la source a été contrôlée."}
            </EmptyState>
          )}
          <ul className="space-y-2">
            {deals?.map((d) => (
              <li key={d.id}>
                <Link href={`/app/bons-plans/${d.id}`} onClick={() => trackClient("deal_viewed", { category: d.category })} className={cx("pressable flex items-center gap-3 rounded-[1.25rem] border bg-surface p-4 hover:border-brand", selected === d.id ? "border-brand ring-2 ring-brand/30" : "border-line")}>
                  <span className="grid h-14 min-w-14 place-items-center rounded-2xl bg-accent px-2 text-center text-sm font-black leading-tight text-on-accent">{d.dealLabel}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{d.title}</span>
                    <span className="block truncate text-sm text-muted">{d.merchant.name} · {d.merchant.city}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <Badge>{DEAL_CATEGORIES[d.category]}</Badge>
                      {d.distanceKm !== null && <Badge>{d.distanceKm.toLocaleString("fr-FR")} km</Badge>}
                      {d.isSponsored && <Badge tone="warn">Sponsorisé</Badge>}
                      <span className="text-muted self-center">{d.validUntil ? `jusqu'au ${dateFr(d.validUntil, { day: "numeric", month: "short" })}` : "offre permanente"}</span>
                    </span>
                  </span>
                  <IconChevron width={18} height={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {!place && !error && <EmptyState icon={<IconPin />} title="Où cherches-tu ?">Saisis ta ville ou ton code postal pour voir les bons plans vérifiés autour de toi.</EmptyState>}
    </div>
  );
}
