"use client";

import { useState } from "react";

/** Champ en lecture seule avec bouton « Copier » (repli : sélection du texte). */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="min-h-10 w-full min-w-0 rounded-xl border border-line bg-surface-2 px-2.5 font-mono text-xs text-ink"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {}
        }}
        className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-xs font-bold hover:border-brand hover:text-brand-strong"
      >
        <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
      </button>
    </span>
  );
}
