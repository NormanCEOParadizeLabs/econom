import { Badge, Button, Input, LinkButton, Notice, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Empty, LoadError, Mono, Section, Table, Td } from "../_components/bits";
import { adminHref, dateTimeFr, nf, shortId, type SearchParams } from "../_lib/util";

type Audit = { id: number; actor_id: string | null; action: string; entity: string | null; entity_id: string | null; meta: unknown; created_at: string };
type StripeEvent = { id: string; type: string; error: string | null; received_at: string; stripe_created: string };
type AiLog = { id: number; user_id: string | null; kind: string; model: string; status: string; latency_ms: number | null; created_at: string };
type RateRow = { key: string; window_start: string; count: number };
type Admin = { user_id: string; created_at: string; note: string | null };

const AI_STATUS: Record<string, string> = { error: "Erreur", refused: "Refusé", invalid_output: "Sortie invalide", timeout: "Délai dépassé" };
/** Seuils connus par préfixe de clé (voir les appels à rateLimit) ; au-delà, la requête a été rejetée. */
const RATE_MAX: Record<string, number> = { events: 120, checkout: 10, portal: 20, assistant: 12, compare: 40, analyze: 8 };
const RATE_DEFAULT_MAX = 20;

function metaText(meta: unknown): string {
  if (!meta || typeof meta !== "object" || Object.keys(meta).length === 0) return "—";
  const s = JSON.stringify(meta);
  return s.length > 240 ? `${s.slice(0, 240)}…` : s;
}

