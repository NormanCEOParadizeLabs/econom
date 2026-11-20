import type { ReactNode } from "react";
import { ActionForm, SubmitButton, type AdminAction } from "../../_components/action-form";

/** Seules les URL https sont rendues cliquables. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  if (!href.startsWith("https://")) return <span className="break-all">{children}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold text-brand-strong underline underline-offset-2">{children}</a>;
}

/** Bouton d'action sur une ligne (suppression, changement d'état…) : formulaire à champs cachés, confirmation facultative. */
export function RowAction({
  action, fields, label, confirm, variant = "outline",
}: { action: AdminAction; fields: Record<string, string>; label: string; confirm?: string; variant?: "outline" | "danger" | "primary" | "ghost" }) {
  return (
    <ActionForm action={action} confirm={confirm}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </ActionForm>
  );
}

export const editLinkClass = "inline-flex min-h-10 items-center rounded-full border-2 border-ink/15 bg-surface px-4 text-sm font-bold hover:border-brand hover:text-brand-strong";
