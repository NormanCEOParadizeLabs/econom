import type { Metadata } from "next";
import Link from "next/link";
import { Card, LinkButton, Notice } from "@/components/ui";
import { PageHero } from "@/components/content";
import { IconDoc, IconPhone, IconStar, IconTrash, IconWifi } from "@/components/icons";

export const metadata: Metadata = {
  title: "Centre d'aide",
  description: "Guides pratiques ECONOM. : changer d'opérateur mobile en gardant son numéro (RIO au 3179), résilier une box, lire sa facture, gérer son abonnement Plus, exporter ou supprimer ses données.",
  alternates: { canonical: "/aide" },
};

const GUIDES = [
  { id: "changer-operateur", icon: IconPhone, label: "Changer d'opérateur mobile en gardant son numéro" },
  { id: "resilier-box", icon: IconWifi, label: "Résilier une box internet" },
  { id: "lire-facture", icon: IconDoc, label: "Lire sa facture" },
  { id: "abonnement-plus", icon: IconStar, label: "Gérer mon abonnement Plus" },
  { id: "compte-donnees", icon: IconTrash, label: "Supprimer mon compte, exporter mes données" },
];

function Guide({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line py-10 first:border-0 first:pt-0">
      <h2 className="font-display text-2xl font-black md:text-3xl">{title}</h2>
      <p className="mt-2 leading-relaxed text-muted">{intro}</p>
      <div className="mt-5 space-y-4 leading-relaxed">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3">
          <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-base font-black text-on-brand">{i + 1}</span>
          <span className="pt-1">{t}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Aide() {
  return (
    <>
      <PageHero badge="Centre d'aide" title="Les démarches, pas à pas.">
        Des guides courts pour faire les choses dans le bon ordre, sans y passer ta soirée.
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 py-12 lg:grid lg:grid-cols-[18rem_1fr] lg:gap-12">
        <nav aria-label="Guides" className="mb-10 lg:mb-0">
          <ul className="grid gap-2 sm:grid-cols-2 lg:sticky lg:top-24 lg:grid-cols-1">
            {GUIDES.map((g) => (
              <li key={g.id}>
                <a href={`#${g.id}`} className="pressable flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-sm font-bold hover:border-brand">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-brand-strong"><g.icon width={20} height={20} /></span>
                  {g.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl">
          <Guide id="changer-operateur" title="Changer d'opérateur mobile en gardant son numéro" intro="Garder son numéro s'appelle la portabilité. C'est gratuit, et c'est ton nouvel opérateur qui fait presque tout.">
            <Steps items={[
              <>Appelle le <strong>3179</strong> depuis la ligne que tu veux garder. L&apos;appel est gratuit. Un serveur vocal te donne ton <strong>RIO</strong> (un code de 12 caractères) et la date de fin de ton engagement, puis te les confirme par SMS.</>,
              <>Souscris la nouvelle offre et indique ton RIO quand on te demande si tu veux conserver ton numéro.</>,
              <>Ne résilie rien toi-même. Le nouvel opérateur résilie l&apos;ancien contrat à ta place, le jour du transfert.</>,
              <>Le jour prévu, insère la nouvelle carte SIM (ou active l&apos;eSIM). Il peut y avoir une courte coupure pendant le transfert.</>,
            ]} />
            <Notice tone="warn" title="Le piège à éviter">
              Si tu résilies ta ligne avant d&apos;avoir demandé la portabilité, tu risques de perdre ton numéro. Demande toujours le RIO d&apos;abord.
            </Notice>
            <p className="text-muted">
              Le transfert se fait en général en quelques jours ouvrables, à une date que tu peux choisir. Si tu es encore engagé, des frais de résiliation peuvent t&apos;être facturés par l&apos;ancien opérateur : le 3179 te donne ta date de fin d&apos;engagement. Pour aller plus loin, lis notre article <Link href="/conseils/rio-changer-operateur-sans-perdre-son-numero" className="font-bold text-brand-strong underline underline-offset-4">RIO : changer d&apos;opérateur sans perdre son numéro</Link>.
            </p>
          </Guide>

          <Guide id="resilier-box" title="Résilier une box internet" intro="Deux situations : tu changes de fournisseur, ou tu arrêtes complètement.">
            <h3 className="font-display text-lg font-extrabold">Tu changes de fournisseur</h3>
            <Steps items={[
              <>Vérifie ta date de fin d&apos;engagement sur ta facture ou dans ton espace client.</>,
              <>Si tu veux garder ton numéro de téléphone fixe, appelle le <strong>3179</strong> depuis la ligne fixe de la box pour obtenir le RIO fixe, et donne-le au nouveau fournisseur : il se charge de la résiliation.</>,
              <>Sans numéro à conserver, attends que la nouvelle box fonctionne, puis résilie l&apos;ancienne pour éviter une coupure.</>,
            ]} />
            <h3 className="font-display text-lg font-extrabold">Tu arrêtes ton abonnement</h3>
            <Steps items={[
              <>Envoie ta demande de résiliation par le moyen prévu par ton fournisseur : espace client, formulaire en ligne ou lettre recommandée avec accusé de réception. Garde une preuve datée.</>,
              <>La résiliation prend effet au plus tard 10 jours après réception de ta demande. Tu peux demander une date plus lointaine.</>,
              <>Renvoie le matériel (box, décodeur, télécommande, câbles) selon les instructions reçues, et conserve la preuve de dépôt. Un matériel non rendu est facturé.</>,
              <>Vérifie ta dernière facture : frais de résiliation éventuels, mois entamé, remboursement d&apos;un trop-perçu.</>,
            ]} />
            <p className="text-muted">
              Des frais de résiliation et, si tu es encore engagé, les mensualités restantes peuvent t&apos;être facturés. Certains nouveaux fournisseurs en remboursent une partie : vérifie les conditions sur leur site. Dans le comparateur, tu peux saisir ces frais pour qu&apos;ils soient déduits de l&apos;économie affichée.
            </p>
          </Guide>

          <Guide id="lire-facture" title="Lire sa facture" intro="Une facture télécom contient toujours les mêmes informations. Voici où regarder.">
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ["Le nom exact de l'offre", "Il permet de retrouver ses conditions. Deux offres au nom proche peuvent avoir des prix différents."],
                ["Le prix de l'abonnement", "Le montant mensuel de base, TTC. C'est lui qu'on compare, pas le total à payer du mois."],
                ["Les remises et leur date de fin", "Une ligne « remise » ou « promotion » avec une échéance signifie que le prix va augmenter."],
                ["Les options", "Chaînes TV, assurance, stockage, appels internationaux : vérifie que tu les utilises encore."],
                ["Le hors-forfait", "Dépassements, appels spéciaux, achats facturés par l'opérateur. S'il revient chaque mois, ton forfait n'est plus adapté."],
                ["La date de fin d'engagement", "Elle doit figurer sur la facture. Après cette date, tu peux partir sans payer les mois restants."],
              ].map(([t, d]) => (
                <li key={t}>
                  <Card className="h-full">
                    <h3 className="font-display text-lg font-extrabold">{t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
                  </Card>
                </li>
              ))}
            </ul>
            <p className="text-muted">
              Avec le scanner d&apos;ECONOM., ces champs sont lus automatiquement à partir d&apos;une photo ou d&apos;un PDF. Tu vérifies, tu corriges si besoin, et la facture n&apos;est pas conservée.
            </p>
          </Guide>

          <Guide id="abonnement-plus" title="Gérer mon abonnement Plus" intro="Tout se fait en ligne, depuis « Mon compte ».">
            <Steps items={[
              <>Connecte-toi et ouvre <strong>Mon compte</strong>.</>,
              <>Dans la rubrique abonnement, touche <strong>Gérer mon abonnement</strong> : le portail sécurisé de Stripe s&apos;ouvre.</>,
              <>Tu peux y résilier, changer de carte bancaire, passer du mensuel à l&apos;annuel et télécharger tes factures.</>,
            ]} />
            <p className="text-muted">
              Après une résiliation, tu gardes ECONOM. Plus jusqu&apos;à la fin de la période déjà payée. Ton compte repasse ensuite en formule gratuite, sans suppression de données. Un paiement refusé ? Mets à jour ta carte dans le portail ; l&apos;accès Plus est rétabli dès que le paiement passe. Les règles complètes sont dans les <Link href="/cgv" className="font-bold text-brand-strong underline underline-offset-4">conditions générales de vente</Link>.
            </p>
          </Guide>

          <Guide id="compte-donnees" title="Supprimer mon compte, exporter mes données" intro="Tes données t'appartiennent : tu peux en obtenir une copie ou tout effacer.">
            <h3 className="font-display text-lg font-extrabold">Exporter</h3>
            <p>Dans <strong>Mon compte</strong>, rubrique données, choisis <strong>Exporter mes données</strong>. Tu reçois un fichier contenant ton profil, tes contrats, tes analyses et ton suivi d&apos;économies.</p>
            <h3 className="font-display text-lg font-extrabold">Supprimer</h3>
            <Steps items={[
              <>Si tu as ECONOM. Plus, résilie d&apos;abord ton abonnement pour arrêter les prélèvements.</>,
              <>Dans <strong>Mon compte</strong>, choisis <strong>Supprimer mon compte</strong> et confirme.</>,
              <>Ton profil, tes contrats, tes analyses et ton historique sont effacés. Cette action est définitive.</>,
            ]} />
            <p className="text-muted">
              Certaines informations doivent être conservées plus longtemps parce que la loi l&apos;impose, comme les factures de ton abonnement Plus. Le détail figure dans la <Link href="/confidentialite" className="font-bold text-brand-strong underline underline-offset-4">politique de confidentialité</Link>.
            </p>
          </Guide>

          <section id="contact" className="scroll-mt-28 mt-4 rounded-[2rem] bg-ink p-8 text-[#F8F8F2]">
            <h2 className="font-display text-2xl font-black">Besoin d&apos;un coup de main ?</h2>
            <p className="mt-2 text-white/75">Regarde d&apos;abord la FAQ : la réponse y est souvent. Sinon, écris-nous.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/contact" variant="accent">Nous contacter</LinkButton>
              <LinkButton href="/faq" variant="light">Lire la FAQ</LinkButton>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
