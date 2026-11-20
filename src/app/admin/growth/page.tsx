import Link from "next/link";
import { Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { SearchParams } from "../_lib/util";
import { GROWTH_TABS, growthHref, type GrowthTabId } from "./_lib/util";
import { ComptesPanel } from "./_panels/comptes";
import { ContenusPanel } from "./_panels/contenus";
import { CreateursPanel } from "./_panels/createurs";
import { ExperiencesPanel } from "./_panels/experiences";
import { HooksPanel } from "./_panels/hooks";
import { RecompensesPanel } from "./_panels/recompenses";
import { ScriptsPanel } from "./_panels/scripts";
import { TableauPanel } from "./_panels/tableau";

export const metadata = { title: "Growth Studio", robots: { index: false } };
export const dynamic = "force-dynamic";
// La génération d'un script attend la réponse du modèle (délai client : 60 s).
export const maxDuration = 90;

function Panel({ tab, sp }: { tab: GrowthTabId; sp: SearchParams }) {
  switch (tab) {
    case "contenus": return <ContenusPanel sp={sp} />;
    case "createurs": return <CreateursPanel sp={sp} />;
    case "comptes": return <ComptesPanel sp={sp} />;
    case "hooks": return <HooksPanel sp={sp} />;
    case "scripts": return <ScriptsPanel />;
    case "experiences": return <ExperiencesPanel />;
    case "recompenses": return <RecompensesPanel />;
    default: return <TableauPanel sp={sp} />;
  }
}

export default async function GrowthStudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const raw = await searchParams;
  const sp: SearchParams = {};
  for (const [k, v] of Object.entries(raw)) sp[k] = (Array.isArray(v) ? v[0] : v)?.slice(0, 200);
  const tab: GrowthTabId = GROWTH_TABS.find((t) => t.id === sp.tab)?.id ?? "tableau";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-lg font-black">
          ECONOM. Growth Studio <Badge tone="accent">Croissance</Badge>
        </p>
        <Link href="/admin" className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold text-brand-strong hover:bg-surface-2">
          ← Retour à l&apos;administration
        </Link>
      </div>
      <nav aria-label="Sections de Growth Studio" className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {GROWTH_TABS.map((t) => {
            const on = t.id === tab;
            return (
              <li key={t.id}>
                <Link
                  href={growthHref({ tab: t.id })}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-[3px] px-3 text-sm font-bold transition-colors ${
                    on ? "border-brand text-brand-strong" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Panel tab={tab} sp={sp} />
    </>
  );
}
