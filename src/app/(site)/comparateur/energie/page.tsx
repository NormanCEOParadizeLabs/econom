import type { Metadata } from "next";
import { Badge, Card, LinkButton, Notice } from "@/components/ui";
import { IconBolt, IconCheck } from "@/components/icons";

export const metadata: Metadata = {
  title: "Comparateur énergie — en préparation",
  description: "Le comparateur d'électricité et de gaz d'ECONOM. n'est pas encore ouvert : nous ne publions pas de comparaison tant que les données et les règles de calcul ne sont pas validées.",
  alternates: { canonical: "/comparateur/energie" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Badge tone="accent"><IconBolt width={14} height={14} /> En préparation</Badge>
      <h1 className="mt-3 font-display text-4xl md:text-5xl font-black leading-[1.02]">Électricité et gaz : pas encore.</h1>
      <p className="mt-3 text-lg text-muted">Comparer des contrats d&apos;énergie demande des données et des règles de calcul que nous n&apos;avons pas encore validées. Plutôt que d&apos;afficher des chiffres approximatifs, nous préférons attendre.</p>
      <Notice className="mt-6" title="En attendant, le comparateur officiel et gratuit">
        Le médiateur national de l&apos;énergie propose un comparateur public et indépendant :{" "}
        <a href="https://comparateur-offres.energie-info.fr" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">comparateur-offres.energie-info.fr</a>.
      </Notice>
      <Card className="mt-6">
        <h2 className="font-display text-xl font-extrabold">Ce que le comparateur prendra en compte</h2>
        <ul className="mt-3 space-y-2.5">
          {[
            "Ta consommation annuelle en kWh (relevée sur ta facture ou ton compteur).",
            "La puissance souscrite (kVA) et l'option tarifaire : base ou heures pleines / heures creuses.",
            "Ta zone tarifaire pour le gaz et ta commune.",
            "Le type de prix : fixe, indexé sur le tarif réglementé, ou variable — et sa durée.",
            "L'abonnement annuel, le prix du kWh, les taxes et les évolutions de prix prévues au contrat.",
          ].map((t) => <li key={t} className="flex gap-3"><IconCheck width={18} height={18} className="mt-1 shrink-0 text-brand-strong" /><span>{t}</span></li>)}
        </ul>
      </Card>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/comparateur/mobile">Comparer mon forfait mobile</LinkButton>
        <LinkButton href="/comparateur/internet" variant="outline">Comparer ma box internet</LinkButton>
      </div>
    </div>
  );
}
