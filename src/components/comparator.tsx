"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CompareOutput, ComparedOffer } from "@/lib/engine";
import { dateFr, euro } from "@/lib/format";
import { attribution, trackClient, useExperiment } from "@/lib/track-client";
import { InviteButton, SavingsCardStudio } from "@/components/savings-card";
import type { BestSummary } from "@/lib/services/comparison";
import { Badge, Button, Card, EmptyState, Field, Input, LinkButton, Notice, Select, Spinner, Toggle, cx } from "@/components/ui";
import { IconArrow, IconCheck, IconClock, IconCompare, IconExternal, IconX } from "@/components/icons";

type Category = "mobile" | "internet";
export interface ComparatorInitial {
  provider?: string;
  plan?: string;
  price?: string;
  dataGb?: string;
}

const NETWORKS = ["Orange", "SFR", "Bouygues Telecom", "Free"] as const;
type Result = CompareOutput & { savedId: string | null; best: BestSummary | null };

/** Compteur animé jusqu'au montant réel calculé (aucun délai artificiel : l'animation dure moins d'une seconde). */
function CountUp({ cents, className }: { cents: number; className?: string }) {
  const [v, setV] = useState(cents);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(cents);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setV(Math.round(cents * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cents]);
  return <span className={className} aria-label={euro(cents)}><span aria-hidden>{euro(v)}</span></span>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-4 py-1.5", strong && "font-bold border-t border-line mt-1 pt-2.5")}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="num text-right whitespace-nowrap">{value}</dd>
    </div>
  );
}

function OfferCard({ r, rank, category }: { r: ComparedOffer; rank: number; category: Category }) {
  const o = r.offer;
  const specs = category === "mobile"
    ? [o.dataGb !== null && `${o.dataGb} Go`, o.fiveG ? "5G" : "4G", o.roamingGb ? `${o.roamingGb} Go UE` : null, o.hostNetwork && `Réseau ${o.hostNetwork}`, o.commitmentMonths ? `Engagement ${o.commitmentMonths} mois` : "Sans engagement"]
    : [o.technology === "fibre" ? "Fibre" : o.technology?.toUpperCase(), o.downloadMbps && `${o.downloadMbps >= 1000 ? `${o.downloadMbps / 1000} Gb/s` : `${o.downloadMbps} Mb/s`} ↓`, o.hasTv && "TV incluse", o.hasPhone && "Téléphone fixe", o.commitmentMonths ? `Engagement ${o.commitmentMonths} mois` : "Sans engagement"];
  return (
    <Card as="article" id={rank === 0 ? "meilleure-offre" : undefined} className={cx("animate-rise scroll-mt-24", rank === 0 && r.isSaving && "border-2 border-brand shadow-xl shadow-brand/10")} aria-label={`${o.provider} ${o.name}`}>
      <div className="flex flex-wrap items-center gap-2">
        {rank === 0 && r.isSaving && <Badge tone="brand">Meilleure économie nette</Badge>}
        {o.isPartner && <Badge tone="warn">Partenaire commercial</Badge>}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted"><IconClock width={14} height={14} /> Vérifiée le {dateFr(o.verifiedAt, { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
      <h3 className="mt-3 font-display text-xl font-extrabold leading-tight">
        <span className="text-muted font-bold text-sm block">{o.provider}</span>
        {o.name}
      </h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">{specs.filter(Boolean).map((s) => <li key={String(s)}><Badge>{s}</Badge></li>)}</ul>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xs font-bold text-muted">Prix</p>
          <p className="num text-2xl font-black">{euro(o.monthlyCents)}<span className="text-sm font-bold">/mois</span></p>
          {o.introMonths > 0 && o.afterCents !== o.monthlyCents && <p className="text-xs font-semibold">puis {euro(o.afterCents)}/mois après {o.introMonths} mois</p>}
        </div>
        <div className={cx("rounded-2xl p-3", r.isSaving ? "bg-accent text-on-accent" : "bg-surface-2")}>
          <p className="text-xs font-bold">{r.isSaving ? `Économie nette estimée sur ${r.months} mois` : `Surcoût sur ${r.months} mois`}</p>
          <p className="num text-2xl font-black">{r.isSaving ? euro(r.netSavingCents) : r.netSavingCents === 0 ? euro(0) : euro(-r.netSavingCents, { sign: true })}</p>
          <p className="text-xs font-semibold">{r.isSaving ? `≈ ${euro(r.monthlyEquivalentSavingCents)} par mois` : "Changer ne te fait pas économiser"}</p>
        </div>
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-sm font-bold text-brand-strong inline-flex items-center gap-1 py-2">
          Voir le détail du calcul <IconArrow width={16} height={16} className="transition-transform group-open:rotate-90" />
        </summary>
        <dl className="mt-1 text-sm">
          <Row label={`Ton offre actuelle sur ${r.months} mois`} value={euro(r.currentCostCents)} />
          <Row label={`Abonnement de cette offre sur ${r.months} mois`} value={euro(r.offerCost.recurringCents)} />
          {o.activationFeeCents > 0 && <Row label="Frais d'activation / mise en service" value={euro(o.activationFeeCents)} />}
          {o.simFeeCents > 0 && <Row label="Carte SIM" value={euro(o.simFeeCents)} />}
          {r.exitFeeCents > 0 && <Row label="Frais de résiliation de ton offre actuelle" value={euro(r.exitFeeCents)} />}
          <Row label="Coût total du changement" value={euro(r.switchCostCents)} />
          <Row strong label={r.isSaving ? "Économie nette" : "Différence"} value={euro(r.netSavingCents, { sign: r.netSavingCents > 0 })} />
        </dl>
        {r.breakEvenMonth && r.breakEvenMonth > 1 && <p className="mt-2 text-sm text-muted">Les frais de départ sont amortis à partir du {r.breakEvenMonth}ᵉ mois.</p>}
        {o.terminationFeeCents > 0 && <p className="mt-2 text-sm text-muted">Frais si tu quittes cette offre plus tard : {euro(o.terminationFeeCents)}.</p>}
        {(o.conditions || o.promoConditions) && <p className="mt-2 text-sm text-muted">{[o.promoConditions, o.conditions].filter(Boolean).join(" ")}</p>}
      </details>

      {r.warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {r.warnings.map((w) => <li key={w} className="flex gap-2"><span aria-hidden>•</span>{w}</li>)}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => trackClient("offer_clicked", { category, partner: o.isPartner })} className="pressable inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-5 font-bold text-on-brand hover:bg-brand-strong">
          Voir l&apos;offre sur le site officiel <IconExternal width={18} height={18} />
        </a>
      </div>
      <p className="mt-2 text-xs text-muted">
        Source : {(o.sources?.length ? o.sources : [{ url: o.url, label: null, checkedAt: o.verifiedAt ?? "" }]).map((s, i) => (
          <span key={s.url + i}>{i > 0 && ", "}<a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">{s.label || new URL(s.url).hostname}</a></span>
        ))}. Le site du fournisseur fait foi.
      </p>
    </Card>
  );
}

