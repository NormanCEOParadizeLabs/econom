import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger" | "light";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-strong shadow-[0_6px_0_-2px_color-mix(in_srgb,var(--brand)_35%,transparent)]",
  accent: "bg-accent text-on-accent hover:brightness-95 shadow-[0_6px_0_-2px_color-mix(in_srgb,var(--ink)_18%,transparent)]",
  outline: "border-2 border-ink/15 text-ink hover:border-brand hover:text-brand-strong bg-surface",
  ghost: "text-brand-strong hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-95",
  light: "bg-white/15 text-white hover:bg-white/25 border border-white/25",
};
const SIZES = { md: "min-h-12 px-5 text-[15px]", lg: "min-h-14 px-7 text-base", sm: "min-h-10 px-4 text-sm" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof SIZES = "md", full = false) {
  return cx(
    "pressable inline-flex items-center justify-center gap-2 rounded-full font-bold disabled:opacity-50 disabled:pointer-events-none select-none",
    VARIANTS[variant], SIZES[size], full && "w-full",
  );
}

type BtnProps = { variant?: Variant; size?: keyof typeof SIZES; full?: boolean };

export function Button({ variant, size, full, className, ...props }: BtnProps & ComponentProps<"button">) {
  return <button {...props} className={cx(buttonClass(variant, size, full), className)} />;
}

export function LinkButton({ variant, size, full, className, ...props }: BtnProps & ComponentProps<typeof Link>) {
  return <Link {...props} className={cx(buttonClass(variant, size, full), className)} />;
}

export function Card({ className, as = "div", ...props }: ComponentProps<"div"> & { as?: "div" | "section" | "article" }) {
  const Tag = as as "div";
  return <Tag {...props} className={cx("rounded-[1.5rem] bg-surface border border-line p-5", className)} />;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "accent" | "positive" | "danger" | "warn"; className?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-ink",
    brand: "bg-brand text-on-brand",
    accent: "bg-accent text-on-accent",
    positive: "bg-positive/12 text-positive",
    danger: "bg-danger/12 text-danger",
    warn: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", tones[tone], className)}>{children}</span>;
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-bold">{label}</label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-2xl border-2 border-line bg-surface px-4 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none transition-colors";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "appearance-none pr-9", props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "py-3 min-h-24", props.className)} />;
}

export function Toggle({ id, label, description, ...props }: { id: string; label: string; description?: string } & ComponentProps<"input">) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer py-1">
      <input id={id} type="checkbox" {...props} className="peer sr-only" />
      <span aria-hidden className="mt-0.5 h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/30 relative after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5 after:shadow" />
      <span className="text-sm"><span className="font-bold block">{label}</span>{description && <span className="text-muted">{description}</span>}</span>
    </label>
  );
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "danger" | "success"; title?: string; children: ReactNode; className?: string }) {
  const tones = { info: "bg-surface-2 border-line", warn: "bg-amber-500/10 border-amber-500/30", danger: "bg-danger/10 border-danger/30", success: "bg-positive/10 border-positive/30" };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-2xl border p-4 text-sm leading-relaxed", tones[tone], className)}>
      {title && <p className="font-bold mb-0.5">{title}</p>}
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border-2 border-dashed border-line p-8 text-center animate-rise">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-brand-strong">{icon}</div>
      <p className="font-display text-lg font-extrabold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted max-w-sm mx-auto">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight font-black">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Spinner({ label = "Chargement" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-2xl bg-surface-2", className)} />;
}
