import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Symbol } from "@/components/logo";
import { Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { AdminTabs } from "./_components/tabs";

export const metadata = { title: "Administration", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 pt-3">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="flex items-center gap-2.5">
              <Link href="/admin" aria-label="ECONOM. — Administration">
                <Symbol className="h-8 w-8" />
              </Link>
              <Badge tone="brand">Admin</Badge>
            </div>
            <Link href="/app" className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold text-brand-strong hover:bg-surface-2">
              ← Retour à l&apos;application
            </Link>
          </div>
          <Suspense fallback={<div className="h-12" />}>
            <AdminTabs />
          </Suspense>
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
