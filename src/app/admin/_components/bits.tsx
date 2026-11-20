import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/components/ui";

export function Tile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "danger" | "positive" | "warn" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={cx("num mt-1 text-2xl font-black", tone === "danger" && "text-danger", tone === "positive" && "text-positive", tone === "warn" && "text-amber-700 dark:text-amber-300")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function Section({ title, description, children, id, action }: { title: string; description?: ReactNode; children: ReactNode; id?: string; action?: ReactNode }) {
  return (
    <section id={id} className="mt-8 first:mt-0" aria-label={title}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Table({ caption, head, children, minWidth = "640px" }: { caption: string; head: string[]; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-surface-2">
            {head.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">{h}</th>)}
          </tr>
        </thead>
        <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td {...props} className={cx("px-3 py-2.5 align-top", className)} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

export function LoadError({ what }: { what: string }) {
  return <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm font-semibold text-danger">Impossible de charger {what}. Réessaie dans un instant.</p>;
}

export function Mono({ children, title }: { children: ReactNode; title?: string }) {
  return <code title={title} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{children}</code>;
}

export function Progress({ ratio, label, alertAt }: { ratio: number; label: string; alertAt?: number }) {
  const r = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const over = ratio >= 1;
  const warn = alertAt !== undefined && ratio >= alertAt;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r * 100)} className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={cx("h-full rounded-full", over ? "bg-danger" : warn ? "bg-amber-500" : "bg-brand")} style={{ width: `${r * 100}%` }} />
    </div>
  );
}

export const smallInput = "min-h-10 rounded-xl px-3 text-sm";
