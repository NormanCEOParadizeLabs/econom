"use client";
import { useEffect, useState } from "react";

const SS = { source: "econom.src", campaign: "econom.cmp", exp: "econom.exp", opened: "econom.opened" };
const get = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch {} };

/** Provenance de la visite (paramètres utm), gardée le temps de la session de navigation uniquement. */
export function attribution(): { source?: string; campaign?: string } {
  try {
    const q = new URLSearchParams(location.search);
    const s = q.get("utm_source"), c = q.get("utm_campaign");
    if (s) set(SS.source, s.slice(0, 40));
    if (c) set(SS.campaign, c.replace(/[^a-z0-9-]/gi, "").toLowerCase().slice(0, 60));
  } catch {}
  return { source: get(SS.source) ?? undefined, campaign: get(SS.campaign) ?? undefined };
}

function assignments(): Record<string, string> {
  try { return JSON.parse(get(SS.exp) ?? "{}"); } catch { return {}; }
}

/** Événement produit côté client : sans cookie ni identifiant persistant. Les variantes A/B en cours sont jointes. */
export function trackClient(name: string, props: Record<string, string | number | boolean> = {}) {
  try {
    const exp = Object.fromEntries(Object.entries(assignments()).map(([k, v]) => [`exp_${k}`, v]));
    const body = JSON.stringify({ name, props: { ...props, ...exp }, ...attribution() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    else void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {}
}

/** Enregistre l'arrivée (une fois par session) avec sa provenance. */
export function trackOpenOnce() {
  if (get(SS.opened)) return;
  set(SS.opened, "1");
  trackClient("app_opened");
}

let cache: Promise<{ key: string; variants: { key: string; label: string }[] }[]> | null = null;

/** Test A/B : tirage aléatoire par session. Ne sert qu'à choisir un libellé ou un emplacement. */
export function useExperiment(key: string, fallback: { key: string; label: string }) {
  const [variant, setVariant] = useState(fallback);
  useEffect(() => {
    cache ??= fetch("/api/experiments").then((r) => r.json()).then((j) => j.experiments ?? []).catch(() => []);
    void cache.then((list) => {
      const exp = list.find((e) => e.key === key);
      if (!exp?.variants.length) return;
      const a = assignments();
      let chosen = exp.variants.find((v) => v.key === a[key]);
      if (!chosen) {
        chosen = exp.variants[Math.floor(Math.random() * exp.variants.length)];
        set(SS.exp, JSON.stringify({ ...a, [key]: chosen.key }));
        trackClient("experiment_exposed", { experiment: key });
      }
      setVariant(chosen);
    });
  }, [key]);
  return variant;
}
