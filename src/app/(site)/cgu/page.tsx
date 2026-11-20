import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, Todo } from "@/components/content";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Les règles d'utilisation d'ECONOM. : compte, comparateur et critères de classement, liens commerciaux, analyse par IA, limites des estimations, responsabilité.",
  alternates: { canonical: "/cgu" },
};

export default function Cgu() {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <LegalDraftNotice />
      <h1 className="font-display text-4xl font-black">Conditions générales d&apos;utilisation</h1>
      <p className="text-muted">Version de travail du 20 novembre 2026.</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales d&apos;utilisation (« CGU ») encadrent l&apos;accès et l&apos;utilisation du site et de l&apos;application ECONOM. (le « Service »), édités par <Todo>raison sociale, forme juridique, SIREN, adresse du siège</Todo> (« ECONOM. », « nous »). L&apos;abonnement payant ECONOM. Plus est en outre régi par les <Link href="/cgv">conditions générales de vente</Link>.
      </p>
      <p>En créant un compte ou en utilisant le Service, tu acceptes les présentes CGU.</p>

      <h2>2. Description du Service</h2>
      <p>Le Service permet notamment :</p>
      <ul>
        <li>de comparer des offres de forfaits mobiles et d&apos;accès à internet à partir de leur coût total sur 12 ou 24 mois ;</li>
        <li>d&apos;analyser une facture à l&apos;aide d&apos;une intelligence artificielle pour en extraire les informations utiles ;</li>
        <li>de suivre ses abonnements et leurs échéances ;</li>
        <li>de consulter des bons plans locaux sourcés ;</li>
        <li>d&apos;interroger un assistant IA ;</li>
        <li>de suivre ses économies (potentielles, lancées, confirmées, constatées) ;</li>
        <li>de parrainer d&apos;autres utilisateurs.</li>
      </ul>
      <p>
        ECONOM. est un service d&apos;information et d&apos;aide à la décision. Il n&apos;est ni opérateur, ni fournisseur, ni intermédiaire en opérations de banque, ni conseiller financier, et ne conclut aucun contrat au nom de l&apos;utilisateur.
      </p>

      <h2>3. Accès et compte</h2>
      <ul>
        <li>Le comparateur manuel est accessible sans compte. Les autres fonctions nécessitent un compte.</li>
        <li>Le Service est réservé aux personnes physiques majeures, agissant à des fins non professionnelles et résidant en France.</li>
        <li>Tu t&apos;engages à fournir une adresse e-mail valide, à garder ton mot de passe confidentiel et à nous signaler toute utilisation non autorisée de ton compte.</li>
        <li>Un compte est personnel : un seul compte par personne.</li>
      </ul>

      <h2>4. Formules et quotas</h2>
      <p>
        La formule gratuite comprend le comparateur manuel illimité, 3 analyses de facture par IA par mois, le suivi d&apos;un abonnement, les bons plans et le tableau de bord. La formule ECONOM. Plus comprend notamment 20 analyses par mois, le suivi illimité des abonnements, l&apos;historique complet, les alertes d&apos;échéance, un quota d&apos;assistant supérieur et des rapports. Le détail figure sur la page <Link href="/tarifs">Tarifs</Link>. Les quotas sont mensuels et non reportables. Nous pouvons faire évoluer les fonctionnalités de la formule gratuite, en t&apos;informant au préalable de toute réduction notable.
      </p>

      <h2>5. Transparence du comparateur</h2>
      <p>
        Les informations ci-dessous sont fournies en application des articles L111-7 et D111-10 et suivants du Code de la consommation. Elles sont aussi présentées sur la page <Link href="/comment-ca-marche#classement">Comment on classe les offres</Link>, accessible depuis chaque page de résultats.
      </p>
      <h3>5.1 Critères de classement</h3>
      <p>
        Par défaut, les offres sont classées par économie nette décroissante sur la durée choisie (12 ou 24 mois). L&apos;économie nette est la différence entre le coût total de l&apos;offre actuelle déclarée par l&apos;utilisateur et le coût total de l&apos;offre comparée. Le coût total comprend le prix mensuel pendant la période promotionnelle, le prix mensuel après cette période, les frais uniques connus (carte SIM, mise en service, activation) et les frais de résiliation de l&apos;offre actuelle lorsqu&apos;ils sont renseignés. En l&apos;absence d&apos;offre actuelle, le classement est établi par coût total croissant. Seules sont affichées les offres compatibles avec les besoins indiqués. Les prix sont exprimés en euros toutes taxes comprises.
      </p>
      <p>Le classement est produit par un moteur de calcul déterministe. L&apos;intelligence artificielle n&apos;intervient ni dans le calcul ni dans l&apos;ordre des résultats.</p>
      <h3>5.2 Liens commerciaux et rémunération</h3>
      <p>
        ECONOM. peut percevoir une rémunération de certains fournisseurs lorsqu&apos;un utilisateur souscrit une offre après avoir cliqué sur un lien. L&apos;existence d&apos;un tel lien commercial est signalée de façon visible sur chaque offre concernée. Cette rémunération n&apos;a aucune incidence sur le classement. Aucun fournisseur ne peut obtenir un meilleur rang, une mise en avant ou un référencement prioritaire contre paiement. ECONOM. n&apos;a pas de lien capitalistique avec les fournisseurs référencés : <Todo>à confirmer par la société ; à défaut, décrire les liens capitalistiques existants</Todo>.
      </p>
      <h3>5.3 Offres référencées et absence d&apos;exhaustivité</h3>
      <p>
        La comparaison porte uniquement sur les offres du catalogue d&apos;ECONOM., qui ne recense pas l&apos;intégralité des offres ni des fournisseurs du marché. Le référencement d&apos;une offre est gratuit pour le fournisseur et ne dépend pas de l&apos;existence d&apos;un partenariat. Une offre est référencée lorsque ses conditions ont pu être vérifiées sur le site officiel du fournisseur ; elle est retirée lorsqu&apos;elle n&apos;est plus commercialisée ou que sa vérification est trop ancienne.
      </p>
      <h3>5.4 Mise à jour</h3>
      <p>
        Chaque offre affiche sa source et la date de sa dernière vérification. Les offres sont revérifiées selon une périodicité de <Todo>périodicité de vérification du catalogue et délai au-delà duquel une offre est masquée, tels que configurés</Todo>. Les prix pouvant évoluer entre deux vérifications, seules les conditions publiées par le fournisseur au moment de la souscription font foi.
      </p>
      <h3>5.5 Souscription</h3>
      <p>
        Toute souscription se fait sur le site du fournisseur, selon ses propres conditions contractuelles. ECONOM. n&apos;est pas partie à ce contrat et ne garantit ni l&apos;éligibilité de l&apos;utilisateur ni la disponibilité de l&apos;offre.
      </p>

      <h2>6. Estimations et absence de garantie d&apos;économie</h2>
      <p>
        Les économies affichées sont des estimations, calculées à partir des informations que tu fournis et des offres vérifiées à la date indiquée. Elles ne constituent ni une promesse ni une garantie de résultat. L&apos;économie réelle dépend notamment de l&apos;exactitude des informations saisies, de ton usage, des frais appliqués par ton fournisseur actuel et des conditions en vigueur au jour de la souscription. Il t&apos;appartient de vérifier ces conditions avant de t&apos;engager.
      </p>

      <h2>7. Analyse de factures et assistant IA</h2>
      <ul>
        <li>L&apos;analyse de factures et l&apos;assistant reposent sur des modèles d&apos;intelligence artificielle fournis par Anthropic. Tu es informé que les réponses sont générées automatiquement.</li>
        <li>Une lecture automatique peut comporter des erreurs. Les champs extraits te sont soumis pour vérification avant toute utilisation ; tu restes responsable de leur validation.</li>
        <li>Le document transmis n&apos;est pas conservé ; seuls les champs extraits le sont.</li>
        <li>L&apos;assistant fournit des explications générales. Ses réponses ne constituent pas un conseil juridique, fiscal ou financier personnalisé.</li>
        <li>Tu t&apos;engages à ne transmettre que des documents te concernant ou pour lesquels tu disposes des autorisations nécessaires.</li>
      </ul>

      <h2>8. Bons plans locaux</h2>
      <p>
        Les bons plans sont publiés avec leur source et leur date. Ils sont proposés par des tiers, qui en restent seuls responsables ; ECONOM. ne garantit pas leur disponibilité au moment de ta visite.
      </p>

      <h2>9. Parrainage</h2>
      <p>
        Tout titulaire d&apos;un compte peut inviter d&apos;autres personnes au moyen de son lien personnel. Lorsque 3 filleuls sont devenus actifs, le parrain bénéficie de 30 jours d&apos;ECONOM. Plus offerts. Un filleul est considéré comme actif lorsque <Todo>critère d&apos;activité retenu (par exemple : compte confirmé et première comparaison ou analyse réalisée)</Todo>. L&apos;auto-parrainage, la création de comptes fictifs et toute manœuvre visant à obtenir indûment l&apos;avantage entraînent son retrait. L&apos;avantage n&apos;est ni cessible ni convertible en argent.
      </p>

      <h2>10. Règles d&apos;usage</h2>
      <p>Tu t&apos;engages à ne pas :</p>
      <ul>
        <li>utiliser le Service à des fins illicites ou porter atteinte aux droits de tiers ;</li>
        <li>extraire ou réutiliser de façon substantielle le catalogue d&apos;offres, notamment par des procédés automatisés ;</li>
        <li>contourner les quotas, les mesures de sécurité ou les limitations techniques ;</li>
        <li>perturber le fonctionnement du Service ou tenter d&apos;accéder aux données d&apos;autres utilisateurs ;</li>
        <li>détourner l&apos;assistant IA de son objet.</li>
      </ul>
      <p>En cas de manquement grave ou répété, nous pouvons suspendre ou fermer le compte, après t&apos;avoir informé des motifs et, sauf urgence, t&apos;avoir permis de présenter tes observations.</p>

      <h2>11. Disponibilité</h2>
      <p>
        Nous faisons nos meilleurs efforts pour assurer l&apos;accès au Service, sans pouvoir garantir une disponibilité permanente. Des interruptions peuvent survenir pour maintenance, mise à jour ou en raison de la défaillance d&apos;un prestataire technique.
      </p>

      <h2>12. Propriété intellectuelle</h2>
      <p>
        Le Service et ses contenus sont protégés. Nous te concédons un droit d&apos;utilisation personnel, non exclusif et non cessible, pour tes besoins privés. Les données que tu saisis restent les tiennes ; tu nous autorises à les traiter dans la seule mesure nécessaire à la fourniture du Service.
      </p>

      <h2>13. Responsabilité</h2>
      <p>
        ECONOM. est tenu d&apos;une obligation de moyens. Nous ne sommes pas responsables des décisions que tu prends sur la base des informations affichées, des modifications d&apos;offres décidées par les fournisseurs, ni des dommages résultant d&apos;informations inexactes que tu aurais saisies. Rien dans les présentes CGU ne limite les droits que tu tiens de la loi en qualité de consommateur, ni notre responsabilité en cas de faute lourde, de dol ou de dommage corporel.
      </p>

      <h2>14. Données personnelles</h2>
      <p>Le traitement de tes données est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link> et la <Link href="/cookies">politique relative aux cookies</Link>.</p>

      <h2>15. Suppression du compte</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis « Mon compte ». La suppression entraîne l&apos;effacement de tes données, sous réserve des obligations légales de conservation. Si tu disposes d&apos;un abonnement ECONOM. Plus, il doit être résilié selon les modalités prévues aux CGV.
      </p>

      <h2>16. Modification des CGU</h2>
      <p>
        Nous pouvons modifier les présentes CGU. Toute modification substantielle t&apos;est notifiée par e-mail ou dans l&apos;application au moins <Todo>délai de prévenance, par exemple 30 jours</Todo> avant son entrée en vigueur. Si tu la refuses, tu peux supprimer ton compte sans frais.
      </p>

      <h2>17. Droit applicable, réclamations et litiges</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Pour toute réclamation, écris à <Todo>adresse e-mail de contact</Todo>. À défaut de solution amiable, tu peux saisir gratuitement le médiateur de la consommation : <Todo>nom, adresse et site internet du médiateur</Todo>. Tu conserves la possibilité de saisir la juridiction compétente dans les conditions prévues par le Code de la consommation.
      </p>
    </article>
  );
}
