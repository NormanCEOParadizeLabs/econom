import type { Metadata } from "next";
import { Badge, Card, LinkButton, Notice } from "@/components/ui";
import { Symbol } from "@/components/logo";
import { IconBell, IconBolt, IconPhone, IconScan, IconShare, IconShield } from "@/components/icons";

export const metadata: Metadata = {
  title: "L'application",
  description: "Installe ECONOM. sur ton téléphone en moins d'une minute, sans passer par un magasin d'applications : la marche à suivre sur iPhone (Safari) et sur Android (Chrome).",
  alternates: { canonical: "/application" },
};

const IOS = [
  "Ouvre ce site dans Safari.",
  "Touche le bouton Partager (le carré avec une flèche vers le haut).",
  "Fais défiler et choisis « Sur l'écran d'accueil ».",
  "Touche « Ajouter » : l'icône ECONOM. apparaît avec tes autres applis.",
];
const ANDROID = [
  "Ouvre ce site dans Chrome.",
  "Touche le menu ⋮ en haut à droite.",
  "Choisis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).",
  "Confirme avec « Installer » : l'icône ECONOM. rejoint tes applis.",
];

const PERKS = [
  { icon: IconBolt, t: "Rapide à ouvrir", d: "Une icône sur ton écran d'accueil, un affichage plein écran, sans barre d'adresse." },
  { icon: IconScan, t: "Le scanner sous le pouce", d: "Prends ta facture en photo directement depuis l'appli. L'accès à l'appareil photo n'est demandé qu'à ce moment-là." },
  { icon: IconPhone, t: "Légère", d: "Pas de téléchargement lourd, pas de mise à jour à lancer : tu as toujours la dernière version." },
  { icon: IconShield, t: "Mêmes garanties", d: "Même compte, mêmes données, mêmes règles de confidentialité que sur le site." },
];

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="mt-5 space-y-3">
      {items.map((t, i) => (
        <li key={t} className="flex gap-3">
          <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-base font-black text-on-brand">{i + 1}</span>
          <span className="pt-1 leading-relaxed">{t}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Application() {
  return (
    <>
      <section className="on-hero relative overflow-hidden bg-hero text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_.8fr] md:items-center md:py-20">
          <div className="stagger">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-bold">
              <IconPhone width={16} height={16} className="text-accent" /> Application web installable
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.3rem,7.5vw,4.2rem)] font-black leading-[0.98]">
              ECONOM. dans ta poche, <span className="inline-block -rotate-1 rounded-2xl bg-accent px-3 text-on-accent">en une minute.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90">
              ECONOM. s&apos;installe directement depuis ton navigateur. Pas de magasin d&apos;applications, pas de gros téléchargement : tu ajoutes l&apos;icône à ton écran d&apos;accueil et c&apos;est prêt.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="#iphone" variant="accent" size="lg">Installer sur iPhone</LinkButton>
              <LinkButton href="#android" variant="light" size="lg">Installer sur Android</LinkButton>
            </div>
          </div>
          <div className="animate-pop mx-auto w-full max-w-[15rem]">
            <div className="rotate-2 rounded-[2.5rem] border-4 border-white/20 bg-[#171529] p-5 shadow-2xl shadow-black/30">
              <div className="grid grid-cols-3 gap-3">
                <Symbol className="h-14 w-14 rounded-[1rem] shadow-lg" />
                {Array.from({ length: 8 }, (_, i) => <span key={i} aria-hidden className="h-14 w-14 rounded-[1rem] bg-white/10" />)}
              </div>
              <p className="mt-4 text-center text-xs text-white/60">Ton écran d&apos;accueil, avec ECONOM.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-2">
          <Card as="article" id="iphone" className="scroll-mt-28 p-7">
            <Badge tone="brand">iPhone et iPad</Badge>
            <h2 className="mt-3 font-display text-2xl font-black">Avec Safari</h2>
            <p className="mt-1 text-muted">Safari &gt; Partager &gt; Sur l&apos;écran d&apos;accueil</p>
            <Steps items={IOS} />
            <p className="mt-5 flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm text-muted">
              <IconShare width={18} height={18} className="mt-0.5 shrink-0 text-brand-strong" />
              Sur iPhone, l&apos;installation se fait le plus simplement depuis Safari. Si tu utilises un autre navigateur, cherche « Sur l&apos;écran d&apos;accueil » dans son menu de partage.
            </p>
          </Card>
          <Card as="article" id="android" className="scroll-mt-28 p-7">
            <Badge tone="brand">Android</Badge>
            <h2 className="mt-3 font-display text-2xl font-black">Avec Chrome</h2>
            <p className="mt-1 text-muted">Chrome &gt; Menu ⋮ &gt; Installer l&apos;application</p>
            <Steps items={ANDROID} />
            <p className="mt-5 flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm text-muted">
              <IconBell width={18} height={18} className="mt-0.5 shrink-0 text-brand-strong" />
              Chrome peut aussi afficher de lui-même une proposition d&apos;installation en bas de l&apos;écran : tu peux l&apos;accepter directement.
            </p>
          </Card>
        </div>
        <Notice className="mt-6">
          <strong>Sur ordinateur aussi :</strong> dans Chrome ou Edge, une icône d&apos;installation apparaît à droite de la barre d&apos;adresse. Et bien sûr, ECONOM. fonctionne sans rien installer, dans n&apos;importe quel navigateur récent.
        </Notice>
      </section>

      <section className="bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="max-w-2xl font-display text-3xl font-black md:text-4xl">Ce que ça change au quotidien</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((p) => (
              <Card as="article" key={p.t}>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-on-brand"><p.icon /></div>
                <h3 className="mt-4 font-display text-xl font-extrabold">{p.t}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{p.d}</p>
              </Card>
            ))}
          </ul>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-line bg-surface p-6">
              <h3 className="font-display text-xl font-extrabold">Et sans connexion ?</h3>
              <p className="mt-2 leading-relaxed text-muted">L&apos;appli s&apos;ouvre et t&apos;indique que tu es hors ligne. La comparaison, l&apos;analyse de facture et l&apos;assistant ont besoin d&apos;internet : ils reprennent dès que le réseau revient.</p>
            </div>
            <div className="rounded-[1.5rem] border border-line bg-surface p-6">
              <h3 className="font-display text-xl font-extrabold">Comment la désinstaller ?</h3>
              <p className="mt-2 leading-relaxed text-muted">Comme n&apos;importe quelle appli : appui long sur l&apos;icône, puis « Supprimer » ou « Désinstaller ». Ton compte et tes données ne sont pas effacés ; pour ça, passe par « Mon compte ».</p>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/inscription" size="lg">Créer mon compte gratuit</LinkButton>
            <LinkButton href="/comment-ca-marche" variant="outline" size="lg">Voir comment ça marche</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
