import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, LinkButton, Notice } from "@/components/ui";
import { Faq, PageHero } from "@/components/content";
import { IconCheck, IconX } from "@/components/icons";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "ECONOM. est gratuit pour comparer et commencer. ECONOM. Plus : 4,99 € TTC par mois ou 39,99 € TTC par an, sans engagement, résiliable en ligne à tout moment.",
  alternates: { canonical: "/tarifs" },
};

const FREE = [
  "Comparateur manuel illimité (mobile et box)",
  "3 analyses de facture par IA chaque mois",
  "1 abonnement suivi",
  "Bons plans locaux sourcés",
  "Tableau de bord de tes économies",
];
const PLUS = [
  "Tout ce qui est dans Gratuit",
  "20 analyses de facture par IA chaque mois",
  "Abonnements suivis sans limite",
  "Historique complet",
  "Alertes avant les échéances et fins de promotion",
  "Assistant IA avec un quota plus élevé",
  "Rapports de tes dépenses récurrentes",
];

type Cell = string | boolean;
const ROWS: [string, Cell, Cell][] = [
  ["Comparateur manuel mobile et box", "Illimité", "Illimité"],
  ["Coût total sur 12 ou 24 mois, sources et dates", true, true],
  ["Analyses de facture par IA", "3 par mois", "20 par mois"],
  ["Abonnements suivis", "1", "Illimités"],
  ["Bons plans locaux", true, true],
  ["Tableau de bord des économies", true, true],
  ["Assistant IA", "Quota de base", "Quota supérieur"],
  ["Historique complet", false, true],
  ["Alertes d'échéance", false, true],
  ["Rapports", false, true],
];

function CellView({ v }: { v: Cell }) {
  if (v === true) return <><IconCheck width={20} height={20} className="inline text-positive" /><span className="sr-only">Inclus</span></>;
  if (v === false) return <><IconX width={18} height={18} className="inline text-muted" /><span className="sr-only">Non inclus</span></>;
  return <>{v}</>;
}