export async function SecuritePanel({ sp }: { sp: SearchParams }) {
  const me = await requireAdmin();
  const db = supabaseAdmin();
  const action = (sp.action ?? "").trim().replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 60);
  const since24h = new Date(new Date().getTime() - 86_400_000).toISOString();

  let auditQuery = db.from("audit_logs").select("id, actor_id, action, entity, entity_id, meta, created_at").order("created_at", { ascending: false }).limit(100);
  if (action) auditQuery = auditQuery.ilike("action", `%${action}%`);

  const [auditRes, stripeRes, aiRes, rateRes, adminsRes] = await Promise.all([
    auditQuery,
    db.from("stripe_events").select("id, type, error, received_at, stripe_created").eq("status", "failed").order("received_at", { ascending: false }).limit(50),
    db.from("ai_usage_logs").select("id, user_id, kind, model, status, latency_ms, created_at").neq("status", "ok").order("created_at", { ascending: false }).limit(50),
    db.from("rate_limits").select("key, window_start, count").gte("window_start", since24h).gt("count", 8).order("count", { ascending: false }).limit(300),
    db.from("admins").select("user_id, created_at, note").order("created_at", { ascending: true }),
  ]);
  const audits = (auditRes.data ?? []) as Audit[];
  const stripeEvents = (stripeRes.data ?? []) as StripeEvent[];
  const aiLogs = (aiRes.data ?? []) as AiLog[];
  const rates = ((rateRes.data ?? []) as RateRow[])
    .map((r) => ({ ...r, max: RATE_MAX[r.key.split(":")[0]] ?? RATE_DEFAULT_MAX }))
    .filter((r) => r.count > r.max)
    .slice(0, 50);
  const admins = (adminsRes.data ?? []) as Admin[];

  return (
    <>
      <PageTitle title="Sécurité" subtitle="Journal d'audit, incidents de paiement et d'IA, limitation de débit, administrateurs." />

      <Section title="Journal d'audit" description="Les 100 entrées les plus récentes.">
        <form method="get" action="/admin" role="search" className="mb-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="tab" value="securite" />
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <label htmlFor="audit-action" className="mb-1.5 block text-sm font-bold">Filtrer par action</label>
            <Input id="audit-action" name="action" defaultValue={action} placeholder="Ex. admin.offer ou settings" maxLength={60} autoComplete="off" />
          </div>
          <Button type="submit" variant="outline">Filtrer</Button>
          {action && <LinkButton href={adminHref({ tab: "securite" })} variant="ghost">Effacer</LinkButton>}
        </form>
        {auditRes.error ? <LoadError what="le journal d'audit" /> : audits.length === 0 ? (
          <Empty>{action ? "Aucune entrée ne correspond à ce filtre." : "Le journal d'audit est vide."}</Empty>
        ) : (
          <Table caption="Journal d'audit" head={["Date", "Acteur", "Action", "Objet", "Détails"]} minWidth="900px">
            {audits.map((a) => (
              <tr key={a.id}>
                <Td className="whitespace-nowrap">{dateTimeFr(a.created_at)}</Td>
                <Td>{a.actor_id ? <Mono title={a.actor_id}>{shortId(a.actor_id)}</Mono> : <span className="text-muted">système</span>}</Td>
                <Td className="font-mono text-xs font-bold">{a.action}</Td>
                <Td className="text-xs">
                  {a.entity ?? "—"}
                  {a.entity_id && <span className="block font-mono text-muted" title={a.entity_id}>{a.entity_id.length > 14 ? shortId(a.entity_id) : a.entity_id}</span>}
                </Td>
                <Td className="max-w-md break-all font-mono text-xs text-muted">{metaText(a.meta)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Événements Stripe en échec" description="Webhooks reçus dont le traitement a échoué (50 derniers).">
        {stripeRes.error ? <LoadError what="les événements Stripe" /> : stripeEvents.length === 0 ? (
          <Empty>Aucun événement Stripe en échec.</Empty>
        ) : (
          <Table caption="Événements Stripe en échec" head={["Reçu le", "Événement", "Type", "Erreur"]}>
            {stripeEvents.map((e) => (
              <tr key={e.id}>
                <Td className="whitespace-nowrap">{dateTimeFr(e.received_at)}</Td>
                <Td><Mono>{e.id}</Mono></Td>
                <Td className="font-mono text-xs">{e.type}</Td>
                <Td className="max-w-md break-words text-xs text-danger">{e.error ? e.error.slice(0, 300) : "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Appels IA refusés ou en erreur" description="Les 50 plus récents, tous statuts autres que « réussi ».">
        {aiRes.error ? <LoadError what="les appels IA en erreur" /> : aiLogs.length === 0 ? (
          <Empty>Aucun appel IA refusé ou en erreur.</Empty>
        ) : (
          <Table caption="Appels IA refusés ou en erreur" head={["Date", "Utilisateur", "Type", "Modèle", "Statut", "Latence"]}>
            {aiLogs.map((l) => (
              <tr key={l.id}>
                <Td className="whitespace-nowrap">{dateTimeFr(l.created_at)}</Td>
                <Td>{l.user_id ? <Mono>{shortId(l.user_id)}</Mono> : "—"}</Td>
                <Td>{l.kind === "analysis" ? "Analyse" : l.kind === "chat" ? "Assistant" : l.kind}</Td>
                <Td className="font-mono text-xs">{l.model}</Td>
                <Td><Badge tone={l.status === "refused" ? "warn" : "danger"}>{AI_STATUS[l.status] ?? l.status}</Badge></Td>
                <Td className="num">{l.latency_ms === null ? "—" : `${nf(l.latency_ms)} ms`}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Limites de débit dépassées (24 h)" description="Fenêtres où le compteur a dépassé le seuil autorisé : signe possible d'abus ou de robot. Les clés peuvent contenir une adresse IP ou un identifiant de compte.">
        {rateRes.error ? <LoadError what="les compteurs de débit" /> : rates.length === 0 ? (
          <Empty>Aucun dépassement sur les dernières 24 heures.</Empty>
        ) : (
          <Table caption="Limites de débit dépassées" head={["Fenêtre", "Clé", "Requêtes", "Seuil"]} minWidth="520px">
            {rates.map((r) => (
              <tr key={`${r.key}|${r.window_start}`}>
                <Td className="whitespace-nowrap">{dateTimeFr(r.window_start)}</Td>
                <Td className="break-all font-mono text-xs">{r.key.length > 64 ? `${r.key.slice(0, 64)}…` : r.key}</Td>
                <Td className="num font-bold text-danger">{nf(r.count)}</Td>
                <Td className="num">{nf(r.max)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Administrateurs" description="Liste en lecture seule.">
        {adminsRes.error ? <LoadError what="la liste des administrateurs" /> : admins.length === 0 ? (
          <Empty>Aucun administrateur enregistré.</Empty>
        ) : (
          <Table caption="Administrateurs" head={["Identifiant", "Ajouté le", "Note"]} minWidth="480px">
            {admins.map((a) => (
              <tr key={a.user_id}>
                <Td><Mono>{a.user_id}</Mono>{a.user_id === me.id && <Badge tone="brand" className="ml-2">toi</Badge>}</Td>
                <Td className="whitespace-nowrap">{dateTimeFr(a.created_at)}</Td>
                <Td>{a.note ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
        <Notice tone="info" className="mt-3">
          L&apos;ajout ou le retrait d&apos;un administrateur ne se fait pas depuis cette interface, mais en SQL, avec un accès direct à la base :{" "}
          <code className="mt-1 block overflow-x-auto rounded bg-surface px-2 py-1.5 font-mono text-xs">insert into public.admins (user_id) values (&apos;…&apos;)</code>
        </Notice>
      </Section>
    </>
  );
}
