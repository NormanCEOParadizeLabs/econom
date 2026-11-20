import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAiClientForTests, type AiClient } from "@/lib/ai/client";
import { assertPublicHttps, evidenceFound, findDealsForCity, recheckAutoDeals, type FinderDeps } from "@/lib/ai/deals-finder";
import { dealsNear } from "@/lib/services/deals";
import { admin } from "../helpers";

const create = vi.fn(), parse = vi.fn();
const usage = { input_tokens: 5000, output_tokens: 800 };
const SRC = "https://www.musee-test-econom.example/tarifs";
const PAGE = "<html><body><h1>Musée des Tests</h1><p>L’entrée des collections permanentes est gratuite pour tous, toute l&rsquo;année.</p><script>ignore('gratuit le lundi')</script></body></html>";
const deal = (over: Record<string, unknown> = {}) => ({
  lieu: "Musée des Tests", adresse: "1 place Bellecour", code_postal: "69002", ville: "Lyon", titre: "Collections permanentes gratuites " + Math.random().toString(36).slice(2, 7),
  categorie: "loisirs", avantage: "Gratuit", conditions: "Hors expositions temporaires.", valable_jusquau: null, url_source: SRC,
  citation: "L'entrée des collections permanentes est gratuite pour tous, toute l'année.", ...over,
});
const pages: Record<string, string> = { [SRC]: PAGE };
const deps: FinderDeps = {
  fetchPage: async (u) => { if (!(u in pages)) throw new Error("page_inaccessible"); return pages[u].replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "'"); },
  geocode: async (_a, cp) => (cp === "69002" ? { lat: 45.7578, lon: 4.832 } : null),
};
const run = (deals: unknown[]) => {
  create.mockResolvedValue({ stop_reason: "end_turn", usage, content: [{ type: "text", text: "notes de recherche" }] });
  parse.mockResolvedValue({ stop_reason: "end_turn", usage, parsed_output: { bons_plans: deals } });
  return findDealsForCity("Lyon", deps);
};
const cleanup = async () => {
  const { data } = await admin.from("local_deals").select("merchant_id").eq("origin", "auto");
  if (data?.length) await admin.from("merchant_locations").delete().in("id", data.map((d) => d.merchant_id));
};

beforeEach(async () => { create.mockReset(); parse.mockReset(); setAiClientForTests({ messages: { create, parse } } as unknown as AiClient); await cleanup(); pages[SRC] = PAGE; });
afterEach(() => setAiClientForTests(null));
afterAll(cleanup);

