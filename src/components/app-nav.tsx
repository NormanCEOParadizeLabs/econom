"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconShield } from "@/components/icons";
import { cx } from "@/components/ui";

import { MORE, TABS } from "@/components/nav-links";

const useActive = () => {
  const path = usePathname();
  return (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
};

export function BottomNav() {
  const active = useActive();
  return (
    <nav aria-label="Navigation de l'application" className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md safe-bottom">
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 pt-1.5">
        {TABS.map((t) => {
          const on = active(t.href, t.exact);
          return (
            <li key={t.href} className="flex justify-center">
              <Link href={t.href} aria-current={on ? "page" : undefined} className={cx("pressable flex min-w-16 flex-col items-center gap-0.5 rounded-2xl px-2 py-1 text-[11px] font-bold", on ? "text-brand-strong" : "text-muted")}>
                {t.main ? (
                  <span className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent shadow-lg shadow-brand/25 ring-4 ring-surface"><t.icon width={26} height={26} /></span>
                ) : (
                  <span className={cx("grid h-8 w-12 place-items-center rounded-full transition-colors", on && "bg-surface-2")}><t.icon width={22} height={22} /></span>
                )}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav({ admin }: { admin: boolean }) {
  const active = useActive();
  const item = (l: { href: string; label: string; icon: typeof IconHome; exact?: boolean }) => {
    const on = active(l.href, l.exact);
    return (
      <li key={l.href}>
        <Link href={l.href} aria-current={on ? "page" : undefined} className={cx("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold", on ? "bg-brand text-on-brand" : "text-ink/80 hover:bg-surface-2")}>
          <l.icon width={20} height={20} /> {l.label}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Navigation de l'application" className="hidden lg:block w-60 shrink-0">
      <ul className="sticky top-24 space-y-1">
        {TABS.map(item)}
        <li aria-hidden className="my-2 border-t border-line" />
        {MORE.map(item)}
        {admin && item({ href: "/admin", label: "Administration", icon: IconShield })}
      </ul>
    </nav>
  );
}