export default function Tarifs() {
  return (
    <>
      <PageHero badge="Tarifs" title="Gratuit pour comparer. Plus pour tout piloter.">
        Les informations essentielles pour changer de forfait restent gratuites : coût total, classement, sources. ECONOM. Plus ajoute du confort, pas un péage.
      </PageHero>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-2">
          <Card as="article" className="flex flex-col p-7">
            <h2 className="font-display text-2xl font-black">Gratuit</h2>
            <p className="mt-1 text-muted">Pour comparer et faire le point.</p>
            <p className="mt-5"><span className="num text-6xl font-black">0&nbsp;€</span></p>
            <p className="text-sm text-muted">Sans carte bancaire, sans limite de durée.</p>
            <ul className="mt-6 flex-1 space-y-3">
              {FREE.map((t) => (
                <li key={t} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-brand-strong"><IconCheck width={14} height={14} /></span><span>{t}</span></li>
              ))}
            </ul>
            <LinkButton href="/inscription" variant="outline" size="lg" full className="mt-7">Créer mon compte gratuit</LinkButton>
          </Card>

          <Card as="article" className="relative flex flex-col border-2 border-brand p-7 shadow-xl shadow-brand/10">
            <Badge tone="accent" className="absolute -top-3 right-6">Sans engagement</Badge>
            <h2 className="font-display text-2xl font-black">ECONOM. Plus</h2>
            <p className="mt-1 text-muted">Pour suivre tous tes contrats, toute l&apos;année.</p>
            <p className="mt-5"><span className="num text-6xl font-black text-brand-strong">4,99&nbsp;€</span> <span className="font-bold">TTC / mois</span></p>
            <p className="text-sm text-muted">ou <strong className="text-ink">39,99&nbsp;€ TTC par an</strong>, payés en une fois.</p>
            <ul className="mt-6 flex-1 space-y-3">
              {PLUS.map((t) => (
                <li key={t} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-on-accent"><IconCheck width={14} height={14} /></span><span>{t}</span></li>
              ))}
            </ul>
            <LinkButton href="/app/premium" size="lg" full className="mt-7">Passer à ECONOM. Plus</LinkButton>
            <p className="mt-3 text-center text-xs text-muted">Paiement sécurisé par Stripe. Résiliation en ligne depuis « Mon compte », à tout moment.</p>
          </Card>
        </div>

        <Notice className="mt-6">
          <strong>Ce qui ne sera jamais payant :</strong> voir le coût total d&apos;une offre, le classement par économie nette, la source et la date de vérification, et les étapes pour changer d&apos;opérateur. Tu n&apos;as pas besoin de payer pour prendre une bonne décision.
        </Notice>
      </section>

      <section className="bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-black md:text-4xl">Le détail, ligne par ligne</h2>
          <div tabIndex={0} role="region" aria-label="Tableau comparatif des formules" className="mt-6 overflow-x-auto rounded-[1.5rem] border border-line bg-surface">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Comparaison des formules Gratuit et ECONOM. Plus</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="p-4 font-bold">Fonctionnalité</th>
                  <th scope="col" className="p-4 font-display text-base font-extrabold">Gratuit</th>
                  <th scope="col" className="p-4 font-display text-base font-extrabold text-brand-strong">ECONOM. Plus</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, free, plus]) => (
                  <tr key={label} className="border-b border-line last:border-0">
                    <th scope="row" className="p-4 font-semibold">{label}</th>
                    <td className="p-4"><CellView v={free} /></td>
                    <td className="p-4 font-semibold"><CellView v={plus} /></td>
                  </tr>
                ))}
                <tr className="bg-surface-2/60">
                  <th scope="row" className="p-4 font-semibold">Prix</th>
                  <td className="num p-4 text-lg font-black">0 €</td>
                  <td className="p-4"><span className="num text-lg font-black">4,99 €</span> TTC / mois<br /><span className="num text-lg font-black">39,99 €</span> TTC / an</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">Les quotas d&apos;analyses et d&apos;assistant sont remis à zéro chaque mois. Les quotas non utilisés ne sont pas reportés.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="font-display text-3xl font-black md:text-4xl">Questions sur les tarifs</h2>
        <div className="mt-6 space-y-3">
          <Faq q="Est-ce que la version gratuite est vraiment gratuite ?">
            <p>Oui. Pas de carte bancaire à l&apos;inscription, pas de période d&apos;essai qui se transforme en abonnement. Tu peux rester sur la formule gratuite aussi longtemps que tu veux.</p>
          </Faq>
          <Faq q="Y a-t-il un engagement avec ECONOM. Plus ?">
            <p>Non. L&apos;abonnement mensuel se renouvelle chaque mois, l&apos;abonnement annuel chaque année, jusqu&apos;à ce que tu résilies. Tu peux résilier à tout moment.</p>
          </Faq>
          <Faq q="Comment résilier ?">
            <p>Depuis « Mon compte », rubrique abonnement : un bouton ouvre le portail de gestion Stripe, où tu résilies en quelques clics. Pas d&apos;appel, pas de courrier. Tu gardes l&apos;accès à Plus jusqu&apos;à la fin de la période déjà payée, puis ton compte repasse en formule gratuite.</p>
          </Faq>
          <Faq q="Que deviennent mes données si je repasse en gratuit ?">
            <p>Rien n&apos;est supprimé. Tes abonnements et ton historique sont conservés ; certaines fonctions (ajout de nouveaux abonnements au-delà de la limite, historique complet, alertes) redeviennent simplement réservées à Plus.</p>
          </Faq>
          <Faq q="Quels moyens de paiement sont acceptés ?">
            <p>Le paiement passe par Stripe, par carte bancaire. ECONOM. ne voit jamais et ne stocke jamais ton numéro de carte.</p>
          </Faq>
          <Faq q="Puis-je me rétracter après avoir souscrit ?">
            <p>Tu disposes en principe d&apos;un délai légal de rétractation de 14 jours. Comme l&apos;accès à Plus démarre tout de suite, on te demande ton accord exprès au moment de payer. Le détail est expliqué dans nos <Link href="/cgv" className="font-bold text-brand-strong underline underline-offset-4">conditions générales de vente</Link>.</p>
          </Faq>
          <Faq q="Peut-on obtenir Plus sans payer ?">
            <p>Oui, avec le parrainage : quand 3 personnes que tu as invitées deviennent actives, tu reçois 30 jours d&apos;ECONOM. Plus offerts. Les conditions sont détaillées dans ton espace.</p>
          </Faq>
          <Faq q="ECONOM. Plus me fait-il économiser plus ?">
            <p>On ne peut pas te le promettre. Plus te donne davantage d&apos;analyses, des alertes et un suivi complet ; l&apos;économie réelle dépend de tes contrats et de ce que tu décides de changer. Aucune économie n&apos;est garantie.</p>
          </Faq>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/inscription" size="lg">Commencer gratuitement</LinkButton>
          <LinkButton href="/app/premium" variant="outline" size="lg">Voir ECONOM. Plus dans l&apos;appli</LinkButton>
        </div>
      </section>
    </>
  );
}
