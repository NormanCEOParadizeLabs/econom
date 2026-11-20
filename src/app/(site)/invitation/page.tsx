import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Card, LinkButton } from "@/components/ui";
import { IconCheck, IconGift } from "@/components/icons";
import { REF_COOKIE, isReferralCode } from "@/lib/services/referral";

export const metadata: Metadata = {
  title: "Un ami t'invite sur ECONOM.",
  description: "Découvre gratuitement combien tu pourrais économiser sur ton forfait mobile ou ta box. Sans inscription pour commencer.",
  openGraph: { title: "Un ami t'invite à découvrir combien tu pourrais économiser", description: "Diagnostic gratuit, sans inscription. Calcul sur 12 et 24 mois, frais inclus." },
  robots: { index: false },
};

export default async function Page() {
  const invited = isReferralCode((await cookies()).get(REF_COOKIE)?.value);
  return (
    <div className="mx-auto max-w-xl px-4 py-10 stagger">
      <div className="on-hero relative overflow-hidden rounded-[2rem] bg-hero p-7 text-white">
        <div aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/30 blur-2xl" />
        <p className="relative inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold"><IconGift width={16} height={16} className="text-accent" /> {invited ? "Invitation personnelle" : "Bienvenue"}</p>
        <h1 className="relative mt-4 font-display text-4xl font-black leading-[1.02]">{invited ? "Un ami t'invite à découvrir combien tu pourrais économiser." : "Découvre combien tu pourrais économiser."}</h1>
        <p className="relative mt-3 text-white/90">Indique ce que tu paies aujourd&apos;hui : ECONOM. compare avec des offres vérifiées et calcule ton économie nette, frais inclus. Deux minutes, sans inscription.</p>
        <LinkButton href="/diagnostic" variant="accent" size="lg" full className="relative mt-6">Calculer mes économies gratuitement</LinkButton>
      </div>
      <Card className="mt-4">
        <ul className="space-y-2.5 text-sm">
          {["Aucun compte nécessaire pour ton premier diagnostic.", "Des offres vérifiées sur le site officiel des opérateurs, avec la date.", "Si changer ne te fait rien gagner, on te le dit.", invited ? "Si tu crées un compte ensuite, ton ami sera reconnu comme ton parrain." : "Tu peux créer un compte ensuite pour garder tes résultats."].map((t) => (
            <li key={t} className="flex gap-2.5"><IconCheck width={18} height={18} className="mt-0.5 shrink-0 text-brand-strong" />{t}</li>
          ))}
        </ul>
      </Card>
      <p className="mt-4 text-center text-xs text-muted">Les économies affichées sont des estimations, jamais des garanties.</p>
    </div>
  );
}
