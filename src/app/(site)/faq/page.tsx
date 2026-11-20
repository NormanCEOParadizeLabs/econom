import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { Faq, PageHero } from "@/components/content";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description: "Gratuité, classement des offres, partenariats, analyse de facture par IA, confidentialité, résiliation d'ECONOM. Plus : les réponses claires aux questions qu'on nous pose le plus.",
  alternates: { canonical: "/faq" },
};

const GROUPS: { title: string; items: { q: string; a: string[] }[] }[] = [
  {
    title: "Le service",
    items: [
      {
        q: "C'est quoi, ECONOM. ?",
        a: [
          "ECONOM. est une application qui t'aide à réduire tes dépenses récurrentes : forfait mobile, box internet, abonnements. Tu indiques ce que tu paies, on calcule le coût complet des offres comparables et on te montre ce que tu pourrais garder chaque mois.",
          "ECONOM. n'est ni un opérateur ni une banque : on ne souscrit rien à ta place et on n'a aucun accès à ton compte bancaire.",
        ],
      },
      {
        q: "Est-ce vraiment gratuit ?",
        a: [
          "Oui. Le comparateur manuel est illimité et gratuit, même sans compte. Avec un compte gratuit, tu as aussi 3 analyses de facture par IA par mois, 1 abonnement suivi, les bons plans et ton tableau de bord.",
          "La formule ECONOM. Plus (4,99 € TTC par mois ou 39,99 € TTC par an) ajoute des analyses, le suivi illimité des abonnements, l'historique complet, les alertes d'échéance et des rapports.",
        ],
      },
      {
        q: "Faut-il créer un compte pour comparer ?",
        a: ["Non. Tu peux comparer les forfaits mobiles et les box internet sans compte. Le compte sert à enregistrer tes contrats, scanner des factures et suivre tes économies dans le temps."],
      },
      {
        q: "Est-ce que vous garantissez une économie ?",
        a: [
          "Non, et on ne le fera jamais. Les montants affichés sont des estimations, calculées à partir de ce que tu saisis et de prix vérifiés à une date donnée. Le résultat réel dépend de ta situation et des conditions du fournisseur au moment où tu souscris.",
          "Si changer te coûte plus cher que rester, on te le dit aussi.",
        ],
      },
    ],
  },
  {
    title: "Le comparateur",
    items: [
      {
        q: "Comment les offres sont-elles classées ?",
        a: [
          "Par économie nette sur 12 ou 24 mois : le coût total de ton offre actuelle moins le coût total de l'offre comparée. Le coût total inclut le prix pendant et après la promotion, les frais uniques (carte SIM, mise en service) et les frais de résiliation que tu indiques.",
          "Le calcul est fait par un moteur déterministe, pas par une IA : les mêmes données donnent toujours le même résultat.",
        ],
      },
      {
        q: "Êtes-vous payés par les opérateurs ?",
        a: [
          "ECONOM. peut recevoir une rémunération de certains fournisseurs lorsqu'une personne souscrit après un clic. Quand un tel partenariat existe, il est toujours affiché sur l'offre concernée.",
          "Cette rémunération n'a aucun effet sur le classement : l'ordre dépend uniquement du calcul d'économie nette. Aucune offre ne peut acheter une meilleure place.",
        ],
      },
      {
        q: "Est-ce que toutes les offres du marché sont comparées ?",
        a: ["Non. Seules les offres de notre catalogue sont comparées, et ce catalogue ne couvre pas tout le marché. Il peut exister ailleurs une offre plus adaptée à ta situation. On préfère un catalogue plus court mais vérifié offre par offre."],
      },
      {
        q: "D'où viennent les prix, et sont-ils à jour ?",
        a: [
          "Chaque offre est contrôlée sur le site officiel du fournisseur. Sa source et sa date de vérification sont affichées. Une offre dont la vérification est trop ancienne est retirée jusqu'à son prochain contrôle.",
          "Un fournisseur peut changer son offre entre deux vérifications : avant de souscrire, c'est toujours son site qui fait foi.",
        ],
      },
    ],
  },
  {
    title: "Factures, IA et données",
    items: [
      {
        q: "Que devient ma facture quand je la scanne ?",
        a: [
          "Le document est transmis à un modèle d'IA (Claude, de la société Anthropic) qui en extrait les informations utiles : fournisseur, prix, volume, dates. Le document lui-même n'est pas conservé par ECONOM. ; seuls les champs extraits le sont, et tu peux les corriger ou les supprimer.",
        ],
      },
      {
        q: "L'IA peut-elle se tromper ?",
        a: ["Oui, comme toute lecture automatique : une photo floue ou une facture inhabituelle peut donner un montant erroné. C'est pour ça que tu valides toujours les champs lus avant qu'ils soient utilisés. L'IA lit et explique ; elle ne fixe jamais un tarif et ne fait pas les calculs de comparaison."],
      },
      {
        q: "Avez-vous accès à mon compte bancaire ?",
        a: ["Non. ECONOM. ne se connecte pas à ta banque et ne te demandera jamais tes identifiants bancaires. Les abonnements suivis sont ceux que tu saisis ou qui sont lus sur une facture que tu as choisie de scanner."],
      },
      {
        q: "Y a-t-il de la publicité ou des traceurs ?",
        a: ["Aucun traceur publicitaire. Le site utilise uniquement les cookies de session nécessaires à ta connexion. La mesure d'usage est interne et fonctionne sans cookie. Tes données ne sont pas vendues."],
      },
      {
        q: "Comment supprimer mon compte ou récupérer mes données ?",
        a: ["Depuis « Mon compte », tu peux exporter tes données dans un fichier et supprimer ton compte. La suppression efface tes contrats, tes analyses et ton historique. Si tu as un abonnement Plus en cours, pense à le résilier avant."],
      },
    ],
  },
  {
    title: "ECONOM. Plus et parrainage",
    items: [
      {
        q: "Comment résilier ECONOM. Plus ?",
        a: ["En ligne, à tout moment, depuis « Mon compte » : le bouton de gestion de l'abonnement ouvre le portail Stripe, où tu résilies en quelques clics. Tu gardes Plus jusqu'à la fin de la période payée, puis ton compte repasse en formule gratuite sans perte de données."],
      },
      {
        q: "Comment fonctionne le parrainage ?",
        a: ["Tu partages ton lien d'invitation depuis ton espace. Quand 3 de tes filleuls sont actifs, tu reçois 30 jours d'ECONOM. Plus offerts. Les conditions précises (ce qui compte comme un filleul actif) sont indiquées dans la rubrique parrainage."],
      },
      {
        q: "Comment changer d'opérateur sans perdre mon numéro ?",
        a: ["Appelle le 3179 depuis la ligne concernée pour obtenir ton code RIO, puis donne-le à ton nouvel opérateur au moment de la souscription. C'est lui qui se charge de résilier l'ancien contrat et de transférer le numéro. Ne résilie pas toi-même avant : tu perdrais ton numéro."],
      },
    ],
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: GROUPS.flatMap((g) => g.items).map((i) => ({
    "@type": "Question",
    name: i.q,
    acceptedAnswer: { "@type": "Answer", text: i.a.join(" ") },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero badge="FAQ" title="Les questions qu'on nous pose. Les vraies réponses.">
        Pas de langue de bois : comment on classe, comment on gagne de l&apos;argent, ce qu&apos;on fait de tes données.
      </PageHero>

      <div className="mx-auto max-w-3xl px-4 py-14">
        {GROUPS.map((g) => (
          <section key={g.title} className="mb-10">
            <h2 className="font-display text-2xl font-black">{g.title}</h2>
            <div className="mt-4 space-y-3">
              {g.items.map((i) => (
                <Faq key={i.q} q={i.q}>
                  {i.a.map((p) => <p key={p}>{p}</p>)}
                </Faq>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-[2rem] bg-[#171529] p-8 text-[#F8F8F2]">
          <h2 className="font-display text-2xl font-black">Tu n&apos;as pas trouvé ta réponse ?</h2>
          <p className="mt-2 text-white/75">
            Le centre d&apos;aide détaille les démarches pas à pas. Tu peux aussi lire <Link href="/comment-ca-marche#classement" className="underline underline-offset-4">comment on classe les offres</Link>.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/aide" variant="accent">Ouvrir le centre d&apos;aide</LinkButton>
            <LinkButton href="/contact" variant="light">Nous écrire</LinkButton>
          </div>
        </div>
      </div>
    </>
  );
}
