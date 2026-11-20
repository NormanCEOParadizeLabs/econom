import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && /^\/(?!\/)[\w\-./?=&%]*$/.test(sp.next) ? sp.next : "/app";
  return (
    <>
      <h1 className="font-display text-4xl font-black">Content de te revoir.</h1>
      <p className="mt-2 mb-6 text-muted">Connecte-toi pour retrouver tes économies.</p>
      <LoginForm next={next} linkError={sp.erreur === "lien"} />
      <p className="mt-8 text-center text-sm text-muted">
        Pas encore de compte ? <Link href="/inscription" className="font-bold text-brand-strong underline underline-offset-4">Créer un compte gratuit</Link>
      </p>
    </>
  );
}
