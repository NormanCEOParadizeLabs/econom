import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function Page() {
  await requireUser();
  return <Onboarding />;
}
