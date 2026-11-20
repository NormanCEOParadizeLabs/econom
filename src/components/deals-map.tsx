"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export interface MapPoint { id: string; lat: number; lon: number; label: string; sub: string }

/** Carte OpenStreetMap (Leaflet). Les marqueurs sont dessinés en CSS : aucune image externe. */
export function DealsMap({ center, points, onSelect }: { center: { lat: number; lon: number }; points: MapPoint[]; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([center.lat, center.lon], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; contributeurs <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(map);
      const pin = (cls: string) => L.divIcon({ className: "", html: `<span class="${cls}"></span>`, iconSize: [26, 26], iconAnchor: [13, 13] });
      L.marker([center.lat, center.lon], { icon: pin("econom-pin econom-pin-me"), keyboard: false, interactive: false }).addTo(map);
      const group: import("leaflet").LatLngExpression[] = [[center.lat, center.lon]];
      for (const p of points) {
        const m = L.marker([p.lat, p.lon], { icon: pin("econom-pin"), title: p.label, alt: p.label }).addTo(map);
        const box = document.createElement("div");
        const b = document.createElement("strong"); b.textContent = p.label;
        const s = document.createElement("div"); s.textContent = p.sub;
        box.append(b, s);
        m.bindPopup(box);
        m.on("click", () => select.current(p.id));
        group.push([p.lat, p.lon]);
      }
      if (group.length > 1) map.fitBounds(L.latLngBounds(group), { padding: [30, 30], maxZoom: 14 });
    });
    return () => { cancelled = true; map?.remove(); };
  }, [center.lat, center.lon, points]);
  return (
    <>
      <style>{`.econom-pin{display:block;width:26px;height:26px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:var(--brand);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35)}.econom-pin-me{border-radius:50%;background:var(--accent);border-color:var(--ink);transform:none;width:18px;height:18px;margin:4px}`}</style>
      <div ref={el} role="application" aria-label="Carte des bons plans" className="h-64 w-full overflow-hidden rounded-[1.5rem] border border-line z-0 isolate" />
    </>
  );
}
