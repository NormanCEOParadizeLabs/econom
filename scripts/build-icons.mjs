// Exporte les PNG (icônes PWA, apple-touch, image de partage) depuis les SVG de marque.
// Usage : node scripts/build-icons.mjs   (nécessite Playwright + Chromium)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }
const brand = path.resolve("public/brand");
const read = (f) => fs.readFileSync(path.join(brand, f), "utf8");
const b = await chromium.launch();
async function shot(html, w, h, out) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden">${html}</body>`);
  await p.screenshot({ path: out, omitBackground: true });
  await p.close();
}
const full = (svg) => `<div style="width:100%;height:100%">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div>`;
await shot(full(read("econom-icon.svg")), 192, 192, "public/icons/icon-192.png");
await shot(full(read("econom-icon.svg")), 512, 512, "public/icons/icon-512.png");
await shot(full(read("econom-icon-maskable.svg")), 512, 512, "public/icons/maskable-512.png");
await shot(full(read("econom-icon-maskable.svg").replace('scale(.75)', 'scale(.75)')), 180, 180, "public/icons/apple-touch-icon.png");
await shot(`<div style="width:1200px;height:630px;background:#5638F5;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;font-family:Arial,sans-serif">
  <div style="width:640px">${read("econom-wordmark-on-violet.svg")}</div>
  <div style="color:#F8F8F2;font-size:54px;font-weight:800;margin-top:48px;letter-spacing:-1px">Ton argent. <span style="background:#D8FF55;color:#171529;padding:2px 14px;border-radius:12px">Tes règles.</span></div>
  <div style="color:#F8F8F2;opacity:.85;font-size:28px;margin-top:26px">Compare tes forfaits, repère les abonnements trop chers, garde plus chaque mois.</div></div>`, 1200, 630, "public/og.png");
await b.close();
console.log("icônes générées");
