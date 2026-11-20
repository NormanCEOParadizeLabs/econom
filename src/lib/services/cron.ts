import "server-only";
import { configured, env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { compare, eurosToCents, type Needs } from "@/lib/engine";
import { loadPublicOffers } from "@/lib/catalog";
import { runDealsFinder } from "@/lib/ai/deals-finder";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (n: number) => iso(new Date(Date.now() + n * 864e5));

type Notif = { user_id: string; kind: string; title: string; body: string; link: string; dedupe_key: string };

/** Tâches quotidiennes : rappels, échéances, nouvelles opportunités, résumé mensuel, hygiène du catalogue. Idempotent (clés de déduplication). */
export async function runDaily(now = new Date()): Promise<Record<string, number>> {
  const db = supabaseAdmin();
  const today = iso(now);
  const out: Notif[] = [];
  const stats: Record<string, number> = {};

  // 1. Rappels de prélèvement et fins d'engagement (ECONOM. Plus).
  const { data: contracts } = await db.from("user_contracts").select("id, user_id, name, price_cents, next_charge_date, commitment_end, renewal_date, reminder_days").eq("active", true).or(`next_charge_date.gte.${today},commitment_end.gte.${today},renewal_date.gte.${today}`).limit(5000);
  const plusCache = new Map<string, boolean>();
  const isPlus = async (uid: string) => {
    if (!plusCache.has(uid)) plusCache.set(uid, (await db.rpc("has_plus", { uid })).data === true);
    return plusCache.get(uid)!;
  };
  for (const c of contracts ?? []) {
    if (!(await isPlus(c.user_id))) continue;
    if (c.reminder_days !== null && c.next_charge_date === plusDays(c.reminder_days)) {
      out.push({ user_id: c.user_id, kind: "charge_reminder", title: `Prélèvement à venir : ${c.name}`, body: `${(c.price_cents / 100).toFixed(2).replace(".", ",")} € seront prélevés ${c.reminder_days === 0 ? "aujourd'hui" : `dans ${c.reminder_days} jour${c.reminder_days > 1 ? "s" : ""}`}.`, link: `/app/abonnements/${c.id}`, dedupe_key: `charge-${c.id}-${c.next_charge_date}` });
    }
    for (const [field, label] of [["commitment_end", "Fin d'engagement"], ["renewal_date", "Renouvellement"]] as const) {
      if (c[field] === plusDays(30)) out.push({ user_id: c.user_id, kind: "renewal", title: `${label} dans 30 jours : ${c.name}`, body: "C'est le bon moment pour comparer et décider si tu gardes cette offre.", link: `/app/abonnements/${c.id}`, dedupe_key: `${field}-${c.id}-${c[field]}` });
    }
  }
  stats.reminders = out.length;

  // 2. Meilleure offre apparue depuis la dernière comparaison enregistrée (Plus).
  const { data: comps } = await db.from("comparison_results").select("user_id, category, months, input, best_net_saving_cents, created_at").order("created_at", { ascending: false }).limit(2000);
  const seen = new Set<string>();
  const catalogs = { mobile: await loadPublicOffers("mobile"), internet: await loadPublicOffers("internet") };
  let better = 0;
  for (const c of comps ?? []) {
    const key = `${c.user_id}:${c.category}`;
    if (seen.has(key) || (c.category !== "mobile" && c.category !== "internet")) continue;
    seen.add(key);
    if (!(await isPlus(c.user_id))) continue;
    const input = c.input as { currentMonthlyEuros?: number; exitFeeEuros?: number; needs?: Needs };
    if (!input.currentMonthlyEuros) continue;
    try {
      const res = compare({ category: c.category, months: c.months as 12 | 24, current: { monthlyCents: eurosToCents(input.currentMonthlyEuros), exitFeeCents: eurosToCents(input.exitFeeEuros ?? 0) }, needs: input.needs ?? {}, offers: catalogs[c.category as "mobile" | "internet"] });
      const best = res.results[0];
      if (best?.isSaving && best.netSavingCents >= Math.max(c.best_net_saving_cents ?? 0, 0) + 2000) {
        better++;
        out.push({ user_id: c.user_id, kind: "better_offer", title: "Une offre plus intéressante est apparue", body: `Économie nette estimée : ${(best.netSavingCents / 100).toFixed(0)} € sur ${c.months} mois, d'après ta dernière comparaison. À vérifier.`, link: `/app/comparer${c.category === "internet" ? "?type=internet" : ""}`, dedupe_key: `better-${c.category}-${best.offer.id}` });
      }
    } catch {}
  }
  stats.better_offers = better;

  // 3. Bons plans favoris qui expirent dans 3 jours (préférence activée).
  const { data: expiring } = await db.from("local_deals").select("id, title, valid_until").eq("status", "verified").eq("valid_until", plusDays(3));
  for (const d of expiring ?? []) {
    const { data: favs } = await db.from("favorites").select("user_id").eq("kind", "deal").eq("ref_id", d.id);
    for (const f of favs ?? []) {
      const { data: p } = await db.from("user_preferences").select("notif_deals").eq("user_id", f.user_id).maybeSingle();
      if (p?.notif_deals) out.push({ user_id: f.user_id, kind: "deal_expiring", title: "Un bon plan favori se termine bientôt", body: `« ${d.title} » expire dans 3 jours.`, link: `/app/bons-plans/${d.id}`, dedupe_key: `deal-exp-${d.id}` });
    }
  }

  // 4. Résumé mensuel, le 1er du mois : distingue économies réalisées et potentielles.
  if (now.getUTCDate() === 1) {
    const { data: prefs } = await db.from("user_preferences").select("user_id").eq("notif_monthly_summary", true).limit(20000);
    for (const p of prefs ?? []) {
      const [{ data: real }, { data: opps }] = await Promise.all([db.from("realized_savings").select("monthly_cents").eq("user_id", p.user_id), db.from("saving_opportunities").select("net_saving_cents").eq("user_id", p.user_id).eq("status", "potential")]);
      const r = (real ?? []).reduce((a, x) => a + x.monthly_cents, 0);
      const o = (opps ?? []).reduce((a, x) => a + Math.max(0, x.net_saving_cents), 0);
      if (r + o === 0) continue;
      out.push({ user_id: p.user_id, kind: "monthly_summary", title: "Ton mois avec ECONOM.", body: `Économies réalisées : ${(r / 100).toFixed(0)} € par mois. Économies potentielles encore à saisir : ${(o / 100).toFixed(0)} €.`, link: "/app/rapport", dedupe_key: `summary-${today.slice(0, 7)}` });
    }
  }

  // 5. Catalogue : alerte les administrateurs sur les offres qui expirent sous 7 jours ou sont expirées.
  const { count: stale } = await db.from("offers").select("id", { count: "exact", head: true }).eq("status", "verified").lte("valid_until", plusDays(7));
  if (stale) {
    const { data: admins } = await db.from("admins").select("user_id");
    for (const a of admins ?? []) out.push({ user_id: a.user_id, kind: "system", title: `${stale} offre(s) à revérifier`, body: "Des offres du catalogue expirent sous 7 jours ou sont déjà masquées.", link: "/admin?tab=offres", dedupe_key: `offers-stale-${today}` });
  }
  stats.stale_offers = stale ?? 0;

  let created = 0;
  for (let i = 0; i < out.length; i += 200) {
    const { data } = await db.from("notifications").upsert(out.slice(i, i + 200), { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }).select("id");
    created += data?.length ?? 0;
  }
  stats.notifications_created = created;

  // 6. E-mails transactionnels (si un fournisseur est configuré et que l'utilisateur l'accepte).
  stats.emails_sent = configured.email() ? await sendPendingEmails() : 0;

  // 6 bis. Bons plans : revérification des sources puis recherche automatique dans la ville suivante.
  try {
    const f = await runDealsFinder();
    stats.deals_rechecked = f.rechecked.kept + f.rechecked.archived;
    stats.deals_archived = f.rechecked.archived;
    stats.deals_published = f.reports.reduce((a, r) => a + r.published, 0);
  } catch {
    stats.deals_finder_error = 1;
  }

  // 7. Hygiène : compteurs de débit et événements anciens.
  await db.from("rate_limits").delete().lt("window_start", new Date(Date.now() - 2 * 864e5).toISOString());
  await db.from("analytics_events").delete().lt("created_at", new Date(Date.now() - 400 * 864e5).toISOString());
  return stats;
}

async function sendPendingEmails(): Promise<number> {
  const db = supabaseAdmin();
  const { data: pending } = await db.from("notifications").select("id, user_id, title, body, link, kind").is("emailed_at", null).neq("kind", "system").gte("created_at", new Date(Date.now() - 2 * 864e5).toISOString()).limit(300);
  let sent = 0;
  for (const n of pending ?? []) {
    const { data: pref } = await db.from("user_preferences").select("notif_email").eq("user_id", n.user_id).maybeSingle();
    if (pref?.notif_email === false) { await db.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id); continue; }
    const { data: u } = await db.auth.admin.getUserById(n.user_id);
    if (!u.user?.email) continue;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: u.user.email, subject: n.title, text: `${n.body ?? ""}\n\n${env.appUrl}${n.link ?? "/app"}\n\n—\nTu reçois cet e-mail car les notifications sont activées dans ECONOM. Pour les désactiver : ${env.appUrl}/app/parametres` }),
    }).catch(() => null);
    if (res?.ok) { sent++; await db.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id); }
  }
  return sent;
}
