"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TABS } from "../_lib/util";

export function AdminTabs() {
  const current = useSearchParams().get("tab") ?? "apercu";
  const active = TABS.some((t) => t.id === current) ? current : "apercu";
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
                className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors ${
                  on ? "bg-brand text-on-brand" : "bg-surface text-ink border border-line hover:border-brand hover:text-brand-strong"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
