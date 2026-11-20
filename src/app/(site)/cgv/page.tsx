import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, Todo } from "@/components/content";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "Conditions de vente d'ECONOM. Plus : prix TTC, durée et reconduction, paiement par Stripe, résiliation en ligne, droit de rétractation de 14 jours, médiation.",
  alternates: { canonical: "/cgv" },
};

export default function Cgv() {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <LegalDraftNotice />
      <h1 className="font-display text-4xl font-black">Conditions générales de vente</h1>
      <p className="text-muted">Version de travail du 20 novembre 2026.</p>

      <h2>L&apos;essentiel</h2>
      <ul>
        <li>ECONOM. Plus coûte 4,99 € TTC par mois ou 39,99 € TTC par an.</li>
        <li>Aucun engagement de durée : l&apos;abonnement se renouvelle jusqu&apos;à ce que tu résilies.</li>
        <li>Tu résilies en ligne, à tout moment, depuis « Mon compte ».</li>
        <li>Tu disposes d&apos;un droit de rétractation de 14 jours, sous les réserves expliquées à l&apos;article 7.</li>
      </ul>

      <h2>1. Vendeur</h2>
      <p>
        ECONOM. Plus est vendu par <Todo>raison sociale, forme juridique, capital social</Todo>, immatriculée sous le numéro <Todo>SIREN et RCS</Todo>, dont le siège est situé <Todo>adresse du siège</Todo>, numéro de TVA <Todo>numéro de TVA intracommunautaire</Todo> (« ECONOM. », « nous »). Contact : <Todo>adresse e-mail et numéro de téléphone</Todo>.
      </p>

      <h2>2. Champ d&apos;application</h2>
      <p>
        Les présentes conditions générales de vente (« CGV ») s&apos;appliquent à toute souscription de l&apos;abonnement ECONOM. Plus par un consommateur. Elles complètent les <Link href="/cgu">conditions générales d&apos;utilisation</Link>. La version applicable est celle en vigueur au jour de la souscription ; elle t&apos;est communiquée sur support durable avec la confirmation de commande.
      </p>

      <h2>3. Le service ECONOM. Plus</h2>
      <p>ECONOM. Plus est un service numérique par abonnement qui ajoute à la formule gratuite :</p>
      <ul>
        <li>20 analyses de facture par IA par mois (au lieu de 3) ;</li>
        <li>le suivi d&apos;un nombre illimité d&apos;abonnements ;</li>
        <li>l&apos;historique complet ;</li>
        <li>les alertes d&apos;échéance ;</li>
        <li>un quota supérieur pour l&apos;assistant IA ;</li>
        <li>des rapports.</li>
      </ul>
      <p>
        Les quotas sont mensuels et non reportables. Le service est accessible depuis un navigateur récent et une connexion à internet. ECONOM. Plus ne garantit aucune économie : il fournit des outils d&apos;analyse et de suivi.
      </p>

      <h2>4. Prix</h2>
      <ul>
        <li>Abonnement mensuel : <strong>4,99 € TTC par mois</strong>.</li>
        <li>Abonnement annuel : <strong>39,99 € TTC par an</strong>, payable en une fois.</li>
      </ul>
      <p>
        Les prix sont indiqués en euros, toutes taxes comprises. <Todo>régime de TVA applicable (TVA au taux en vigueur incluse, ou « TVA non applicable, art. 293 B du CGI »)</Todo>. Aucun frais supplémentaire n&apos;est facturé par ECONOM. ; les coûts de connexion à internet restent à ta charge.
      </p>
      <p>
        <strong>Évolution du prix :</strong> toute modification du prix t&apos;est notifiée par e-mail au moins <Todo>délai de prévenance, par exemple 30 jours</Todo> avant son application, qui n&apos;intervient qu&apos;à la prochaine échéance de renouvellement. Tu peux résilier sans frais avant cette échéance ; à défaut, le nouveau prix s&apos;applique.
      </p>

      <h2>5. Commande</h2>
      <p>La souscription se déroule en ligne, depuis ton espace :</p>
      <ul>
        <li>tu choisis la périodicité (mensuelle ou annuelle) ;</li>
        <li>tu prends connaissance du récapitulatif (service, prix TTC, durée, reconduction) et des présentes CGV ;</li>
        <li>tu confirmes ta demande d&apos;accès immédiat au service (voir article 7) ;</li>
        <li>tu valides la commande, avec obligation de paiement, sur la page de paiement sécurisée de Stripe.</li>
      </ul>
      <p>Le contrat est conclu à la confirmation du paiement. Un e-mail de confirmation t&apos;est adressé, accompagné des présentes CGV. Le contrat est conclu en langue française.</p>

      <h2>6. Paiement</h2>
      <p>
        Le paiement s&apos;effectue par carte bancaire via notre prestataire Stripe. ECONOM. n&apos;a jamais accès à ton numéro de carte. Le prix est prélevé à la souscription, puis à chaque échéance de renouvellement. En cas d&apos;échec d&apos;un paiement, de nouvelles tentatives peuvent être effectuées ; à défaut de régularisation, l&apos;accès à ECONOM. Plus est suspendu puis l&apos;abonnement prend fin, ton compte repassant en formule gratuite. Tes factures sont disponibles depuis le portail d&apos;abonnement.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        Conformément aux articles L221-18 et suivants du Code de la consommation, tu disposes d&apos;un délai de <strong>14 jours</strong> à compter de la conclusion du contrat pour te rétracter, sans avoir à motiver ta décision.
      </p>
      <h3>7.1 Accès immédiat et renoncement</h3>
      <p>
        ECONOM. Plus étant activé dès la confirmation du paiement, nous te demandons, au moment de la commande, de cocher une case par laquelle tu demandes expressément l&apos;exécution immédiate du service avant la fin du délai de rétractation et reconnais renoncer, dans les conditions prévues à l&apos;article L221-28 du Code de la consommation, à ton droit de rétractation. Sans cet accord exprès, la commande ne peut pas être validée. Cet accord est rappelé dans la confirmation de commande.
      </p>
      <p>
        <Todo>point à trancher par le juriste : pour un service numérique par abonnement, l&apos;exception de l&apos;article L221-28 (1° ou 13°) ne s&apos;applique que dans des conditions strictes. À défaut, prévoir le régime de l&apos;article L221-25 : rétractation possible pendant 14 jours avec paiement d&apos;un montant proportionnel au service fourni, ou un remboursement intégral à titre commercial. Adapter le texte de la case à cocher en conséquence.</Todo>
      </p>
      <h3>7.2 Exercer la rétractation</h3>
      <p>
        Lorsque le droit de rétractation est ouvert, tu peux l&apos;exercer par toute déclaration dénuée d&apos;ambiguïté adressée à <Todo>adresse e-mail et adresse postale</Todo>, par exemple à l&apos;aide du modèle ci-dessous. Le remboursement intervient au plus tard 14 jours après réception de ta décision, par le même moyen de paiement que celui utilisé pour la commande, sans frais.
      </p>
      <h3>Modèle de formulaire de rétractation</h3>
      <p>
        « À l&apos;attention de <Todo>raison sociale, adresse postale, e-mail</Todo> : je vous notifie par la présente ma rétractation du contrat portant sur l&apos;abonnement ECONOM. Plus, souscrit le [date]. Nom : [ton nom]. Adresse e-mail du compte : [ton e-mail]. Date : [date]. Signature (uniquement en cas d&apos;envoi sur papier). »
      </p>

      <h2>8. Durée et reconduction</h2>
      <p>
        L&apos;abonnement est conclu pour une période d&apos;un mois ou d&apos;un an selon la périodicité choisie, sans engagement au-delà de la période en cours. Il est reconduit tacitement pour des périodes successives de même durée, au prix en vigueur, tant qu&apos;il n&apos;est pas résilié.
      </p>
      <p>
        Pour l&apos;abonnement annuel, conformément à l&apos;article L215-1 du Code de la consommation, nous t&apos;informons par e-mail, au plus tôt trois mois et au plus tard un mois avant le terme de la période autorisant le rejet de la reconduction, de ta possibilité de ne pas reconduire le contrat. À défaut d&apos;une telle information, tu peux mettre fin au contrat gratuitement, à tout moment à compter de la date de reconduction, et les sommes versées après cette date te sont remboursées dans les 30 jours, déduction faite de celles correspondant à l&apos;exécution du contrat jusqu&apos;à la résiliation.
      </p>

      <h2>9. Résiliation</h2>
      <h3>9.1 Par toi, en ligne et à tout moment</h3>
      <p>
        Conformément à l&apos;article L215-1-1 du Code de la consommation, tu peux résilier ton abonnement par voie électronique, gratuitement, grâce à une fonctionnalité directement et facilement accessible (résiliation dite « en trois clics ») :
      </p>
      <ul>
        <li>ouvre « Mon compte » ;</li>
        <li>choisis « Gérer mon abonnement » (ou « Résilier mon abonnement »), ce qui ouvre le portail sécurisé de Stripe ;</li>
        <li>confirme la résiliation.</li>
      </ul>
      <p>
        Une confirmation de la résiliation, indiquant sa date d&apos;effet, t&apos;est envoyée par e-mail. Tu peux également résilier en écrivant à <Todo>adresse e-mail de contact</Todo>.
      </p>
      <p>
        La résiliation prend effet à la fin de la période en cours déjà payée : tu conserves l&apos;accès à ECONOM. Plus jusqu&apos;à cette date et aucun nouveau prélèvement n&apos;est effectué. Sauf disposition légale contraire, la période entamée n&apos;est pas remboursée. Ton compte repasse ensuite en formule gratuite, sans suppression de tes données.
      </p>
      <h3>9.2 Par ECONOM.</h3>
      <p>
        Nous pouvons résilier l&apos;abonnement en cas de défaut de paiement non régularisé ou de manquement grave aux CGU, après t&apos;en avoir informé. Si nous cessons de proposer ECONOM. Plus, tu es prévenu au moins <Todo>délai de prévenance, par exemple 30 jours</Todo> à l&apos;avance et remboursé de la période payée non consommée.
      </p>

      <h2>10. Avantages offerts</h2>
      <p>
        Les périodes d&apos;ECONOM. Plus offertes, notamment au titre du parrainage (30 jours pour 3 filleuls actifs), sont accordées sans paiement et ne donnent lieu à aucun prélèvement à leur terme : à la fin de la période offerte, le compte repasse en formule gratuite, sauf abonnement payant en cours.
      </p>

      <h2>11. Garanties légales</h2>
      <p>
        ECONOM. Plus étant un service numérique, tu bénéficies de la garantie légale de conformité prévue aux articles L224-25-12 et suivants du Code de la consommation, pendant toute la durée de l&apos;abonnement. En cas de défaut de conformité, tu as droit à la mise en conformité du service sans frais et sans retard injustifié et, à défaut, à une réduction du prix ou à la résolution du contrat. Tu bénéficies également de la garantie des vices cachés (articles 1641 et suivants du Code civil). Les mises à jour nécessaires au maintien de la conformité sont fournies pendant toute la durée du contrat.
      </p>
      <p><Todo>insérer l&apos;encadré réglementaire relatif à la garantie légale de conformité des services numériques (annexe à l&apos;article D211-2 du Code de la consommation), à faire vérifier</Todo></p>

      <h2>12. Responsabilité</h2>
      <p>
        Nous sommes responsables de la bonne exécution du service, sauf si l&apos;inexécution est imputable à toi-même, au fait imprévisible et insurmontable d&apos;un tiers ou à un cas de force majeure. Les estimations d&apos;économies ne constituent pas une garantie de résultat, comme précisé dans les CGU.
      </p>

      <h2>13. Données personnelles</h2>
      <p>Les données nécessaires à la gestion de l&apos;abonnement sont traitées conformément à la <Link href="/confidentialite">politique de confidentialité</Link>.</p>

      <h2>14. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation, écris d&apos;abord à <Todo>adresse e-mail de contact</Todo> : nous nous engageons à te répondre dans les meilleurs délais.
      </p>
      <p>
        Conformément aux articles L612-1 et suivants du Code de la consommation, si ta réclamation écrite n&apos;a pas abouti, tu peux saisir gratuitement, dans un délai d&apos;un an à compter de cette réclamation, le médiateur de la consommation dont nous relevons : <Todo>nom du médiateur, adresse postale, site internet et modalités de saisine</Todo>.
      </p>

      <h2>15. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGV sont soumises au droit français. En cas de litige, et à défaut de solution amiable, tu peux saisir, au choix, la juridiction du lieu où tu demeurais au moment de la conclusion du contrat ou de la survenance du fait dommageable, ou toute autre juridiction compétente en vertu du Code de procédure civile (article R631-3 du Code de la consommation).
      </p>
    </article>
  );
}
