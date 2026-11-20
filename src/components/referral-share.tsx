"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { IconShare } from "@/components/icons";
import { trackClient } from "@/lib/track-client";

export function ReferralShare({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const text = "Découvre combien tu pourrais économiser sur ton forfait ou ta box. Diagnostic gratuit, sans inscription :";
  async function share() {
    if (navigator.share) {
      trackClient("share_sheet_opened", { from: "referral" });
      try { await navigator.share({ title: "ECONOM.", text, url }); trackClient("share_completed", { from: "referral" }); } catch {}
      return;
    }
    await copy();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); trackClient("share_link_copied", { from: "referral" }); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
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
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        {([["WhatsApp", `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`], ["SMS", `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`], ["Messenger", `fb-messenger://share/?link=${encodeURIComponent(url)}`], ["E-mail", `mailto:?body=${encodeURIComponent(`${text} ${url}`)}`]] as const).map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackClient("share_sheet_opened", { from: "referral", app: label })} className="rounded-full bg-surface-2 px-3 py-2 font-bold hover:bg-brand hover:text-on-brand">{label}</a>
        ))}
      </div>
      <p className="break-all rounded-2xl bg-surface-2 p-3 text-center text-xs text-muted select-all">{url}</p>
    </div>
  );
}
