import type { Metadata } from "next";
import { Badge, Button, Card, Notice } from "@/components/ui";
import { PageHero } from "@/components/content";
import { Symbol, Wordmark } from "@/components/logo";
import { IconCheck, IconX } from "@/components/icons";

export const metadata: Metadata = {
  title: "Marque",
  description: "L'identité d'ECONOM. : les trois directions VOLT, MINT CLUB et SIGNAL, leurs palettes, la typographie, les règles d'usage du logo et les fichiers SVG à télécharger.",
  alternates: { canonical: "/marque" },
};

type Swatch = { name: string; hex: string; role: string; dark?: boolean };
type Direction = { theme: "volt" | "mint" | "signal"; name: string; tag: string; pitch: string; swatches: Swatch[] };

const DIRECTIONS: Direction[] = [
  {
    theme: "volt",
    name: "VOLT",
    tag: "Direction de référence",
    pitch: "Électrique et franc. Un violet qui affirme, un lime qui signale l'économie. C'est l'identité utilisée par défaut sur le site et dans l'application.",
    swatches: [
      { name: "Violet", hex: "#5638F5", role: "Marque, actions", dark: true },
      { name: "Lime", hex: "#D8FF55", role: "Accent, économies" },
      { name: "Ivoire", hex: "#F8F8F2", role: "Fond" },
      { name: "Anthracite", hex: "#171529", role: "Texte", dark: true },
    ],
  },
  {
    theme: "mint",
    name: "MINT CLUB",
    tag: "Alternative",
    pitch: "Calme et rassurant. Un vert profond et une menthe douce, pour un ton plus posé, proche de l'univers de l'épargne.",
    swatches: [
      { name: "Vert profond", hex: "#0B6B55", role: "Marque, actions", dark: true },
      { name: "Menthe", hex: "#A8F5C9", role: "Accent, économies" },
      { name: "Crème", hex: "#F7F3E8", role: "Fond" },
      { name: "Sapin", hex: "#0E2F28", role: "Texte", dark: true },
    ],
  },
  {
    theme: "signal",
    name: "SIGNAL",
    tag: "Alternative",
    pitch: "Net et énergique. Un bleu vif et un corail chaleureux, pour un ton plus direct, proche de l'univers des télécoms.",
    swatches: [
      { name: "Bleu signal", hex: "#0B3DFF", role: "Marque, actions", dark: true },
      { name: "Corail", hex: "#FF8A5C", role: "Accent, économies" },
      { name: "Pêche claire", hex: "#FFF7F0", role: "Fond" },
      { name: "Bleu nuit", hex: "#0A1440", role: "Texte", dark: true },
    ],
  },
];

const FILES = [
  ["econom-wordmark.svg", "Logotype — VOLT, sur fond clair"],
  ["econom-wordmark-on-dark.svg", "Logotype — sur fond sombre"],
  ["econom-wordmark-on-violet.svg", "Logotype — sur fond violet"],
  ["econom-wordmark-mono.svg", "Logotype — monochrome"],
  ["econom-wordmark-mint.svg", "Logotype — MINT CLUB"],
  ["econom-wordmark-signal.svg", "Logotype — SIGNAL"],
  ["econom-symbol.svg", "Symbole seul"],
  ["econom-icon.svg", "Icône d'application"],
  ["econom-icon-dark.svg", "Icône d'application — version sombre"],
  ["econom-icon-maskable.svg", "Icône d'application — version adaptative (maskable)"],
];

const DO = [
  "Utiliser les fichiers fournis, sans les redessiner.",
  "Toujours conserver le point final : il fait partie du nom.",
  "Placer le logotype sur un fond uni : ivoire, blanc, anthracite ou violet de marque.",
  "Respecter la zone de protection et les tailles minimales.",
];
const DONT = [
  "Déformer, incliner, détourer ou ajouter une ombre.",
  "Changer les couleurs ou mélanger deux directions.",
  "Poser le logotype sur une photo chargée ou un dégradé.",
  "Écrire le nom sans majuscules ou sans point dans un titre.",
];

