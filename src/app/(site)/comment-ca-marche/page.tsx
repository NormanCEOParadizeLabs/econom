import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, LinkButton, Notice } from "@/components/ui";
import { PageHero } from "@/components/content";
import { IconChat, IconCheck, IconCompare, IconPiggy, IconPin, IconRepeat, IconScan, IconShield } from "@/components/icons";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description: "Scanner une facture, comparer le coût total sur 12 ou 24 mois, suivre ses abonnements et ses économies : le fonctionnement d'ECONOM. et la méthode de classement des offres, expliqués simplement.",
  alternates: { canonical: "/comment-ca-marche" },
};

const STEPS = [
  {
    icon: IconScan,
    title: "Tu nous dis ce que tu paies",
    text: "Tu saisis ton forfait à la main (fournisseur, prix, volume de données) ou tu prends ta facture en photo. Dans ce cas, une IA lit le document et pré-remplit les champs.",
    detail: "Tu relis toujours ce qui a été lu, et tu corriges si besoin. Le document n'est pas conservé : seuls les champs extraits le sont.",
  },
  {
    icon: IconCompare,
    title: "On calcule le coût complet",
    text: "Pour chaque offre compatible avec tes besoins, on additionne tout sur 12 ou 24 mois : mensualités, prix après la promotion, carte SIM ou frais de mise en service, frais de résiliation de ton offre actuelle.",
    detail: "Le calcul est fait par un moteur déterministe : mêmes données, même résultat. L'IA ne fixe jamais un prix.",
  },
  {
    icon: IconPiggy,
    title: "Tu vois ce qu'il te reste vraiment",
    text: "Les offres sont classées par économie nette : ce que tu paies aujourd'hui, moins ce que tu paierais avec la nouvelle offre, frais compris.",
    detail: "Si changer te coûte plus cher que rester, on l'affiche clairement. Ça arrive, et c'est une information utile.",
  },
  {
    icon: IconCheck,
    title: "Tu décides, à ton rythme",
    text: "ECONOM. ne souscrit rien à ta place. Tu changes d'offre sur le site du fournisseur, quand tu veux, ou tu ne changes pas.",
    detail: "Le site du fournisseur fait foi : vérifie toujours le prix et les conditions avant de valider.",
  },
  {
    icon: IconRepeat,
    title: "Tu suis ce qui se passe ensuite",
    text: "Tu ranges tes abonnements au même endroit, avec leurs échéances. Et tu suis chaque économie selon son état réel : potentielle, lancée, confirmée, puis constatée.",
    detail: "Une économie n'est comptée comme « constatée » que lorsque tu l'as vérifiée sur une vraie facture.",
  },
];

const SAVINGS = [
  ["Potentielle", "Le calcul montre que tu pourrais payer moins. Rien n'a encore changé."],
  ["Lancée", "Tu as indiqué avoir commencé la démarche (souscription, demande de résiliation…)."],
  ["Confirmée", "Tu as confirmé que le changement est fait."],
  ["Constatée", "Tu as vérifié le nouveau montant sur une facture ou un prélèvement réel."],
];

const CRITERIA = [
  {
    title: "Le critère de classement",
    text: "Par défaut, les offres sont classées par économie nette décroissante sur la durée choisie (12 ou 24 mois). L'économie nette, c'est le coût total de ton offre actuelle moins le coût total de l'offre comparée, tous frais connus inclus. Sans offre actuelle renseignée, le classement se fait du coût total le plus bas au plus élevé.",
  },
  {
    title: "Ce qui entre dans le coût total",
    text: "Le prix mensuel pendant la promotion, le prix après la promotion, les frais uniques (carte SIM, mise en service, activation), et les frais de résiliation de ton offre actuelle lorsque tu les indiques. Tous les prix sont en euros TTC.",
  },
  {
    title: "Les offres prises en compte",
    text: "Seules les offres de notre catalogue sont comparées. Chaque offre est contrôlée sur le site officiel du fournisseur ; sa source et sa date de vérification sont affichées. Le catalogue ne couvre pas tout le marché : il peut exister ailleurs une offre plus intéressante pour toi.",
  },
  {
    title: "Les liens commerciaux",
    text: "ECONOM. peut être rémunéré par certains fournisseurs lorsque tu souscris après un clic. Quand c'est le cas, l'offre porte une mention visible « Partenaire ». Cette rémunération ne modifie jamais l'ordre du classement, et aucune offre n'est mise en avant contre paiement. Une offre sans partenariat est classée exactement de la même façon.",
  },
  {
    title: "La mise à jour",
    text: "Les offres sont revérifiées régulièrement. La date de dernière vérification est indiquée sur chaque offre. Une offre dont la vérification est trop ancienne est retirée de l'affichage jusqu'à son prochain contrôle.",
  },
  {
    title: "Les limites à connaître",
    text: "Une économie affichée est une estimation, calculée à partir de ce que tu as saisi et des prix relevés à la date indiquée. Un fournisseur peut modifier son offre entre notre vérification et ta visite. L'éligibilité (fibre à ton adresse, couverture mobile) se vérifie sur le site du fournisseur.",
  },
];

