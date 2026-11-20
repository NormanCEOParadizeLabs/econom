"use client";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { LOGO } from "@/components/logo-paths";
import { Button, Notice, cx } from "@/components/ui";
import { IconShare, IconX } from "@/components/icons";
import { trackClient } from "@/lib/track-client";

/** Données d'une carte : uniquement des montants issus du moteur. Aucun nom, opérateur ou contrat. */
export interface CardData {
  status: "potential" | "realized";
  monthlyCents: number;
  yearlyCents: number;
  beforeCents?: number;
  afterCents?: number;
  link: string;
}
type StyleKey = "volt" | "minimal" | "beforeafter";
type FormatKey = "story" | "post" | "square" | "wide";

const FORMATS: Record<FormatKey, { label: string; w: number; h: number }> = {
  story: { label: "Story 9:16", w: 1080, h: 1920 },
  post: { label: "Post 4:5", w: 1080, h: 1350 },
  square: { label: "Carré 1:1", w: 1080, h: 1080 },
  wide: { label: "WhatsApp", w: 1200, h: 630 },
};
const STYLES: Record<StyleKey, string> = { volt: "VOLT IMPACT", minimal: "MINIMAL MONEY", beforeafter: "AVANT / APRÈS" };
const PALETTE = {
  volt: { bg: "#5638F5", text: "#F8F8F2", sub: "rgba(248,248,242,.85)", chip: "#D8FF55", chipText: "#171529", logo: "#F8F8F2", dot: "#D8FF55", qrBg: "#F8F8F2" },
  minimal: { bg: "#F8F8F2", text: "#171529", sub: "#5d5a72", chip: "#171529", chipText: "#D8FF55", logo: "#171529", dot: "#5638F5", qrBg: "#FFFFFF" },
  beforeafter: { bg: "#171529", text: "#F8F8F2", sub: "rgba(248,248,242,.75)", chip: "#D8FF55", chipText: "#171529", logo: "#F8F8F2", dot: "#D8FF55", qrBg: "#F8F8F2" },
};

