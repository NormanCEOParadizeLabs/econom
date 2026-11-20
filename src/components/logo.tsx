import { LOGO } from "./logo-paths";

/** Logotype ECONOM. — tracés vectoriels, sans dépendance à une police. */
export function Wordmark({ className = "h-6", tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  const [w, h] = LOGO.viewBox;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label="ECONOM.">
      <path d={LOGO.word} fill={tone === "light" ? "#F8F8F2" : "var(--ink)"} />
      <path d={LOGO.dot} fill={tone === "light" ? "var(--accent)" : "var(--brand)"} />
    </svg>
  );
}

export function Symbol({ className = "h-10 w-10", boxed = true }: { className?: string; boxed?: boolean }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      {boxed && <rect width="512" height="512" rx="116" fill="var(--brand)" />}
      <path d={LOGO.bars} fill={boxed ? "#F8F8F2" : "var(--brand)"} />
      <path d={LOGO.symbolDot} fill="var(--accent)" />
    </svg>
  );
}
