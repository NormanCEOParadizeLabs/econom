import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, Todo } from "@/components/content";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données ECONOM. traite, pourquoi, sur quelle base légale, pendant combien de temps, avec quels sous-traitants, et comment exercer tes droits RGPD.",
  alternates: { canonical: "/confidentialite" },
};

export default function Confidentialite() {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <LegalDraftNotice />
      <h1 className="font-display text-4xl font-black">Politique de confidentialité</h1>
      <p className="text-muted">Version de travail du 20 novembre 2026.</p>

      <h2>L&apos;essentiel en six points</h2>
      <ul>
        <li>Tes factures scannées ne sont pas conservées : seuls les champs extraits (fournisseur, prix, volume, dates) le sont.</li>
        <li>Aucun traceur publicitaire, aucune revente de données.</li>
        <li>ECONOM. ne se connecte jamais à ton compte bancaire.</li>
        <li>Ton numéro de carte est traité par Stripe ; ECONOM. ne le voit pas.</li>
        <li>Tu peux exporter ou supprimer tes données depuis « Mon compte ».</li>
        <li>Certains prestataires sont situés hors de l&apos;Union européenne ; ces transferts sont encadrés (voir section 7).</li>
      </ul>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est <Todo>raison sociale</Todo>, <Todo>forme juridique, SIREN</Todo>, dont le siège est situé <Todo>adresse du siège</Todo> (« ECONOM. », « nous »).
      </p>
      <p>
        Contact pour toute question relative aux données personnelles : <Todo>adresse e-mail dédiée à la protection des données</Todo>. Délégué à la protection des données : <Todo>nom et coordonnées du DPO, ou mention « aucun DPO désigné, la désignation n&apos;étant pas obligatoire » après analyse</Todo>.
      </p>
      <p>
        Cette politique s&apos;applique conformément au règlement (UE) 2016/679 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 modifiée (« Informatique et Libertés »).
      </p>

      <h2>2. Données que nous traitons</h2>
      <h3>Données que tu nous fournis</h3>
      <ul>
        <li><strong>Compte :</strong> adresse e-mail, mot de passe (stocké sous forme chiffrée non réversible par notre prestataire d&apos;authentification), prénom ou pseudonyme si tu l&apos;indiques.</li>
        <li><strong>Contrats et abonnements :</strong> fournisseur, nom de l&apos;offre, prix, volume de données, dates d&apos;échéance et d&apos;engagement, frais que tu saisis.</li>
        <li><strong>Factures scannées :</strong> l&apos;image ou le PDF est transmis pour analyse puis écarté ; nous conservons uniquement les champs extraits et validés. Une facture peut contenir ton nom, ton adresse ou ton numéro de ligne : ces éléments sont transmis au prestataire d&apos;analyse le temps du traitement, mais ne sont pas enregistrés dans ton compte s&apos;ils ne sont pas utiles à la comparaison.</li>
        <li><strong>Échanges avec l&apos;assistant IA :</strong> tes messages et les réponses générées.</li>
        <li><strong>Localisation :</strong> une adresse, un code postal ou, si tu l&apos;autorises, la position de ton appareil, pour afficher les bons plans proches. La position précise n&apos;est utilisée que le temps de la recherche.</li>
        <li><strong>Suivi d&apos;économies et parrainage :</strong> état de tes économies (potentielle, lancée, confirmée, constatée), code de parrainage, liens entre parrain et filleuls.</li>
        <li><strong>Échanges avec le support :</strong> contenu de tes messages.</li>
      </ul>
      <h3>Données collectées automatiquement</h3>
      <ul>
        <li><strong>Données techniques :</strong> adresse IP, type de navigateur et d&apos;appareil, journaux de connexion et d&apos;erreurs, nécessaires à la sécurité et au fonctionnement.</li>
        <li><strong>Mesure d&apos;usage interne :</strong> événements d&apos;utilisation minimalistes (par exemple « comparaison lancée »), enregistrés sans cookie, sans adresse IP, sans contenu saisi et sans transmission à un tiers. Lorsque tu es connecté, ces événements ne sont enregistrés que si tu l&apos;as accepté dans tes préférences.</li>
        <li><strong>Paiement :</strong> statut de l&apos;abonnement, identifiant client Stripe, historique de facturation. Les données de carte bancaire sont collectées et conservées par Stripe uniquement.</li>
      </ul>
      <p>Nous ne te demandons aucune donnée sensible au sens de l&apos;article 9 du RGPD. Évite d&apos;en communiquer dans les champs libres ou à l&apos;assistant.</p>

      <h2>3. Finalités et bases légales</h2>
      <table>
        <thead>
          <tr><th scope="col">Finalité</th><th scope="col">Base légale (art. 6 RGPD)</th></tr>
        </thead>
        <tbody>
          <tr><td>Créer et gérer ton compte, t&apos;authentifier</td><td>Exécution du contrat (CGU)</td></tr>
          <tr><td>Comparer les offres, analyser tes factures, suivre tes abonnements et tes économies, répondre via l&apos;assistant</td><td>Exécution du contrat</td></tr>
          <tr><td>Gérer l&apos;abonnement ECONOM. Plus, la facturation et le parrainage</td><td>Exécution du contrat</td></tr>
          <tr><td>Tenir la comptabilité et conserver les factures</td><td>Obligation légale</td></tr>
          <tr><td>Afficher les bons plans à partir de la position de ton appareil</td><td>Consentement (autorisation de géolocalisation, retirable à tout moment)</td></tr>
          <tr><td>Envoyer les e-mails de service (confirmation, sécurité, alertes d&apos;échéance que tu as activées)</td><td>Exécution du contrat</td></tr>
          <tr><td>Envoyer des e-mails d&apos;information sur le Service</td><td>Consentement, ou intérêt légitime pour des services analogues, avec lien de désinscription dans chaque message</td></tr>
          <tr><td>Sécuriser le Service, prévenir la fraude et les abus, limiter les usages excessifs</td><td>Intérêt légitime (protection du Service et des utilisateurs)</td></tr>
          <tr><td>Mesurer l&apos;usage pour améliorer le Service</td><td>Consentement pour les comptes connectés (réglage modifiable dans tes préférences) ; intérêt légitime pour les visites sans compte (événements minimalistes, sans traceur ni profilage publicitaire)</td></tr>
          <tr><td>Répondre à tes demandes et gérer les réclamations et litiges</td><td>Intérêt légitime ; obligation légale pour les demandes d&apos;exercice de droits</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Décision automatisée :</strong> le classement des offres est calculé automatiquement à partir des données que tu saisis. Il ne produit aucun effet juridique à ton égard : tu restes libre de souscrire ou non. Il n&apos;y a pas de profilage publicitaire.
      </p>
      <p>
        <strong>Intelligence artificielle :</strong> l&apos;analyse des factures et l&apos;assistant utilisent les modèles Claude de la société Anthropic. Tes contenus sont transmis pour produire la réponse. <Todo>confirmer, au vu du contrat conclu avec Anthropic, l&apos;absence de réutilisation des contenus pour l&apos;entraînement des modèles et la durée de rétention chez ce prestataire</Todo>.
      </p>

      <h2>4. Durées de conservation</h2>
      <table>
        <thead>
          <tr><th scope="col">Données</th><th scope="col">Durée</th></tr>
        </thead>
        <tbody>
          <tr><td>Document de facture (image, PDF)</td><td>Non conservé : supprimé à l&apos;issue de l&apos;analyse</td></tr>
          <tr><td>Compte, contrats, analyses, suivi d&apos;économies, conversations avec l&apos;assistant</td><td>Tant que le compte est actif, puis suppression lors de la suppression du compte</td></tr>
          <tr><td>Compte inactif</td><td>Suppression après <Todo>durée d&apos;inactivité retenue, par exemple 24 mois</Todo> sans connexion, après un e-mail de prévenance</td></tr>
          <tr><td>Factures et pièces comptables de l&apos;abonnement Plus</td><td>10 ans (art. L123-22 du Code de commerce)</td></tr>
          <tr><td>Journaux techniques et de sécurité</td><td><Todo>durée retenue, 12 mois au plus</Todo></td></tr>
          <tr><td>Événements de mesure d&apos;usage</td><td><Todo>durée retenue, par exemple 13 à 25 mois</Todo>, puis agrégation anonyme</td></tr>
          <tr><td>Échanges avec le support</td><td><Todo>durée retenue, par exemple 3 ans après le dernier échange</Todo></td></tr>
          <tr><td>Demandes d&apos;exercice de droits</td><td><Todo>durée retenue, par exemple 5 ans</Todo> à titre de preuve</td></tr>
          <tr><td>Données nécessaires à la défense en justice</td><td>Durée de la prescription applicable (en principe 5 ans), en archivage à accès restreint</td></tr>
        </tbody>
      </table>

      <h2>5. Destinataires</h2>
      <p>Tes données sont accessibles aux seules personnes habilitées de l&apos;éditeur, dans la limite de leurs fonctions, et à nos sous-traitants, qui agissent sur nos instructions :</p>
      <table>
        <thead>
          <tr><th scope="col">Prestataire</th><th scope="col">Rôle</th><th scope="col">Localisation</th></tr>
        </thead>
        <tbody>
          <tr><td>Supabase</td><td>Base de données et authentification</td><td><Todo>région d&apos;hébergement du projet (Union européenne recommandée)</Todo> ; société mère aux États-Unis</td></tr>
          <tr><td>Anthropic</td><td>Analyse des factures et assistant IA</td><td>États-Unis</td></tr>
          <tr><td>Stripe</td><td>Paiement, facturation, portail d&apos;abonnement</td><td>Irlande (Stripe Payments Europe Ltd) et États-Unis</td></tr>
          <tr><td>Render</td><td>Hébergement de l&apos;application</td><td><Todo>région d&apos;hébergement retenue</Todo> ; société aux États-Unis</td></tr>
          <tr><td>Resend (si activé)</td><td>Envoi des e-mails</td><td>États-Unis</td></tr>
          <tr><td>Base Adresse Nationale (api-adresse.data.gouv.fr)</td><td>Géocodage : conversion d&apos;une adresse en coordonnées</td><td>France</td></tr>
          <tr><td>OpenStreetMap</td><td>Affichage des fonds de carte</td><td><Todo>localisation du serveur de tuiles utilisé</Todo></td></tr>
        </tbody>
      </table>
      <p>
        Pour le géocodage et l&apos;affichage des cartes, ton appareil ou nos serveurs interrogent ces services, qui reçoivent alors l&apos;adresse recherchée ou la zone affichée, ainsi qu&apos;une adresse IP. Stripe agit par ailleurs comme responsable de traitement distinct pour ses propres obligations (lutte contre la fraude, conformité).
      </p>
      <p>
        <strong>Fournisseurs comparés :</strong> nous ne transmettons pas tes données personnelles aux opérateurs. Lorsque tu cliques sur une offre, tu es dirigé vers le site du fournisseur ; si un partenariat existe, le lien peut contenir un identifiant indiquant que la visite provient d&apos;ECONOM., sans donnée permettant de t&apos;identifier.
      </p>
      <p>Tes données peuvent enfin être communiquées aux autorités habilitées lorsque la loi l&apos;exige. Elles ne sont ni vendues ni louées.</p>

      <h2>6. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures adaptées : chiffrement des échanges (HTTPS), cloisonnement des données par utilisateur au niveau de la base, contrôle des droits côté serveur, limitation des accès internes, journalisation des opérations sensibles, en-têtes de sécurité stricts. Aucun système n&apos;étant infaillible, nous te notifierons toute violation de données susceptible d&apos;engendrer un risque élevé pour tes droits, conformément aux articles 33 et 34 du RGPD.
      </p>

      <h2>7. Transferts hors de l&apos;Union européenne</h2>
      <p>
        Certains prestataires (Anthropic, Stripe, Supabase, Render, Resend) sont établis aux États-Unis ou peuvent y traiter des données. Ces transferts sont encadrés par l&apos;un des mécanismes prévus au chapitre V du RGPD :
      </p>
      <ul>
        <li>la décision d&apos;adéquation de la Commission européenne du 10 juillet 2023 relative au cadre de protection des données UE–États-Unis (Data Privacy Framework), pour les prestataires qui y sont certifiés ;</li>
        <li>à défaut, les clauses contractuelles types adoptées par la Commission européenne (décision 2021/914), complétées si nécessaire par des mesures supplémentaires.</li>
      </ul>
      <p>
        <Todo>pour chaque prestataire : mécanisme de transfert effectivement applicable, référence de l&apos;accord de traitement des données (DPA) signé et région d&apos;hébergement</Todo>. Tu peux obtenir une copie des garanties applicables en nous écrivant.
      </p>

      <h2>8. Tes droits</h2>
      <p>Tu disposes des droits suivants sur tes données :</p>
      <ul>
        <li><strong>accès</strong> : savoir quelles données nous détenons et en obtenir une copie ;</li>
        <li><strong>rectification</strong> : corriger des données inexactes (la plupart sont modifiables directement dans ton espace) ;</li>
        <li><strong>effacement</strong> : supprimer ton compte et tes données, sous réserve des obligations légales de conservation ;</li>
        <li><strong>limitation</strong> du traitement dans les cas prévus par la loi ;</li>
        <li><strong>opposition</strong> aux traitements fondés sur l&apos;intérêt légitime, et à tout moment à la prospection ;</li>
        <li><strong>portabilité</strong> : recevoir tes données dans un format structuré et lisible par machine ;</li>
        <li><strong>retrait du consentement</strong> à tout moment, sans effet sur les traitements passés ;</li>
        <li><strong>directives post-mortem</strong> : définir le sort de tes données après ton décès.</li>
      </ul>
      <p>
        <strong>Comment les exercer :</strong> l&apos;export et la suppression sont disponibles dans « Mon compte ». Pour toute autre demande, écris à <Todo>adresse e-mail dédiée à la protection des données</Todo>. Nous répondons dans un délai d&apos;un mois, pouvant être prolongé de deux mois pour les demandes complexes. Un justificatif d&apos;identité ne peut t&apos;être demandé qu&apos;en cas de doute raisonnable.
      </p>
      <p>
        <strong>Réclamation :</strong> si tu estimes que tes droits ne sont pas respectés, tu peux saisir la Commission nationale de l&apos;informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — cnil.fr.
      </p>

      <h2>9. Mineurs</h2>
      <p>
        Le Service s&apos;adresse aux personnes majeures. Nous ne collectons pas sciemment de données concernant des mineurs de moins de 15 ans. Si tu penses qu&apos;un mineur nous a transmis des données, contacte-nous pour qu&apos;elles soient supprimées.
      </p>

      <h2>10. Cookies</h2>
      <p>Seuls des cookies strictement nécessaires sont utilisés. Voir la <Link href="/cookies">politique relative aux cookies</Link>.</p>

      <h2>11. Évolution de cette politique</h2>
      <p>
        Cette politique peut être mise à jour, notamment en cas de changement de prestataire ou de fonctionnalité. En cas de modification importante, tu es prévenu par e-mail ou dans l&apos;application avant son entrée en vigueur. La date de version figure en haut de page.
      </p>
    </article>
  );
}