export default function CommentCaMarche() {
  return (
    <>
      <PageHero badge="Mode d'emploi" title="Comment ça marche, concrètement.">
        Cinq étapes, zéro tour de magie. ECONOM. additionne ce que tu paies vraiment, compare avec des offres vérifiées, et te laisse décider.
      </PageHero>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className={i === STEPS.length - 1 ? "md:col-span-2" : undefined}>
              <Card as="article" className="h-full">
                <div className="flex items-center gap-3">
                  <span className="num text-5xl font-black text-brand">{i + 1}</span>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-on-brand"><s.icon /></span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-extrabold">{s.title}</h2>
                <p className="mt-2 leading-relaxed">{s.text}</p>
                <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed text-muted">{s.detail}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-surface-2">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center">
          <div>
            <Badge tone="accent">Le calcul</Badge>
            <h2 className="mt-3 font-display text-3xl font-black md:text-4xl">Une formule que tu peux refaire à la main.</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Pas de score mystère. L&apos;économie nette, c&apos;est une soustraction : ce que tu paierais en restant, moins ce que tu paierais en changeant. Le détail du calcul est affiché pour chaque offre.
            </p>
          </div>
          <Card>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Exemple fictif, pour illustrer la formule</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt>Offre actuelle : 20,00 € × 12 mois</dt><dd className="num font-black">240,00 €</dd></div>
              <div className="flex justify-between gap-4"><dt>Nouvelle offre : 10,00 € × 6 mois de promotion</dt><dd className="num font-black">60,00 €</dd></div>
              <div className="flex justify-between gap-4"><dt>Puis 15,00 € × 6 mois après la promotion</dt><dd className="num font-black">90,00 €</dd></div>
              <div className="flex justify-between gap-4"><dt>Frais uniques (carte SIM)</dt><dd className="num font-black">10,00 €</dd></div>
            </dl>
            <div className="mt-4 rounded-2xl bg-accent p-4 text-on-accent">
              <p className="text-xs font-bold">Économie nette sur 12 mois</p>
              <p className="num text-4xl font-black">80,00&nbsp;€</p>
              <p className="mt-1 text-xs">240 − (60 + 90 + 10)</p>
            </div>
            <p className="mt-3 text-xs text-muted">Montants inventés pour montrer le mode de calcul, sans lien avec une offre réelle. Tes résultats dépendent de ta situation.</p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="max-w-2xl font-display text-3xl font-black md:text-4xl">Quatre états pour une économie. Pas un de plus.</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">On ne mélange pas ce qui est possible et ce qui est réel. Ton tableau de bord range chaque euro dans la bonne case.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SAVINGS.map(([t, d], i) => (
            <li key={t} className="rounded-[1.5rem] border border-line p-5">
              <p className="num text-4xl font-black text-brand">{i + 1}</p>
              <h3 className="mt-1 font-display text-xl font-extrabold">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="classement" className="scroll-mt-24 bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <Badge tone="brand">Transparence</Badge>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-black md:text-4xl">Comment on classe les offres</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            Un comparateur doit expliquer comment il fonctionne : c&apos;est prévu par le Code de la consommation (articles L111-7 et D111-10 et suivants). Voici nos règles, sans astérisque.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {CRITERIA.map((c) => (
              <Card as="article" key={c.title}>
                <h3 className="font-display text-xl font-extrabold">{c.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{c.text}</p>
              </Card>
            ))}
          </div>
          <Notice className="mt-6 bg-surface">
            <strong>En résumé :</strong> classement par économie nette, partenariats toujours signalés et sans effet sur l&apos;ordre, catalogue non exhaustif, dates de vérification affichées. Le détail figure aussi dans nos <Link href="/cgu" className="font-bold underline underline-offset-4">conditions d&apos;utilisation</Link>.
          </Notice>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: IconChat, t: "Un assistant pour comprendre", d: "Il explique une ligne de facture ou une étape de résiliation en s'appuyant sur le catalogue vérifié. Il n'invente pas de tarif." },
            { icon: IconPin, t: "Des bons plans près de toi", d: "Des offres locales, chacune avec sa source et sa date. Sans source, pas de publication." },
            { icon: IconShield, t: "Des données sous contrôle", d: "Pas de traceur publicitaire. Tu peux exporter ou supprimer tes données depuis ton compte." },
          ].map((b) => (
            <div key={b.t} className="rounded-[1.5rem] border border-line p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-brand-strong"><b.icon /></span>
              <h3 className="mt-3 font-display text-xl font-extrabold">{b.t}</h3>
              <p className="mt-1.5 leading-relaxed text-muted">{b.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start gap-6 rounded-[2rem] bg-[#171529] p-8 text-[#F8F8F2] md:flex-row md:items-center md:p-12">
          <div className="flex-1">
            <h2 className="font-display text-3xl font-black">Essaie avec ton forfait actuel.</h2>
            <p className="mt-2 max-w-xl text-white/75">Le comparateur fonctionne sans compte. Deux minutes suffisent pour voir si ça vaut le coup de changer.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            <LinkButton href="/comparateur/mobile" variant="accent" size="lg">Comparer mon forfait</LinkButton>
            <LinkButton href="/inscription" variant="light" size="lg">Créer mon compte gratuit</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
