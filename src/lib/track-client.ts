"use client";
/** Événement produit côté client : sans cookie, sans identifiant persistant. */
export function trackClient(name: string, props?: Record<string, string | number | boolean>) {
  try {
    const source = new URLSearchParams(location.search).get("utm_source") ?? undefined;
    const body = JSON.stringify({ name, props, source });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    else void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {}
}