/** Arrondi à l'euro inférieur : une carte n'exagère jamais un montant. */
const eurosDown = (cents: number) => `${Math.floor(cents / 100).toLocaleString("fr-FR")} €`;
const price = (cents: number) => `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const t = line ? `${line} ${word}` : word;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = word; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function draw(c: HTMLCanvasElement, d: CardData, style: StyleKey, format: FormatKey, family: string, progress = 1) {
  const { w: W, h: H } = FORMATS[format];
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const p = PALETTE[style];
  const wide = format === "wide";
  const u = wide ? H / 630 : W / 1080; // unité
  const pad = (wide ? 60 : 84) * u;
  const font = (weight: number, px: number) => `${weight} ${Math.round(px * u)}px ${family}`;
  g.fillStyle = p.bg; g.fillRect(0, 0, W, H);
  if (style === "volt") {
    g.fillStyle = "rgba(216,255,85,.20)"; g.beginPath(); g.arc(W - 60 * u, 200 * u, 380 * u, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.07)"; g.beginPath(); g.arc(40 * u, H - 160 * u, 340 * u, 0, 7); g.fill();
  } else if (style === "beforeafter") {
    g.fillStyle = "rgba(86,56,245,.55)"; g.beginPath(); g.arc(W + 40 * u, H * 0.5, 460 * u, 0, 7); g.fill();
  }
  g.textBaseline = "top";

  // Logotype
  const lw = (wide ? 240 : 330) * u;
  const s = lw / LOGO.viewBox[0];
  g.save(); g.translate(pad, pad); g.scale(s, s);
  g.fillStyle = p.logo; g.fill(new Path2D(LOGO.word));
  g.fillStyle = p.dot; g.fill(new Path2D(LOGO.dot));
  g.restore();

  // QR code + lien (bas de carte)
  const qr = QRCode.create(d.link, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const qs = (wide ? 150 : 190) * u;
  const qx = W - pad - qs, qy = H - pad - qs;
  g.fillStyle = p.qrBg; g.beginPath(); g.roundRect(qx - 14 * u, qy - 14 * u, qs + 28 * u, qs + 28 * u, 22 * u); g.fill();
  g.fillStyle = "#171529";
  const cell = qs / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(y, x)) g.fillRect(qx + x * cell, qy + y * cell, cell + 0.6, cell + 0.6);
  g.fillStyle = p.sub; g.font = font(700, wide ? 22 : 30);
  const host = d.link.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  g.fillText(host.length > 34 ? host.slice(0, 33) + "…" : host, pad, H - pad - (wide ? 30 : 40) * u);
  g.fillStyle = style === "minimal" ? "#5638F5" : "#D8FF55"; g.font = font(800, wide ? 26 : 38);
  g.fillText("Ton argent. Tes règles.", pad, H - pad - (wide ? 70 : 96) * u);

  const amount = eurosDown(d.monthlyCents * progress);
  const statusLabel = d.status === "realized" ? "ÉCONOMIE RÉALISÉE" : "ÉCONOMIE POTENTIELLE ESTIMÉE";
  const lead = d.status === "realized" ? "J'économise" : "J'ai découvert que je pouvais économiser";
  const maxW = (wide ? W - pad * 2 - qs - 60 * u : W - pad * 2);
  let y = pad + (wide ? 70 : format === "story" ? 330 : format === "post" ? 190 : 150) * u;

  // Pastille de statut : potentielle ou réalisée, toujours indiquée.
  g.font = font(800, wide ? 20 : 28);
  const sw = g.measureText(statusLabel).width + 36 * u;
  g.fillStyle = style === "minimal" ? "#5638F5" : "rgba(255,255,255,.16)";
  g.beginPath(); g.roundRect(pad, y, sw, (wide ? 40 : 54) * u, 30 * u); g.fill();
  g.fillStyle = "#F8F8F2"; g.fillText(statusLabel, pad + 18 * u, y + (wide ? 10 : 13) * u);
  y += (wide ? 62 : 96) * u;

  if (style === "beforeafter" && d.beforeCents && d.afterCents) {
    const bw = wide ? (maxW - 30 * u) / 2 : maxW;
    const bh = (wide ? 190 : 250) * u;
    const blocks: [string, string, boolean][] = [["AVANT", price(d.beforeCents), false], ["APRÈS", price(d.afterCents), true]];
    blocks.forEach(([label, value, after], i) => {
      const bx = wide ? pad + i * (bw + 30 * u) : pad;
      const by = wide ? y : y + i * (bh + 26 * u);
      g.fillStyle = after ? "#D8FF55" : "rgba(255,255,255,.10)";
      g.beginPath(); g.roundRect(bx, by, bw, bh, 36 * u); g.fill();
      g.fillStyle = after ? "#171529" : "rgba(248,248,242,.7)"; g.font = font(800, wide ? 24 : 34);
      g.fillText(label, bx + 30 * u, by + 26 * u);
      g.fillStyle = after ? "#171529" : "#F8F8F2"; g.font = font(900, wide ? 84 : 124);
      g.fillText(value, bx + 30 * u, by + (wide ? 66 : 86) * u, bw - 60 * u);
      const tw = Math.min(g.measureText(value).width, bw - 60 * u);
      if (!after) { g.fillRect(bx + 24 * u, by + (wide ? 112 : 150) * u, tw + 12 * u, 8 * u); }
      g.font = font(700, wide ? 22 : 32); g.fillStyle = after ? "#171529" : "rgba(248,248,242,.7)";
      g.fillText("par mois", bx + 36 * u + tw, by + (wide ? 128 : 172) * u);
    });
    y += wide ? bh + 26 * u : 2 * bh + 60 * u;
    g.fillStyle = p.text; g.font = font(900, wide ? 36 : 58);
    g.fillText(`${amount} de moins par mois*`, pad, y, maxW);
    y += (wide ? 48 : 80) * u;
  } else {
    g.fillStyle = p.text; g.font = font(style === "minimal" ? 700 : 900, wide ? 38 : style === "minimal" ? 52 : 74);
    for (const line of wrap(g, lead, maxW)) { g.fillText(line, pad, y); y += (wide ? 46 : style === "minimal" ? 64 : 88) * u; }
    y += 14 * u;
    g.font = font(900, wide ? 170 : style === "minimal" ? 330 : 250);
    const aw = Math.min(g.measureText(amount).width, maxW - 60 * u);
    const ah = (wide ? 180 : style === "minimal" ? 330 : 270) * u;
    if (style === "minimal") {
      g.fillStyle = p.text; g.fillText(amount, pad - 6 * u, y, maxW);
      g.fillStyle = "#D8FF55"; g.fillRect(pad, y + ah - 18 * u, aw, 22 * u);
      g.fillStyle = p.text; g.fillText(amount, pad - 6 * u, y, maxW);
    } else {
      g.save(); g.translate(pad, y); g.rotate(-0.025);
      g.fillStyle = p.chip; g.beginPath(); g.roundRect(-14 * u, -6 * u, aw + 74 * u, ah, 44 * u); g.fill();
      g.fillStyle = p.chipText; g.fillText(amount, 22 * u, 14 * u, maxW - 60 * u);
      g.restore();
    }
    y += ah + 26 * u;
    g.fillStyle = p.text; g.font = font(900, wide ? 44 : 78);
    g.fillText("par mois*", pad, y);
    y += (wide ? 58 : 104) * u;
  }
  g.fillStyle = p.sub; g.font = font(700, wide ? 28 : 46);
  g.fillText(`Soit ${eurosDown(d.yearlyCents)} par an.`, pad, y, maxW);
  y += (wide ? 44 : 84) * u;
  if (!wide || style !== "beforeafter") {
    g.fillStyle = p.text; g.font = font(900, wide ? 32 : 56);
    for (const line of wrap(g, "Et toi, combien pourrais-tu économiser ?", maxW)) { g.fillText(line, pad, y); y += (wide ? 40 : 68) * u; }
  }
  g.fillStyle = p.sub; g.font = font(500, wide ? 15 : 24);
  const note = d.status === "realized" ? "*Économie déclarée par l'utilisateur. Chaque situation est différente." : "*Estimation frais inclus, d'après une comparaison d'offres vérifiées. Non garantie.";
  g.fillText(note, pad, H - pad - (wide ? 104 : 150) * u, wide ? maxW : W - pad * 2 - qs - 40 * u);
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("export"))), "image/png"));

export function SavingsCardStudio({ data, onClose, shareText }: { data: CardData; onClose: () => void; shareText?: string }) {
  const canBA = Boolean(data.beforeCents && data.afterCents);
  const [style, setStyle] = useState<StyleKey>(canBA ? "beforeafter" : "volt");
  const [format, setFormat] = useState<FormatKey>("story");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const family = useRef("sans-serif");
  const text = shareText ?? (data.status === "realized" ? `J'économise ${eurosDown(data.monthlyCents)} par mois avec ECONOM. Et toi ?` : `J'ai découvert que je pouvais économiser ${eurosDown(data.monthlyCents)} par mois. Et toi, combien ?`);

  const render = useCallback((progress = 1) => { if (canvas.current) draw(canvas.current, data, style, format, family.current, progress); }, [data, style, format]);

  useEffect(() => {
    dialog.current?.showModal();
    trackClient("savings_card_generated", { status: data.status });
  }, [data.status]);
  useEffect(() => {
    family.current = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif";
    void document.fonts.load(`900 100px ${family.current}`).then(() => render(), () => render());
  }, [render]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2600); };
  const file = async () => new File([await toBlob(canvas.current!)], `econom-${style}-${format}.png`, { type: "image/png" });
  const save = (blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  };

  async function download() { const f = await file(); save(f, f.name); flash("Image enregistrée."); }
  async function copyLink() {
    try { await navigator.clipboard.writeText(data.link); trackClient("share_link_copied", { from: "card" }); flash("Lien copié."); } catch { flash("Copie impossible : sélectionne le lien ci-dessous."); }
  }
  async function nativeShare() {
    const f = await file();
    const payload: ShareData = navigator.canShare?.({ files: [f] }) ? { files: [f], text: `${text} ${data.link}` } : { text, url: data.link };
    if (!navigator.share) { await download(); return; }
    trackClient("share_sheet_opened", { from: "card", style, format });
    try {
      await navigator.share(payload);
      trackClient("share_completed", { from: "card", style, format }); // confirmé par le système, pas à l'ouverture
    } catch { /* partage annulé : non compté */ }
  }
  async function video() {
    const c = canvas.current!;
    const mime = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"].find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
    if (!mime || !c.captureStream) return flash("La vidéo n'est pas disponible sur ce navigateur. Utilise l'image.");
    setBusy(true);
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start();
    const t0 = performance.now(), COUNT = 1800, HOLD = 2200;
    await new Promise<void>((resolve) => {
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / COUNT);
        render(1 - Math.pow(1 - k, 3));
        if (t - t0 < COUNT + HOLD) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    rec.stop(); await done; render(1); setBusy(false);
    save(new Blob(chunks, { type: mime.split(";")[0] }), `econom-${style}-${format}.${mime.includes("mp4") ? "mp4" : "webm"}`);
    flash("Vidéo enregistrée.");
  }

  const enc = encodeURIComponent(`${text} ${data.link}`);
  const apps: [string, string][] = [["WhatsApp", `https://wa.me/?text=${enc}`], ["SMS", `sms:?&body=${enc}`], ["Telegram", `https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(text)}`], ["E-mail", `mailto:?subject=${encodeURIComponent("Combien pourrais-tu économiser ?")}&body=${enc}`]];
  const f = FORMATS[format];
  return (
    <dialog ref={dialog} onClose={onClose} aria-label="Créer ma carte d'économies" className="m-auto w-full max-w-lg rounded-[1.75rem] bg-bg p-0 text-ink backdrop:bg-black/60 max-h-[94vh] overflow-y-auto">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-black">Ma carte d&apos;économies</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Fermer" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2"><IconX /></button>
        </div>
        <div className="grid place-items-center rounded-2xl bg-surface-2 p-3">
          <canvas ref={canvas} role="img" aria-label={`Aperçu de la carte : ${text}`} className="max-h-[46vh] w-auto max-w-full rounded-xl shadow-xl" style={{ aspectRatio: `${f.w} / ${f.h}` }} />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold">Style</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(STYLES) as StyleKey[]).map((k) => (
              <button key={k} type="button" disabled={k === "beforeafter" && !canBA} aria-pressed={style === k} onClick={() => setStyle(k)} className={cx("min-h-11 rounded-2xl border-2 px-2 text-xs font-extrabold disabled:opacity-40", style === k ? "border-brand bg-surface" : "border-line")}>{STYLES[k]}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold">Format</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(FORMATS) as FormatKey[]).map((k) => (
              <button key={k} type="button" aria-pressed={format === k} onClick={() => setFormat(k)} className={cx("min-h-11 rounded-2xl border-2 px-1 text-xs font-bold", format === k ? "border-brand bg-surface" : "border-line")}>{FORMATS[k].label}</button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={nativeShare} variant="accent" className="col-span-2"><IconShare width={18} height={18} /> Partager</Button>
          <Button onClick={download} variant="outline">Télécharger l&apos;image</Button>
          <Button onClick={video} variant="outline" disabled={busy}>{busy ? "Enregistrement…" : "Vidéo animée"}</Button>
          <Button onClick={copyLink} variant="ghost" className="col-span-2">Copier le lien</Button>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          {apps.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackClient("share_sheet_opened", { from: "card", app: label })} className="rounded-full bg-surface-2 px-3 py-2 font-bold hover:bg-brand hover:text-on-brand">{label}</a>)}
        </div>
        <p className="break-all rounded-xl bg-surface-2 p-2 text-center text-xs text-muted select-all">{data.link}</p>
        <p aria-live="polite" className="min-h-5 text-center text-sm font-bold text-positive">{msg}</p>
        <Notice>La carte n&apos;affiche que des montants : ni ton nom, ni ton opérateur, ni ton contrat. Pour Instagram ou TikTok, télécharge l&apos;image ou la vidéo puis ajoute-la à ta publication.</Notice>
      </div>
    </dialog>
  );
}

/** Bouton « Faire économiser un proche » : partage du lien personnel (ou du lien de diagnostic sans compte). */
export function InviteButton({ link, label = "Faire économiser un proche", variant = "outline" as "outline" | "light" | "primary", full = false }: { link: string; label?: string; variant?: "outline" | "light" | "primary"; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function go() {
    const text = "Je viens de vérifier ce que je paie avec ECONOM. Fais le test, c'est gratuit et sans inscription :";
    if (navigator.share) {
      trackClient("share_sheet_opened", { from: "invite" });
      try { await navigator.share({ text, url: link }); trackClient("share_completed", { from: "invite" }); } catch {}
      return;
    }
    try { await navigator.clipboard.writeText(link); trackClient("share_link_copied", { from: "invite" }); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }
  return <Button type="button" variant={variant} full={full} onClick={go} aria-live="polite">{copied ? "Lien copié !" : label}</Button>;
}
