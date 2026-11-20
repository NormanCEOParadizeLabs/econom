"use client";
import { useState } from "react";
import { LOGO } from "@/components/logo-paths";
import { Button } from "@/components/ui";
import { IconShare } from "@/components/icons";
import { trackClient } from "@/lib/track-client";

/** Carte verticale 1080×1920 (TikTok, Instagram). Ne contient que le montant : aucune donnée personnelle. */
async function render(amountLabel: string, caption: string): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#5638F5"; g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(216,255,85,.22)"; g.beginPath(); g.arc(W - 80, 260, 420, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,.08)"; g.beginPath(); g.arc(60, H - 240, 380, 0, Math.PI * 2); g.fill();
  const [lw, lh] = LOGO.viewBox;
  const s = 520 / lw;
  g.save(); g.translate(90, 150); g.scale(s, s);
  g.fillStyle = "#F8F8F2"; g.fill(new Path2D(LOGO.word));
  g.fillStyle = "#D8FF55"; g.fill(new Path2D(LOGO.dot));
  g.restore();
  void lh;
  const font = getComputedStyle(document.body).getPropertyValue("--font-display") || "sans-serif";
  g.fillStyle = "#F8F8F2"; g.font = `900 92px ${font}`; g.textBaseline = "top";
  g.fillText("J'économise", 90, 640);
  g.font = `900 250px ${font}`;
  const tw = Math.min(g.measureText(amountLabel).width, W - 260);
  g.save(); g.translate(90, 790); g.rotate(-0.03);
  g.fillStyle = "#D8FF55"; g.beginPath(); g.roundRect(-20, -10, tw + 80, 300, 48); g.fill();
  g.fillStyle = "#171529"; g.fillText(amountLabel, 20, 20, W - 260);
  g.restore();
  g.fillStyle = "#F8F8F2"; g.font = `900 92px ${font}`;
  g.fillText("par mois", 90, 1150);
  g.fillText("avec ECONOM.", 90, 1260);
  g.font = `600 40px ${font}`; g.fillStyle = "rgba(248,248,242,.8)";
  g.fillText(caption, 90, 1470, W - 180);
  g.font = `800 54px ${font}`; g.fillStyle = "#D8FF55";
  g.fillText("Ton argent. Tes règles.", 90, H - 230);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("render"))), "image/png"));
}

export function ShareCard({ monthlyCents }: { monthlyCents: number }) {
  const [busy, setBusy] = useState(false);
  const label = `${Math.floor(monthlyCents / 100).toLocaleString("fr-FR")} €`;
  async function share() {
    setBusy(true);
    try {
      await document.fonts.ready;
      const blob = await render(label, "Économie confirmée par l'utilisateur. Chaque situation est différente.");
      const file = new File([blob], "econom-economie.png", { type: "image/png" });
      trackClient("referral_shared", { kind: "saving_card" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `J'économise ${label} par mois avec ECONOM.` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
    } catch {
      /* partage annulé */
    } finally {
      setBusy(false);
    }
  }
  return <Button onClick={share} disabled={busy} variant="accent"><IconShare width={18} height={18} /> Partager ma carte</Button>;
}
