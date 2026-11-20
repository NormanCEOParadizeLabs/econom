import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, Todo } from "@/components/content";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site et de l'application ECONOM. : éditeur, directeur de la publication, hébergeur, propriété intellectuelle et contact.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegales() {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <LegalDraftNotice />
      <h1 className="font-display text-4xl font-black">Mentions légales</h1>
      <p className="text-muted">Version de travail du 20 novembre 2026.</p>
      <p>
        Les présentes mentions sont publiées conformément à l&apos;article 6, III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN) et aux articles L111-1 et suivants du Code de la consommation.
      </p>

      <h2>1. Éditeur du site</h2>
      <p>Le site et l&apos;application ECONOM. (ci-après « le Service ») sont édités par :</p>
      <ul>
        <li>Dénomination sociale : <Todo>raison sociale</Todo></li>
        <li>Forme juridique et capital social : <Todo>forme juridique (SAS, SARL…) et montant du capital</Todo></li>
        <li>Siège social : <Todo>adresse complète du siège</Todo></li>
        <li>Immatriculation : <Todo>numéro SIREN</Todo>, RCS de <Todo>ville du greffe</Todo></li>
        <li>Numéro de TVA intracommunautaire : <Todo>numéro de TVA, ou mention « TVA non applicable, art. 293 B du CGI »</Todo></li>
        <li>Adresse e-mail : <Todo>adresse e-mail de contact</Todo></li>
        <li>Téléphone : <Todo>numéro de téléphone permettant un contact effectif</Todo></li>
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p>
        Le directeur de la publication est <Todo>nom et prénom du directeur de la publication</Todo>, en qualité de <Todo>fonction (président, gérant…)</Todo>.
      </p>

      <h2>3. Hébergement</h2>
      <p>Le Service est hébergé par :</p>
      <ul>
        <li>
          <strong>Render Services, Inc.</strong> (hébergement de l&apos;application) — <Todo>adresse postale et moyen de contact de l&apos;hébergeur, à reprendre de ses mentions officielles, et région d&apos;hébergement retenue</Todo>. Site : render.com.
        </li>
        <li>
          <strong>Supabase, Inc.</strong> (hébergement de la base de données et de l&apos;authentification) — <Todo>adresse postale de l&apos;hébergeur et région d&apos;hébergement du projet</Todo>. Site : supabase.com.
        </li>
      </ul>

      <h2>4. Nature du Service</h2>
      <p>
        ECONOM. est un service d&apos;information et de comparaison d&apos;offres (forfaits mobiles, accès à internet) et de suivi de dépenses récurrentes. L&apos;éditeur n&apos;est ni opérateur de communications électroniques, ni fournisseur d&apos;énergie, ni établissement bancaire ou de paiement, ni conseiller en investissement. Il n&apos;est pas partie aux contrats que l&apos;utilisateur conclut avec les fournisseurs comparés.
      </p>
      <p>
        En tant qu&apos;opérateur de plateforme en ligne au sens de l&apos;article L111-7 du Code de la consommation, l&apos;éditeur publie les modalités de référencement et de classement des offres ainsi que l&apos;existence éventuelle de liens commerciaux : voir la rubrique <Link href="/comment-ca-marche#classement">Comment on classe les offres</Link> et les <Link href="/cgu">conditions générales d&apos;utilisation</Link>.
      </p>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments du Service (textes, interfaces, graphismes, logotype, code, base de données d&apos;offres, moteur de calcul) est protégé par le droit de la propriété intellectuelle et appartient à l&apos;éditeur ou à ses concédants. Toute reproduction, représentation, extraction ou réutilisation substantielle, sans autorisation écrite préalable, est interdite, sous réserve des exceptions légales.
      </p>
      <p>
        Le nom « ECONOM. » et son logotype : <Todo>statut de la marque (numéro de dépôt INPI / EUIPO, ou mention « dépôt en cours » après recherche d&apos;antériorité)</Todo>. Les noms et marques des fournisseurs cités dans le comparateur appartiennent à leurs titulaires respectifs et ne sont mentionnés qu&apos;à des fins d&apos;identification des offres.
      </p>
      <p>
        Les fonds de carte proviennent d&apos;OpenStreetMap (© les contributeurs d&apos;OpenStreetMap, licence ODbL). Le géocodage des adresses utilise la Base Adresse Nationale (licence ouverte Etalab).
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        Les informations publiées sont vérifiées à la date indiquée sur chaque offre. Elles sont fournies à titre indicatif : seules les conditions publiées par le fournisseur au moment de la souscription l&apos;engagent. Les économies affichées sont des estimations et ne constituent jamais une garantie de résultat. Les limites de responsabilité sont détaillées dans les <Link href="/cgu">conditions générales d&apos;utilisation</Link>.
      </p>

      <h2>7. Signalement d&apos;un contenu</h2>
      <p>
        Pour signaler un contenu inexact ou illicite, écris à <Todo>adresse e-mail de contact</Todo> en précisant l&apos;adresse de la page, le contenu concerné et le motif de ta demande.
      </p>

      <h2>8. Données personnelles et cookies</h2>
      <p>
        Le traitement de tes données est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>. L&apos;usage des cookies est décrit dans la <Link href="/cookies">politique relative aux cookies</Link>. Le Service n&apos;utilise aucun traceur publicitaire.
      </p>

      <h2>9. Médiation de la consommation</h2>
      <p>
        Conformément aux articles L612-1 et suivants du Code de la consommation, tu peux recourir gratuitement à un médiateur de la consommation en cas de litige non résolu avec l&apos;éditeur : <Todo>nom, adresse postale et site internet du médiateur de la consommation désigné</Todo>. Les modalités sont précisées dans les <Link href="/cgv">conditions générales de vente</Link>.
      </p>

      <h2>10. Droit applicable</h2>
      <p>Le Service est soumis au droit français. Pour toute question, tu peux aussi passer par la page <Link href="/contact">Contact</Link>.</p>
    </article>
  );
}
