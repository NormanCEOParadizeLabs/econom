"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { IconShare } from "@/components/icons";
import { trackClient } from "@/lib/track-client";

export function DealShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const text = `Regarde le bon plan que j'ai trouvé près de chez nous : ${title}`;
    trackClient("deal_shared");
    if (navigator.share) {
      trackClient("share_sheet_opened", { from: "deal" });
      try { await navigator.share({ text, url }); trackClient("share_completed", { from: "deal" }); } catch {}
      return;
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); trackClient("share_link_copied", { from: "deal" }); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }
  return <Button type="button" variant="outline" full onClick={share} aria-live="polite"><IconShare width={18} height={18} /> {copied ? "Lien copié !" : "Partager ce bon plan"}</Button>;
}
