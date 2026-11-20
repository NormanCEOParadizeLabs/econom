import type { Metadata } from "next";
import Link from "next/link";
import { Card, LinkButton, Notice } from "@/components/ui";
import { PageHero, Todo } from "@/components/content";
import { IconChat, IconClock, IconHelp, IconLock, IconShield } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question sur ECONOM., ton compte, ton abonnement Plus ou tes données personnelles ? Voici comment nous écrire et sous quel délai nous répondons.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <>
      <PageHero badge="Contact" title="Une question ? Écris-nous.">
        On répond par e-mail, en français, et sans réponse toute faite.
      </PageHero>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-[1.2fr_.8fr]">
          <Card className="p-7">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-on-brand"><IconChat /></span>
            <h2 className="mt-4 font-display text-2xl font-black">Par e-mail</h2>
            <p className="mt-2 leading-relaxed">
              Écris-nous à l&apos;adresse : <Todo>adresse e-mail de contact</Todo>
            </p>
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">
              <IconClock width={18} height={18} className="mt-0.5 shrink-0 text-brand-strong" />
              <span>Nous répondons en général sous 2 jours ouvrés. Les demandes liées à tes données personnelles reçoivent une réponse dans le délai légal d&apos;un mois au plus.</span>
            </p>
            <h3 className="mt-6 font-display text-lg font-extrabold">Pour qu&apos;on t&apos;aide plus vite</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed text-muted">
              <li>Écris depuis l&apos;adresse e-mail de ton compte ECONOM.</li>
              <li>Décris ce que tu faisais et ce qui s&apos;est affiché (une capture d&apos;écran aide beaucoup).</li>
              <li>Précise ton appareil et ton navigateur en cas de souci technique.</li>
            </ul>
            <Notice tone="warn" className="mt-6" title="Ne nous envoie jamais">
              Ton mot de passe, ton numéro de carte bancaire ou tes identifiants bancaires. Nous ne te les demanderons jamais, ni par e-mail ni par téléphone.
            </Notice>
          </Card>

          <div className="space-y-5">
            <Card className="p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-brand-strong"><IconHelp /></span>
              <h2 className="mt-3 font-display text-xl font-extrabold">La réponse existe peut-être déjà</h2>
              <p className="mt-1.5 leading-relaxed text-muted">Résilier Plus, changer d&apos;opérateur, supprimer ton compte : les guides sont dans le centre d&apos;aide.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <LinkButton href="/aide" size="sm">Centre d&apos;aide</LinkButton>
                <LinkButton href="/faq" size="sm" variant="outline">FAQ</LinkButton>
              </div>
            </Card>
            <Card className="p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-brand-strong"><IconShield /></span>
              <h2 className="mt-3 font-display text-xl font-extrabold">Données personnelles</h2>
              <p className="mt-1.5 leading-relaxed text-muted">
                Pour exercer tes droits (accès, rectification, effacement…), écris à : <Todo>adresse e-mail dédiée à la protection des données ou du DPO</Todo>. Tu peux aussi exporter ou supprimer tes données directement depuis « Mon compte ».
              </p>
              <Link href="/confidentialite" className="mt-3 inline-block text-sm font-bold text-brand-strong underline underline-offset-4">Lire la politique de confidentialité</Link>
            </Card>
            <Card className="p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-brand-strong"><IconLock /></span>
              <h2 className="mt-3 font-display text-xl font-extrabold">Signaler une erreur ou une faille</h2>
              <p className="mt-1.5 leading-relaxed text-muted">Un prix qui ne correspond plus au site du fournisseur, un contenu inexact, un problème de sécurité ? Signale-le à la même adresse en indiquant la page concernée, pour qu&apos;on puisse vérifier et corriger.</p>
            </Card>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted">
          Courrier postal : <Todo>raison sociale et adresse postale du siège</Todo>. ECONOM. n&apos;est pas un opérateur : pour un problème de ligne, de réseau ou de facture, c&apos;est le service client de ton fournisseur qu&apos;il faut contacter.
        </p>
      </section>
    </>
  );
}