export function Comparator({ category, initial = {}, loggedIn, shareLink }: { category: Category; initial?: ComparatorInitial; loggedIn: boolean; shareLink: string }) {
  const [studio, setStudio] = useState(false);
  const shareCta = useExperiment("result_share_cta", { key: "partager", label: "Partager mon résultat" });
  const invitePos = useExperiment("result_invite_position", { key: "hero", label: "" });
  const uid = useId();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [months, setMonths] = useState<12 | 24>(12);
  const [networks, setNetworks] = useState<string[]>([]);
  const [engaged, setEngaged] = useState(false);
  const [priceChange, setPriceChange] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const id = (n: string) => `${uid}-${n}`;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => {
      const v = String(f.get(k) ?? "").replace(",", ".").trim();
      return v === "" ? undefined : Number(v);
    };
    const price = num("price");
    if (!price || price <= 0 || Number.isNaN(price)) {
      setFieldErrors({ price: "Indique le prix que tu paies chaque mois." });
      document.getElementById(id("price"))?.focus();
      return;
    }
    setFieldErrors({});
    setError(null);
    setPending(true);
    const needs = category === "mobile"
      ? { minDataGb: num("usage") ?? num("data"), minRoamingGb: num("roaming"), require5G: f.get("fiveG") === "on", networks, noCommitmentOnly: f.get("noCommit") === "on" }
      : { technology: (f.get("technology") as string) || null, minDownloadMbps: num("speed"), requireTv: f.get("tv") === "on", requirePhone: f.get("phone") === "on", noCommitmentOnly: f.get("noCommit") === "on" };
    const body = {
      category, months,
      currentProvider: String(f.get("provider") ?? "") || undefined,
      currentPlan: String(f.get("plan") ?? "") || undefined,
      currentMonthlyEuros: price,
      exitFeeEuros: engaged ? num("exitFee") ?? 0 : 0,
      priceChange: priceChange && num("pcPrice") !== undefined ? { afterMonths: Math.round(num("pcMonths") ?? 0), newMonthlyEuros: num("pcPrice") } : null,
      needs, save: loggedIn, ...attribution(),
    };
    try {
      const res = await fetch("/api/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Comparaison impossible pour le moment.");
        setResult(null);
      } else {
        setResult(json);
        requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch {
      setError("Connexion impossible. Vérifie ton réseau et réessaie.");
    } finally {
      setPending(false);
    }
  }

  const savings = result?.results.filter((r) => r.isSaving) ?? [];
  const others = result?.results.filter((r) => !r.isSaving) ?? [];

  return (
    <div className="space-y-6">
      <form onSubmit={submit} noValidate className="space-y-5">
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-extrabold">Ton offre actuelle</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={category === "mobile" ? "Opérateur" : "Fournisseur d'accès"} htmlFor={id("provider")}>
              <Input id={id("provider")} name="provider" defaultValue={initial.provider} maxLength={60} placeholder={category === "mobile" ? "Ton opérateur actuel" : "Ton fournisseur actuel"} autoComplete="off" />
            </Field>
            <Field label={category === "mobile" ? "Forfait" : "Offre"} htmlFor={id("plan")}>
              <Input id={id("plan")} name="plan" defaultValue={initial.plan} maxLength={100} placeholder="Nom de ton offre (facultatif)" autoComplete="off" />
            </Field>
            <Field label="Prix payé chaque mois (€)" htmlFor={id("price")} error={fieldErrors.price} hint="Le montant TTC prélevé pour l'abonnement, options incluses.">
              <Input id={id("price")} name="price" inputMode="decimal" defaultValue={initial.price} placeholder="Ex. 24,99" required aria-invalid={Boolean(fieldErrors.price)} aria-describedby={fieldErrors.price ? `${id("price")}-error` : `${id("price")}-hint`} />
            </Field>
            {category === "mobile" && (
              <Field label="Data incluse dans ton forfait (Go)" htmlFor={id("data")}>
                <Input id={id("data")} name="data" inputMode="decimal" defaultValue={initial.dataGb} placeholder="Ex. 100" />
              </Field>
            )}
          </div>
          <Toggle id={id("engaged")} label="Je suis encore engagé ou j'aurai des frais de résiliation" checked={engaged} onChange={(e) => setEngaged(e.target.checked)} />
          {engaged && (
            <Field label="Frais de résiliation estimés (€)" htmlFor={id("exitFee")} hint={category === "mobile" ? "Indiqués dans ton espace client. Après 12 mois d'engagement, la loi limite ces frais à 25 % des mensualités restantes." : "Souvent des frais fixes de résiliation de box, indiqués dans ta brochure tarifaire."}>
              <Input id={id("exitFee")} name="exitFee" inputMode="decimal" placeholder="Ex. 49" />
            </Field>
          )}
          <Toggle id={id("pc")} label="Mon prix actuel va changer (fin de promo, hausse annoncée)" checked={priceChange} onChange={(e) => setPriceChange(e.target.checked)} />
          {priceChange && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dans combien de mois ?" htmlFor={id("pcMonths")}><Input id={id("pcMonths")} name="pcMonths" inputMode="numeric" placeholder="Ex. 3" /></Field>
              <Field label="Nouveau prix mensuel (€)" htmlFor={id("pcPrice")}><Input id={id("pcPrice")} name="pcPrice" inputMode="decimal" placeholder="Ex. 29,99" /></Field>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-xl font-extrabold">Tes besoins</h2>
          {category === "mobile" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data réellement consommée (Go/mois)" htmlFor={id("usage")} hint="Visible dans ton espace client. Vide = on reprend ton volume actuel.">
                  <Input id={id("usage")} name="usage" inputMode="decimal" placeholder="Ex. 35" />
                </Field>
                <Field label="Data à l'étranger nécessaire (Go)" htmlFor={id("roaming")} hint="Union européenne / DOM. Laisse vide si tu n'en as pas besoin.">
                  <Input id={id("roaming")} name="roaming" inputMode="decimal" placeholder="Ex. 10" />
                </Field>
              </div>
              <fieldset>
                <legend className="text-sm font-bold mb-2">Réseau préféré <span className="font-normal text-muted">(aucun = tous)</span></legend>
                <div className="flex flex-wrap gap-2">
                  {NETWORKS.map((n) => {
                    const on = networks.includes(n);
                    return (
                      <button key={n} type="button" aria-pressed={on} onClick={() => setNetworks((s) => (on ? s.filter((x) => x !== n) : [...s, n]))} className={cx("pressable min-h-11 rounded-full border-2 px-4 text-sm font-bold", on ? "border-brand bg-brand text-on-brand" : "border-line bg-surface")}>
                        {on && <IconCheck width={14} height={14} className="inline -mt-0.5 mr-1" />}{n}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <Toggle id={id("fiveG")} name="fiveG" label="La 5G est indispensable" />
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Technologie" htmlFor={id("technology")} hint="ECONOM. ne vérifie pas l'éligibilité de ton adresse : teste-la chez l'opérateur avant de souscrire.">
                  <Select id={id("technology")} name="technology" defaultValue="">
                    <option value="">Peu importe</option>
                    <option value="fibre">Fibre</option>
                    <option value="adsl">ADSL / VDSL</option>
                    <option value="box-4g-5g">Box 4G / 5G</option>
                  </Select>
                </Field>
                <Field label="Débit descendant minimum (Mb/s)" htmlFor={id("speed")}><Input id={id("speed")} name="speed" inputMode="numeric" placeholder="Ex. 500" /></Field>
              </div>
              <Toggle id={id("tv")} name="tv" label="La TV doit être incluse" />
              <Toggle id={id("phone")} name="phone" label="Le téléphone fixe doit être inclus" />
            </>
          )}
          <Toggle id={id("noCommit")} name="noCommit" label="Uniquement des offres sans engagement" />
          <fieldset>
            <legend className="text-sm font-bold mb-2">Calculer sur</legend>
            <div className="grid grid-cols-2 gap-2 rounded-full bg-surface-2 p-1">
              {([12, 24] as const).map((m) => (
                <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)} className={cx("min-h-11 rounded-full text-sm font-bold transition-colors", months === m ? "bg-surface shadow text-ink" : "text-muted")}>{m} mois</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Sur 24 mois, les hausses de prix après promotion sont entièrement prises en compte.</p>
          </fieldset>
        </Card>

        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" size="lg" full disabled={pending}>{pending ? <><Spinner label="Calcul en cours" /> Calcul en cours…</> : <><IconCompare width={20} height={20} /> Comparer maintenant</>}</Button>
      </form>

      <div ref={resultsRef} aria-live="polite" className="scroll-mt-24 space-y-4">
        {result && (
          <>
            {result.best && savings[0] ? (
              <section aria-label="Ton résultat" className="on-hero relative overflow-hidden rounded-[2rem] bg-hero p-5 text-white animate-rise">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-accent/25 blur-2xl" />
                <p className="relative text-sm font-bold text-white/80">Économie potentielle estimée</p>
                <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xs font-bold text-white/70">AVANT</p>
                    <p className="num text-2xl font-black line-through decoration-2 decoration-white/60 sm:text-3xl">{euro(result.best.beforeMonthlyCents)}</p>
                    <p className="text-xs text-white/70">par mois</p>
                  </div>
                  <IconArrow className="text-accent" />
                  <div className="rounded-2xl bg-accent p-3 text-on-accent animate-pop">
                    <p className="text-xs font-bold">APRÈS</p>
                    <p className="num text-2xl font-black sm:text-3xl">{euro(result.best.afterMonthlyCents)}</p>
                    <p className="text-xs font-semibold">{result.best.afterPromoCents ? `puis ${euro(result.best.afterPromoCents)}` : "par mois"}</p>
                  </div>
                </div>
                <p className="relative mt-5 text-sm font-bold text-white/80">Soit, frais inclus, environ</p>
                <p className="relative"><CountUp cents={savings[0].monthlyEquivalentSavingCents} className="num text-6xl font-black text-accent" /><span className="ml-2 text-lg font-bold">de moins par mois</span></p>
                <dl className="relative mt-4 grid grid-cols-2 gap-2">
                  {([[12, result.best.net12Cents], [24, result.best.net24Cents]] as const).map(([m, cents]) => (
                    <div key={m} className={cx("rounded-2xl p-3", result.months === m ? "bg-white/20 ring-2 ring-accent" : "bg-white/10")}>
                      <dt className="text-xs font-bold text-white/75">Économie nette sur {m} mois</dt>
                      <dd className="num text-xl font-black">{cents > 0 ? euro(cents) : `aucune (${euro(cents)})`}</dd>
                    </div>
                  ))}
                </dl>
                <p className="relative mt-3 text-xs text-white/75">Avec {savings[0].offer.provider} {savings[0].offer.name}, offre vérifiée le {dateFr(savings[0].offer.verifiedAt)}. Estimation à partir de tes informations : elle n&apos;est pas garantie.</p>
                <div className="relative mt-5 flex flex-col gap-2">
                  <a href="#meilleure-offre" className="pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-accent px-6 font-bold text-on-accent">Voir comment économiser <IconArrow width={18} height={18} /></a>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="light" onClick={() => setStudio(true)}>{shareCta.label}</Button>
                    {invitePos.key === "hero" && <InviteButton link={shareLink} variant="light" />}
                  </div>
                </div>
              </section>
            ) : (
              <div className="rounded-[1.5rem] bg-[#171529] p-5 text-[#F8F8F2]">
                {result.results.length > 0 ? (
                  <>
                    <p className="font-display text-2xl font-black">Ton offre actuelle tient la route.</p>
                    <p className="mt-1 text-sm text-white/80">Aucune offre vérifiée compatible avec tes besoins ne te ferait économiser sur {result.months} mois, frais inclus. Rien à changer pour l&apos;instant.</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-2xl font-black">Aucune offre compatible.</p>
                    <p className="mt-1 text-sm text-white/80">Aucune offre vérifiée du catalogue ne correspond à tous tes critères. Essaie d&apos;en assouplir un, ou reviens après la prochaine mise à jour.</p>
                  </>
                )}
                <div className="mt-4"><InviteButton link={shareLink} variant="light" label="Proposer le test à un proche" /></div>
              </div>
            )}
            {studio && result.best && savings[0] && (
              <SavingsCardStudio onClose={() => setStudio(false)} data={{ status: "potential", monthlyCents: savings[0].monthlyEquivalentSavingCents, yearlyCents: Math.max(0, result.best.net12Cents), beforeCents: result.best.beforeMonthlyCents, afterCents: result.best.afterMonthlyCents, link: shareLink }} />
            )}
            {!loggedIn && result.results.length > 0 && (
              <Notice title="Garde ce résultat">
                Crée un compte gratuit pour enregistrer cette comparaison et suivre ton économie. Tes résultats restent visibles ici sans compte.
                <div className="mt-3"><LinkButton href="/inscription" size="sm">Créer mon compte gratuit</LinkButton></div>
              </Notice>
            )}
            {loggedIn && result.savedId && <Notice tone="success">Comparaison enregistrée. <Link href="/app/economies" className="font-bold underline underline-offset-4">Voir mes économies</Link></Notice>}

            {savings.map((r, i) => <OfferCard key={r.offer.id} r={r} rank={i} category={category} />)}
            {others.length > 0 && (
              <details className="rounded-[1.5rem] border border-line p-4">
                <summary className="cursor-pointer font-bold">{others.length} offre{others.length > 1 ? "s" : ""} compatible{others.length > 1 ? "s" : ""} sans économie pour toi</summary>
                <div className="mt-4 space-y-4">{others.map((r, i) => <OfferCard key={r.offer.id} r={r} rank={i + 99} category={category} />)}</div>
              </details>
            )}
            {result.excluded.length > 0 && (
              <details className="rounded-[1.5rem] border border-line p-4">
                <summary className="cursor-pointer font-bold">{result.excluded.length} offre{result.excluded.length > 1 ? "s" : ""} écartée{result.excluded.length > 1 ? "s" : ""} car incompatible{result.excluded.length > 1 ? "s" : ""} avec tes besoins</summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {result.excluded.map((x) => (
                    <li key={x.offerId} className="flex gap-2"><IconX width={16} height={16} className="mt-0.5 shrink-0 text-muted" /><span><strong>{x.name}</strong> — {x.reasons.join(", ")}</span></li>
                  ))}
                </ul>
              </details>
            )}
            {invitePos.key === "after_offers" && savings.length > 0 && <InviteButton link={shareLink} full />}
            <Notice title="Comment ces offres sont classées">
              {result.rankingCriteria} Le catalogue ne couvre pas toutes les offres du marché : il ne contient que celles vérifiées sur le site officiel du fournisseur. <Link href="/comment-ca-marche" className="font-bold underline underline-offset-4">Notre méthode</Link>
            </Notice>
          </>
        )}
        {!result && !pending && !error && (
          <EmptyState icon={<IconCompare />} title="Tes résultats apparaîtront ici">Renseigne ton prix actuel et lance la comparaison. C&apos;est gratuit et sans compte.</EmptyState>
        )}
      </div>
    </div>
  );
}
