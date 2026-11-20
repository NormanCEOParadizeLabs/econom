import Link from "next/link";
import { Wordmark } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 grid md:grid-cols-2">
      <aside className="on-hero relative hidden md:flex flex-col justify-between overflow-hidden bg-hero p-10 text-white">
        <div aria-hidden className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <Link href="/" aria-label="ECONOM. — accueil"><Wordmark tone="light" className="h-7 w-auto" /></Link>
        <div className="relative">
          <p className="font-display text-5xl font-black leading-[0.95]">Ton argent.<br /><span className="inline-block -rotate-1 mt-2 rounded-2xl bg-accent px-3 text-on-accent">Tes règles.</span></p>
          <p className="mt-5 max-w-sm text-white/85">Compare, suis tes abonnements et garde plus chaque mois. Gratuit pour commencer.</p>
        </div>
        <p className="relative text-xs text-white/60">Les économies affichées sont des estimations, jamais des garanties.</p>
      </aside>
      <main id="contenu" className="flex flex-col px-5 py-8 md:justify-center">
        <Link href="/" aria-label="ECONOM. — accueil" className="md:hidden mb-8 self-start"><Wordmark className="h-6 w-auto" /></Link>
        <div className="mx-auto w-full max-w-sm animate-rise">{children}</div>
      </main>
    </div>
  );
}
