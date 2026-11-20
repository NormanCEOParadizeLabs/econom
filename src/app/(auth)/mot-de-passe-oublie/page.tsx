import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-4xl font-black">Mot de passe oublié ?</h1>
      <p className="mt-2 mb-6 text-muted">Indique ton e-mail : on t&apos;envoie un lien pour en choisir un nouveau.</p>
      <ResetRequestForm />
      <p className="mt-8 text-center text-sm"><Link href="/connexion" className="font-bold text-brand-strong underline underline-offset-4">Retour à la connexion</Link></p>
    </>
  );
}
