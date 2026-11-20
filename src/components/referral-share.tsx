"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { IconShare } from "@/components/icons";
import { trackClient } from "@/lib/track-client";

export function ReferralShare({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const text = "Je compare mes forfaits et je suis mes abonnements avec ECONOM. Essaie, c'est gratuit :";
  async function share() {
    trackClient("referral_shared", { kind: "link" });
    try {
      if (navigator.share) return await navigator.share({ title: "ECONOM.", text, url });
    } catch { return; }
    await copy();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }
  return (
    <div className="space-y-3">
      <div className="rounded-[1.5rem] bg-accent p-5 text-center text-on-accent">
        <p className="text-xs font-bold uppercase tracking-wider">Ton code</p>
        <p className="num text-4xl font-black tracking-[0.2em]">{code}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={share} full><IconShare width={18} height={18} /> Partager mon lien</Button>
        <Button onClick={copy} variant="outline" aria-live="polite">{copied ? "Copié !" : "Copier"}</Button>
      </div>
      <p className="break-all rounded-2xl bg-surface-2 p-3 text-center text-xs text-muted">{url}</p>
    </div>
  );
}
