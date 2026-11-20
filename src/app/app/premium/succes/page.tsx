import type { Metadata } from "next";
import { ActivationWatcher } from "@/components/billing-buttons";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Activation de Plus" };

export default async function Page() {
  await requireUser();
  return <div className="mx-auto max-w-md pt-8"><ActivationWatcher /></div>;
}