function DirectionBlock({ d }: { d: Direction }) {
  return (
    <div data-theme={d.theme} className="overflow-hidden rounded-[2rem] border border-line bg-bg text-ink">
      <div className="grid gap-8 p-6 md:grid-cols-2 md:p-10">
        <div>
          <Badge tone="brand">{d.tag}</Badge>
          <h2 className="mt-3 font-display text-4xl font-black">{d.name}</h2>
          <p className="mt-2 leading-relaxed text-muted">{d.pitch}</p>

          <h3 className="mt-7 text-xs font-bold uppercase tracking-wider text-muted">Logotype</h3>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="grid h-28 place-items-center rounded-2xl border border-line bg-surface p-4"><Wordmark className="h-7 w-auto max-w-full" /></div>
            <div className="grid h-28 place-items-center rounded-2xl bg-ink p-4"><Wordmark tone="light" className="h-7 w-auto max-w-full" /></div>
            <div className="flex h-28 items-center justify-center gap-4 rounded-2xl border border-line bg-surface p-4">
              <Symbol className="h-16 w-16" />
              <Symbol className="h-10 w-10" />
            </div>
            <div className="grid h-28 place-items-center rounded-2xl bg-surface-2 p-4"><Symbol boxed={false} className="h-16 w-16" /></div>
          </div>

          <h3 className="mt-7 text-xs font-bold uppercase tracking-wider text-muted">Palette</h3>
          <ul className="mt-2 grid grid-cols-2 gap-3">
            {d.swatches.map((s) => (
              <li key={s.hex} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="flex h-16 items-end p-2" style={{ backgroundColor: s.hex, color: s.dark ? "#FFFFFF" : "#171529" }}>
                  <span className="num text-sm font-black">{s.hex}</span>
                </div>
                <p className="px-3 py-2 text-sm"><span className="font-bold">{s.name}</span><br /><span className="text-muted">{s.role}</span></p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Typographie</h3>
          <div className="mt-2 rounded-2xl border border-line bg-surface p-5">
            <p className="font-display text-4xl font-black leading-none">Ton argent.<br /><span className="text-brand">Tes règles.</span></p>
            <p className="mt-2 text-xs text-muted">Archivo, graisse Black, chasse resserrée — titres</p>
            <p className="num mt-4 text-3xl font-black">0123456789&nbsp;€</p>
            <p className="mt-1 text-xs text-muted">Archivo, chiffres tabulaires — montants</p>
            <p className="mt-4 leading-relaxed">Compare le coût total, pas seulement le prix d&apos;appel. Chaque offre affiche sa source et sa date de vérification.</p>
            <p className="mt-1 text-xs text-muted">Manrope — texte courant</p>
          </div>

          <h3 className="mt-7 text-xs font-bold uppercase tracking-wider text-muted">Aperçu d&apos;interface</h3>
          <Card className="mt-2 shadow-xl shadow-brand/10">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-lg font-extrabold">Offre d&apos;exemple</p>
              <Badge tone="accent">Exemple fictif</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">Carte de résultat du comparateur, avec des montants inventés.</p>
            <div className="mt-4 rounded-2xl bg-accent p-4 text-on-accent">
              <p className="text-xs font-bold">Économie nette sur 12 mois</p>
              <p className="num text-4xl font-black">80,00&nbsp;€</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button">Voir le détail</Button>
              <Button type="button" variant="outline">Comparer</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Marque() {
  return (
    <>
      <PageHero badge="Marque" title="Une marque qui parle clair, jusqu'au point final.">
        ECONOM. s&apos;écrit en capitales, avec un point. Trois directions de couleur ont été dessinées ; VOLT est celle de référence.
      </PageHero>

      <section className="mx-auto max-w-6xl space-y-8 px-4 py-14">
        {DIRECTIONS.map((d) => <DirectionBlock key={d.theme} d={d} />)}
        <p className="text-sm text-muted">Les trois directions partagent le même logotype, la même typographie et la même grille : seules les couleurs changent. Une direction s&apos;utilise seule, sans emprunt aux deux autres.</p>
      </section>

      <section className="bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-black md:text-4xl">Usages du logo</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="font-display text-xl font-extrabold">Zone de protection</h3>
              <p className="mt-1.5 leading-relaxed text-muted">Laisse autour du logotype un espace vide au moins égal à la hauteur du point final. Aucun texte, aucun bord, aucune image dans cette zone.</p>
              <div className="mt-4 grid place-items-center rounded-2xl bg-bg p-4">
                <div className="border-2 border-dashed border-brand/50 p-5">
                  <Wordmark className="h-8 w-auto" />
                </div>
              </div>
            </Card>
            <Card>
              <h3 className="font-display text-xl font-extrabold">Tailles minimales</h3>
              <p className="mt-1.5 leading-relaxed text-muted">En dessous de ces tailles, le point n&apos;est plus lisible : utilise le symbole seul.</p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-center justify-between gap-4 rounded-2xl bg-bg p-3"><Wordmark className="h-4 w-auto" /><span className="text-sm">Logotype : 16 px de haut à l&apos;écran, 5 mm à l&apos;impression</span></li>
                <li className="flex items-center justify-between gap-4 rounded-2xl bg-bg p-3"><Symbol className="h-6 w-6" /><span className="text-sm">Symbole : 24 px à l&apos;écran, 8 mm à l&apos;impression</span></li>
              </ul>
            </Card>
            <Card>
              <h3 className="font-display text-xl font-extrabold">Icône d&apos;application</h3>
              <p className="mt-1.5 leading-relaxed text-muted">L&apos;icône reprend le symbole sur un carré aux coins arrondis, à la couleur de marque. Ne la recadre pas : utilise la version « maskable » quand le système applique sa propre forme (rond, goutte, carré arrondi).</p>
              <div className="mt-4 flex items-end gap-4 rounded-2xl bg-bg p-4">
                <Symbol className="h-20 w-20" />
                <Symbol className="h-14 w-14" />
                <Symbol className="h-10 w-10" />
                <Symbol className="h-7 w-7" />
              </div>
            </Card>
            <Card>
              <h3 className="font-display text-xl font-extrabold">Fonds autorisés</h3>
              <p className="mt-1.5 leading-relaxed text-muted">Fonds unis uniquement. Version sombre du logotype sur les fonds clairs, version claire sur anthracite ou sur la couleur de marque.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="grid h-16 place-items-center rounded-2xl border border-line bg-[#F8F8F2]" data-theme="volt"><Wordmark className="h-5 w-auto" /></div>
                <div className="grid h-16 place-items-center rounded-2xl border border-line bg-white" data-theme="volt"><Wordmark className="h-5 w-auto" /></div>
                <div className="grid h-16 place-items-center rounded-2xl bg-[#171529]" data-theme="volt"><Wordmark tone="light" className="h-5 w-auto" /></div>
                <div className="grid h-16 place-items-center rounded-2xl bg-[#5638F5]" data-theme="volt"><Wordmark tone="light" className="h-5 w-auto" /></div>
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="font-display text-xl font-extrabold">À faire</h3>
              <ul className="mt-3 space-y-2">
                {DO.map((t) => <li key={t} className="flex gap-3"><IconCheck width={20} height={20} className="mt-0.5 shrink-0 text-positive" /><span>{t}</span></li>)}
              </ul>
            </Card>
            <Card>
              <h3 className="font-display text-xl font-extrabold">À éviter</h3>
              <ul className="mt-3 space-y-2">
                {DONT.map((t) => <li key={t} className="flex gap-3"><IconX width={20} height={20} className="mt-0.5 shrink-0 text-danger" /><span>{t}</span></li>)}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-3xl font-black md:text-4xl">Télécharger les fichiers</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">Tous les fichiers sont au format SVG : ils s&apos;agrandissent sans perte de qualité.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {FILES.map(([file, label]) => (
            <li key={file}>
              <a href={`/brand/${file}`} download className="pressable flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-brand">
                <span><span className="block font-bold">{label}</span><span className="text-sm text-muted">{file}</span></span>
                <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-bold text-brand-strong">SVG</span>
              </a>
            </li>
          ))}
        </ul>

        <Notice tone="warn" title="Avant tout usage commercial" className="mt-8">
          Le nom « ECONOM. » et le logotype doivent faire l&apos;objet d&apos;une recherche d&apos;antériorité auprès de l&apos;INPI (France) et de l&apos;EUIPO (Union européenne) avant tout usage commercial, puis d&apos;un dépôt de marque. Tant que cette vérification n&apos;est pas faite, ces éléments sont des propositions de travail et ne doivent pas être considérés comme une marque enregistrée.
        </Notice>
      </section>
    </>
  );
}
