"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, LinkButton, Notice, Spinner, cx } from "@/components/ui";
import { IconCheck } from "@/components/icons";
import { trackClient } from "@/lib/track-client";

async function go(path: string, body?: unknown): Promise<string> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error?.message ?? "Service de paiement indisponible.");
  return json.url;
}

export function CheckoutPanel({ monthly, yearly, enabled }: { monthly: string; yearly: string; enabled: boolean }) {
  const [interval, setInterval_] = useState<"month" | "year">("year");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { trackClient("premium_paywall_viewed"); trackClient("premium_viewed"); }, []);
  async function start() {
    setPending(true); setError(null);
    try {
      window.location.assign(await go("/api/stripe/checkout", { interval, immediateAccessConsent: true }));
    } catch (e) {
      setError((e as Error).message); setPending(false);
    }
  }
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="sr-only">Choix de la périodicité</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["year", "Annuel", yearly, "par an", "Le plus avantageux"], ["month", "Mensuel", monthly, "par mois", "Sans engagement"]] as const).map(([k, label, price, per, hint]) => (
            <button key={k} type="button" aria-pressed={interval === k} onClick={() => setInterval_(k)} className={cx("pressable rounded-[1.5rem] border-2 p-4 text-left", interval === k ? "border-brand bg-surface shadow-lg shadow-brand/10" : "border-line bg-surface")}>
              <span className="flex items-center justify-between text-sm font-bold">{label}{interval === k && <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-on-brand"><IconCheck width={14} height={14} /></span>}</span>
              <span className="num mt-1 block text-3xl font-black">{price}</span>
              <span className="text-sm text-muted">TTC {per} · {hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]" />
        <span>Je demande l&apos;accès immédiat à ECONOM. Plus et je reconnais perdre mon droit de rétractation de 14 jours une fois le service pleinement fourni. J&apos;accepte les <Link href="/cgv" target="_blank" className="font-bold underline underline-offset-4">conditions générales de vente</Link>.</span>
      </label>
      {error && <Notice tone="danger">{error}</Notice>}
      {!enabled && <Notice tone="warn" title="Paiement pas encore activé">Le paiement en ligne n&apos;est pas encore configuré sur cet environnement. Aucune somme ne peut être prélevée.</Notice>}
      <Button size="lg" full variant="accent" disabled={!consent || pending || !enabled} onClick={start}>{pending ? <><Spinner /> Redirection vers le paiement sécurisé…</> : `Passer à Plus — ${interval === "year" ? yearly + " par an" : monthly + " par mois"}`}</Button>
      <p className="text-center text-xs text-muted">Paiement sécurisé par Stripe : ECONOM. ne voit jamais ton numéro de carte. Renouvellement automatique, résiliable en ligne à tout moment depuis « Mon compte », effet à la fin de la période payée.</p>
    </div>
  );
}

export function PortalButton({ label = "Gérer mon abonnement et mes factures", variant = "outline" as "outline" | "primary" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button variant={variant} full disabled={pending} onClick={async () => { setPending(true); setError(null); try { window.location.assign(await go("/api/stripe/portal")); } catch (e) { setError((e as Error).message); setPending(false); } }}>
        {pending ? <Spinner /> : label}
      </Button>
      {error && <Notice tone="danger" className="mt-2">{error}</Notice>}
    </>
  );
}

/** Retour du paiement : on attend la confirmation du serveur (webhook Stripe), jamais l'URL seule. */
export function ActivationWatcher() {
  const [state, setState] = useState<"waiting" | "active" | "slow">("waiting");
  useEffect(() => {
    let tries = 0;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      tries++;
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const json = await res.json();
        if (json.plan === "plus") return setState("active");
      } catch {}
      if (tries >= 20) return setState("slow");
      setTimeout(tick, 1500);
    };
    void tick();
    return () => { stop = true; };
  }, []);
  if (state === "active") {
    return (
      <div className="animate-pop text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent text-on-accent"><IconCheck width={40} height={40} /></div>
        <h1 className="mt-5 font-display text-4xl font-black">Bienvenue dans Plus !</h1>
        <p className="mt-2 text-muted">Ton paiement est confirmé et tes avantages sont actifs. Un reçu t&apos;a été envoyé par e-mail.</p>
        <div className="mt-6 flex flex-col gap-2"><LinkButton href="/app" size="lg">Aller à mon tableau de bord</LinkButton><LinkButton href="/app/compte" variant="ghost">Voir mon abonnement</LinkButton></div>
      </div>
    );
  }
  if (state === "slow") {
    return (
      <Notice tone="warn" title="Confirmation en cours">
        Nous n&apos;avons pas encore reçu la confirmation du paiement. Si tu as bien payé, tes avantages s&apos;activeront automatiquement dans quelques minutes : inutile de payer une seconde fois.
        <div className="mt-3 flex gap-2"><LinkButton href="/app/compte" size="sm">Voir mon compte</LinkButton></div>
      </Notice>
    );
  }
  return <div className="py-16 text-center" role="status"><Spinner label="Vérification du paiement" /><p className="mt-4 font-bold">Vérification de ton paiement…</p><p className="text-sm text-muted">Quelques secondes suffisent.</p></div>;
}
