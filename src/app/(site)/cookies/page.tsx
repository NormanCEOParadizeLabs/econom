import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, Todo } from "@/components/content";

export const metadata: Metadata = {
  title: "Cookies",
  description: "ECONOM. n'utilise aucun traceur publicitaire : uniquement les cookies de session nécessaires à ta connexion. Liste, durées et réglages possibles.",
  alternates: { canonical: "/cookies" },
};

export default function Cookies() {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <LegalDraftNotice />
      <h1 className="font-display text-4xl font-black">Politique relative aux cookies</h1>
      <p className="text-muted">Version de travail du 20 novembre 2026.</p>

      <h2>En bref</h2>
      <ul>
        <li>Aucun cookie publicitaire, aucun traceur de réseau social, aucun outil de mesure d&apos;audience tiers.</li>
        <li>Uniquement les cookies de session nécessaires pour te connecter et rester connecté.</li>
        <li>La mesure d&apos;usage est interne et fonctionne sans cookie.</li>
        <li>C&apos;est pourquoi aucun bandeau de consentement ne s&apos;affiche : il n&apos;y a rien à accepter ni à refuser.</li>
      </ul>

      <h2>1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
      <p>
        Un cookie est un petit fichier déposé par un site dans ton navigateur. Il permet, par exemple, de te reconnaître d&apos;une page à l&apos;autre. D&apos;autres techniques jouent un rôle voisin, comme le stockage local du navigateur ; elles sont soumises aux mêmes règles (article 82 de la loi « Informatique et Libertés ») et sont donc décrites ici.
      </p>

      <h2>2. Cookies utilisés par ECONOM.</h2>
      <table>
        <thead>
          <tr><th scope="col">Nom</th><th scope="col">Déposé par</th><th scope="col">Rôle</th><th scope="col">Durée</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Cookies de session d&apos;authentification (nom commençant par <code>sb-</code>)</td>
            <td>ECONOM., via son prestataire d&apos;authentification Supabase</td>
            <td>Te garder connecté et protéger l&apos;accès à ton espace. Déposés uniquement lorsque tu te connectes.</td>
            <td><Todo>durée de session configurée</Todo>, ou jusqu&apos;à la déconnexion</td>
          </tr>
        </tbody>
      </table>
      <p>
        Ces cookies sont strictement nécessaires à la fourniture d&apos;un service que tu demandes expressément (te connecter à ton compte). À ce titre, ils sont dispensés de consentement en application de l&apos;article 82 de la loi « Informatique et Libertés » et des lignes directrices de la CNIL.
      </p>

      <h2>3. Autres stockages dans ton navigateur</h2>
      <table>
        <thead>
          <tr><th scope="col">Élément</th><th scope="col">Rôle</th><th scope="col">Durée</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Stockage local : <code>econom.theme</code>, <code>econom.scheme</code></td>
            <td>Mémoriser tes préférences d&apos;affichage (palette de couleurs, mode clair ou sombre). Ces valeurs restent dans ton navigateur et ne nous sont pas transmises.</td>
            <td>Jusqu&apos;à effacement par tes soins</td>
          </tr>
          <tr>
            <td>Cache de l&apos;application (service worker)</td>
            <td>Accélérer le chargement et afficher une page d&apos;information lorsque tu es hors ligne. Il ne contient aucune donnée de ton compte.</td>
            <td>Jusqu&apos;à la mise à jour de l&apos;application ou effacement par tes soins</td>
          </tr>
        </tbody>
      </table>
      <p>Ces éléments servent uniquement au fonctionnement et au confort d&apos;affichage que tu as choisis. Ils ne permettent aucun suivi de ta navigation.</p>

      <h2>4. Mesure d&apos;usage sans cookie</h2>
      <p>
        Pour savoir quelles fonctions sont utiles, nous enregistrons sur nos propres serveurs des événements simples (par exemple « une comparaison a été lancée »). Cette mesure ne dépose aucun cookie, n&apos;enregistre pas ton adresse IP et n&apos;est partagée avec aucune régie publicitaire. Lorsque tu es connecté, elle n&apos;est active que si tu l&apos;as acceptée dans tes préférences. Voir la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>5. Services tiers</h2>
      <ul>
        <li><strong>Stripe :</strong> lorsque tu souscris ou gères ECONOM. Plus, tu es redirigé vers des pages hébergées par Stripe. Stripe peut y déposer ses propres cookies, nécessaires au paiement et à la prévention de la fraude, selon sa propre politique.</li>
        <li><strong>Cartes :</strong> les fonds de carte sont chargés depuis les serveurs d&apos;OpenStreetMap, qui reçoivent alors ton adresse IP et la zone affichée, sans dépôt de cookie par ECONOM.</li>
        <li><strong>Sites des fournisseurs :</strong> lorsque tu cliques sur une offre, tu quittes ECONOM. Le site du fournisseur applique sa propre politique de cookies.</li>
      </ul>

      <h2>6. Gérer ou supprimer les cookies</h2>
      <p>
        Tu peux à tout moment supprimer les cookies et le stockage local depuis les réglages de ton navigateur, ou les bloquer. Si tu bloques les cookies de session, tu ne pourras plus te connecter à ton compte ; le comparateur sans compte reste utilisable. Te déconnecter supprime les cookies de session.
      </p>

      <h2>7. Si cela change</h2>
      <p>
        Si nous devions un jour utiliser des cookies ou traceurs non strictement nécessaires, ils ne seraient déposés qu&apos;après ton accord, recueilli par un dispositif te permettant de refuser aussi simplement que d&apos;accepter, et cette page serait mise à jour au préalable.
      </p>

      <h2>8. Contact</h2>
      <p>Pour toute question : <Todo>adresse e-mail dédiée à la protection des données</Todo>.</p>
    </article>
  );
}
