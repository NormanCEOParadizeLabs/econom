import { requireAdmin } from "@/lib/auth";
import { TABS, type SearchParams, type TabId } from "./_lib/util";
import { ApercuPanel } from "./_panels/apercu";
import { BonsPlansPanel } from "./_panels/bons-plans";
import { BusinessPanel } from "./_panels/business";
import { IaPanel } from "./_panels/ia";
import { OffresPanel } from "./_panels/offres";
import { ParametresPanel } from "./_panels/parametres";
import { SecuritePanel } from "./_panels/securite";
import { UtilisateursPanel } from "./_panels/utilisateurs";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const raw = await searchParams;
  const sp: SearchParams = {};
  for (const [k, v] of Object.entries(raw)) sp[k] = (Array.isArray(v) ? v[0] : v)?.slice(0, 200);
  const tab: TabId = TABS.find((t) => t.id === sp.tab)?.id ?? "apercu";

  switch (tab) {
    case "utilisateurs": return <UtilisateursPanel sp={sp} />;
    case "offres": return <OffresPanel sp={sp} />;
    case "bons-plans": return <BonsPlansPanel sp={sp} />;
    case "ia": return <IaPanel />;
    case "business": return <BusinessPanel />;
    case "securite": return <SecuritePanel sp={sp} />;
    case "parametres": return <ParametresPanel />;
    default: return <ApercuPanel />;
  }
}