describe("recherche automatique de bons plans", () => {
  it("offre prouvée par la page officielle : publiée, datée, sourcée et visible", async () => {
    const d = deal();
    const report = await run([d]);
    expect(report).toMatchObject({ found: 1, published: 1, pending: 0, rejected: [] });
    const near = await dealsNear({ lat: 45.76, lon: 4.83 }, 10);
    const mine = near.find((x) => x.title === d.titre)!;
    expect(mine).toMatchObject({ auto: true, dealLabel: "Gratuit", sourceUrl: SRC, merchant: { name: "Musée des Tests", postalCode: "69002" } });
    expect(mine.verifiedAt).toBe(new Date().toISOString().slice(0, 10));
    expect(create.mock.calls[0][0].tools[0]).toMatchObject({ type: "web_search_20260209", name: "web_search" });
    expect(parse.mock.calls[0][0].tools).toBeUndefined();
  });

  it("citation introuvable sur la page (offre inventée ou déformée) : jamais publiée, placée en modération", async () => {
    const d = deal({ citation: "Entrée à moitié prix pour tous les visiteurs le premier dimanche du mois." });
    const report = await run([d]);
    expect(report).toMatchObject({ published: 0, pending: 1 });
    expect((await dealsNear({ lat: 45.76, lon: 4.83 }, 10)).find((x) => x.title === d.titre)).toBeUndefined();
    expect((await admin.from("local_deals").select("status, verified_at").eq("title", d.titre).single()).data).toEqual({ status: "submitted", verified_at: null });
  });

  it("texte présent uniquement dans un script de la page : non retenu comme preuve", async () => {
    const report = await run([deal({ citation: "Le musée est gratuit le lundi pour tous les habitants." })]);
    expect(report.published).toBe(0);
  });

  it("source inaccessible, adresse introuvable, offre expirée, données incomplètes, doublon : écartés", async () => {
    const ok = deal();
    const report = await run([
      deal({ url_source: "https://site-inconnu.example/promo" }),
      deal({ code_postal: "75001" }),
      deal({ valable_jusquau: "2020-01-01" }),
      deal({ code_postal: "abc" }),
      ok, { ...ok },
    ]);
    expect(report.published).toBe(1);
    expect(report.rejected.map((r) => r.reason)).toEqual(["source inaccessible ou non autorisée", "adresse introuvable", "offre expirée", "informations incomplètes", "déjà enregistré"]);
  });

  it("publication automatique désactivée : tout passe par la modération", async () => {
    const { data: s } = await admin.from("admin_settings").select("value").eq("key", "deals_finder").single();
    await admin.from("admin_settings").update({ value: { ...s!.value, auto_publish: false } }).eq("key", "deals_finder");
    try { expect(await run([deal()])).toMatchObject({ published: 0, pending: 1 }); }
    finally { await admin.from("admin_settings").update({ value: s!.value }).eq("key", "deals_finder"); }
  });

  it("revérification : l'offre est retirée dès que la preuve disparaît de la page", async () => {
    const d = deal();
    await run([d]);
    await admin.from("local_deals").update({ recheck_by: new Date().toISOString().slice(0, 10) }).eq("title", d.titre);
    expect(await recheckAutoDeals(deps)).toEqual({ kept: 1, archived: 0 });
    await admin.from("local_deals").update({ recheck_by: new Date().toISOString().slice(0, 10) }).eq("title", d.titre);
    pages[SRC] = "<html><body>Tarif plein : 9 €.</body></html>";
    expect(await recheckAutoDeals(deps)).toEqual({ kept: 0, archived: 1 });
    expect((await dealsNear({ lat: 45.76, lon: 4.83 }, 10)).find((x) => x.title === d.titre)).toBeUndefined();
  });

  it("recherche vide, sortie hors schéma, refus : aucun enregistrement", async () => {
    create.mockResolvedValue({ stop_reason: "end_turn", usage, content: [] });
    expect(await findDealsForCity("Lyon", deps)).toMatchObject({ found: 0, published: 0 });
    create.mockResolvedValue({ stop_reason: "end_turn", usage, content: [{ type: "text", text: "x" }] });
    parse.mockResolvedValue({ stop_reason: "end_turn", usage, parsed_output: { bons_plans: [{ lieu: 1 }] } });
    await expect(findDealsForCity("Lyon", deps)).rejects.toMatchObject({ reason: "invalid_output" });
    create.mockResolvedValue({ stop_reason: "refusal", usage, content: [] });
    await expect(findDealsForCity("Lyon", deps)).rejects.toMatchObject({ reason: "refused" });
    expect((await admin.from("local_deals").select("id").eq("origin", "auto")).data).toEqual([]);
  });
});

describe("garde-fous", () => {
  it("preuve : tolère casse, accents et apostrophes, exige le nom du lieu", () => {
    expect(evidenceFound("Bienvenue au MUSÉE des Tests. L’ENTRÉE est gratuite pour tous les moins de 26 ans.", "L'entrée est gratuite pour tous les moins de 26 ans", "Musée des Tests")).toBe(true);
    expect(evidenceFound("L'entrée est gratuite pour tous les moins de 26 ans.", "L'entrée est gratuite pour tous les moins de 26 ans", "Piscine Tournesol")).toBe(false);
    expect(evidenceFound("Musée des Tests. Gratuit.", "Gratuit", "Musée des Tests")).toBe(false); // citation trop courte
  });
  it("n'interroge jamais le réseau interne ni une adresse non https", async () => {
    for (const bad of ["http://example.org/x", "https://127.0.0.1/x", "https://localhost/x", "https://10.0.0.5/admin", "https://169.254.169.254/latest/meta-data", "https://user:pass@example.org/", "https://example.org:8443/x", "file:///etc/passwd"]) {
      await expect(assertPublicHttps(bad), bad).rejects.toThrow();
    }
  });
});
