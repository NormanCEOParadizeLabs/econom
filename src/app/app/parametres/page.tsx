import type { Metadata } from "next";
import Link from "next/link";
import { AppearancePicker, PreferencesForm } from "@/components/small-forms";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Paramètres" };

export default async function Page() {
  await requireUser();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("user_preferences").select("notif_email, notif_push, notif_deals, notif_monthly_summary, analytics_consent").maybeSingle();
  const prefs = data ?? { notif_email: true, notif_push: false, notif_deals: false, notif_monthly_summary: true, analytics_consent: false };
  return (
    <div className="space-y-5">
      <PageTitle title="Paramètres" subtitle="Notifications, confidentialité et apparence." />
      <AppearancePicker />
      <PreferencesForm prefs={prefs} pushAvailable={Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)} />
      <p className="text-sm text-muted">Pour exporter ou supprimer tes données, rends-toi dans <Link href="/app/compte" className="font-bold underline underline-offset-4">Mon compte</Link>. Documents : <Link href="/confidentialite" className="underline">confidentialité</Link>, <Link href="/cookies" className="underline">cookies</Link>, <Link href="/cgu" className="underline">CGU</Link>, <Link href="/cgv" className="underline">CGV</Link>, <Link href="/mentions-legales" className="underline">mentions légales</Link>.</p>
    </div>
  );
}
