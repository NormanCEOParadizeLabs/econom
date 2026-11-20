import type { ReactNode } from "react";
import { Badge, Notice } from "@/components/ui";

/** En-tête commun des pages de contenu du site public. */
export function PageHero({ badge, title, children }: { badge?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="bg-surface-2">
      <div className="stagger mx-auto max-w-6xl px-4 py-12 md:py-16">
        {badge && <Badge tone="brand">{badge}</Badge>}
        <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.1rem,6.5vw,3.6rem)] font-black leading-[1.02]">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{children}</div>}
      </div>
    </section>
  );
}

/** Bandeau obligatoire en tête de chaque page légale tant qu'elle n'est pas validée. */
export function LegalDraftNotice() {
  return (
    <Notice tone="warn" title="Projet de document" className="mb-8">
      Projet de document — à faire valider par un juriste avant ouverture commerciale. Les passages surlignés{" "}
      <span className="todo-legal">[À COMPLÉTER : …]</span> dépendent de la société éditrice et restent à renseigner.
    </Notice>
  );
}

/** Champ légal restant à renseigner. */
export function Todo({ children }: { children: ReactNode }) {
  return <span className="todo-legal">[À COMPLÉTER : {children}]</span>;
}

/** Question / réponse repliable, utilisée par la FAQ, les tarifs et l'aide. */
export function Faq({ q, children, id }: { q: string; children: ReactNode; id?: string }) {
  return (
    <details id={id} className="group rounded-[1.5rem] border border-line bg-surface p-5 scroll-mt-28 open:shadow-lg open:shadow-brand/5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-lg font-extrabold [&::-webkit-details-marker]:hidden">
        <span>{q}</span>
        <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-brand-strong transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 space-y-3 leading-relaxed text-muted">{children}</div>
    </details>
  );
}
