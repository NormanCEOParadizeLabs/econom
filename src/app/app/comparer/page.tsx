import type { Metadata } from "next";
import Link from "next/link";
import { Comparator } from "@/components/comparator";
import { PageTitle, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Comparer" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const category = sp.type === "internet" ? "internet" : "mobile";
  const clean = (v?: string, max = 100) => (v ? v.slice(0, max) : undefined);
  return (
    <>
      <PageTitle title="Comparer" subtitle="Coût complet sur 12 ou 24 mois, frais et promotions inclus." />
      <div role="tablist" aria-label="Type d'offre" className="mb-5 grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1 text-sm font-bold">
        {[["mobile", "Mobile", "/app/comparer"], ["internet", "Box internet", "/app/comparer?type=internet"], ["energie", "Énergie", "/comparateur/energie"]].map(([k, label, href]) => (
          <Link key={k} href={href} role="tab" aria-selected={category === k} className={cx("grid min-h-11 place-items-center rounded-full", category === k ? "bg-surface shadow" : "text-muted")}>{label}</Link>
        ))}
      </div>
      <Comparator key={category} category={category} loggedIn initial={{ provider: clean(sp.fournisseur, 60), plan: clean(sp.offre), price: clean(sp.prix, 10), dataGb: clean(sp.data, 8) }} />
    </>
  );
}
