"use client";
import { useState } from "react";
import { completeOnboarding } from "@/app/app/actions";
import { Button, cx } from "@/components/ui";
import { IconCompare, IconPiggy, IconScan, IconShield } from "@/components/icons";

const STEPS = [
  { icon: IconCompare, title: "Compare au vrai prix", text: "ECONOM. calcule le coût complet sur 12 ou 24 mois : promotions qui s'arrêtent, carte SIM, frais de résiliation. Pas juste le prix d'appel." },
  { icon: IconScan, title: "Scanne, vérifie, décide", text: "Prends ta facture en photo. Les montants sont lus automatiquement, tu les confirmes, et la comparaison se lance." },
  { icon: IconPiggy, title: "Suis ce que tu gardes", text: "Chaque économie est rangée à sa place : potentielle tant que tu n'as pas changé, confirmée quand c'est fait." },
  { icon: IconShield, title: "Tes données, tes règles", text: "Tes factures ne sont pas conservées. Tu peux exporter ou supprimer ton compte à tout moment. Aucune économie n'est jamais garantie : on te donne les chiffres, tu choisis." },
];

export function Onboarding() {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div className="flex min-h-[70vh] flex-col justify-between gap-8">
      <div key={i} className="animate-rise pt-6" aria-live="polite">
        <div className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-brand text-on-brand shadow-xl shadow-brand/30"><step.icon width={36} height={36} /></div>
        <p className="mt-6 text-sm font-bold text-muted">Étape {i + 1} sur {STEPS.length}</p>
        <h1 className="mt-1 font-display text-4xl font-black leading-[1.02]">{step.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{step.text}</p>
      </div>
      <div>
        <div className="mb-5 flex gap-1.5" aria-hidden>
          {STEPS.map((_, n) => <span key={n} className={cx("h-1.5 flex-1 rounded-full transition-colors", n <= i ? "bg-brand" : "bg-line")} />)}
        </div>
        {last ? (
          <form action={completeOnboarding}><Button type="submit" size="lg" full variant="accent">C&apos;est parti</Button></form>
        ) : (
          <div className="flex gap-3">
            <form action={completeOnboarding}><Button type="submit" variant="ghost" size="lg">Passer</Button></form>
            <Button size="lg" className="flex-1" onClick={() => setI(i + 1)}>Continuer</Button>
          </div>
        )}
      </div>
    </div>
  );
}
