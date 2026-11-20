"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TABS } from "../_lib/util";

export function AdminTabs() {
  const current = useSearchParams().get("tab") ?? "apercu";
  const growth = usePathname().startsWith("/admin/growth");
  const active = growth ? "" : TABS.some((t) => t.id === current) ? current : "apercu";
  const pill = (on: boolean) =>
    `inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors ${
      on ? "bg-brand text-on-brand" : "bg-surface text-ink border border-line hover:border-brand hover:text-brand-strong"
    }`;
  return (
    <nav aria-label="Sections de l'administration" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1.5 pb-2">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <li key={t.id}>
              <Link
                href={`/admin?tab=${t.id}`}
                aria-current={on ? "page" : undefined}
                className={pill(on)}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link href="/admin/growth" aria-current={growth ? "page" : undefined} className={pill(growth)}>
            Growth Studio
          </Link>
        </li>
      </ul>
    </nav>
  );
}
