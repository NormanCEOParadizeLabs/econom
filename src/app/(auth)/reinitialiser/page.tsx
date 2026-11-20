import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-4xl font-black">Nouveau mot de passe</h1>
      <p className="mt-2 mb-6 text-muted">Choisis un mot de passe que tu n&apos;utilises nulle part ailleurs.</p>
      <NewPasswordForm />
    </>
  );
}
