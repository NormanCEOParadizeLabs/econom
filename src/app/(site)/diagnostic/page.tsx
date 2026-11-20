import type { Metadata } from "next";
import Link from "next/link";
import { IconChevron, IconPhone, IconRepeat, IconScan, IconWifi } from "@/components/icons";

export const metadata: Metadata = {
  title: "Diagnostic gratuit — combien pourrais-tu économiser ?",
  description: "Choisis une dépense à vérifier : forfait mobile ou box internet. Diagnostic gratuit, sans inscription, calculé sur 12 et 24 mois.",
  alternates: { canonical: "/diagnostic" },
};

const CHOICES = [
  { href: "/comparateur/mobile", icon: IconPhone, title: "Mon forfait mobile", text: "2 minutes · sans compte", tag: "Le plus rapide" },
  { href: "/comparateur/internet", icon: IconWifi, title: "Ma box internet", text: "2 minutes · sans compte" },
  { href: "/app/scanner", icon: IconScan, title: "Scanner une facture", text: "Lecture automatique · compte gratuit requis" },
  { href: "/app/abonnements", icon: IconRepeat, title: "Mes abonnements", text: "Streaming, sport, logiciels · compte gratuit requis" },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl font-black leading-[1.02]">Qu&apos;est-ce qu&apos;on vérifie en premier ?</h1>
      <p className="mt-3 text-lg text-muted">Choisis une dépense. Tu vois ton résultat tout de suite, sans créer de compte.</p>
      <ul className="mt-6 space-y-3 stagger">
        {CHOICES.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="pressable flex items-center gap-4 rounded-[1.5rem] border-2 border-line bg-surface p-4 hover:border-brand">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-on-brand"><c.icon width={26} height={26} /></span>
              <span className="flex-1"><span className="flex flex-wrap items-center gap-2 font-display text-xl font-extrabold">{c.title}{c.tag && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">{c.tag}</span>}</span><span className="text-sm text-muted">{c.text}</span></span>
              <IconChevron className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
