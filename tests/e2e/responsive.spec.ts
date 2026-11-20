import { expect, test } from "@playwright/test";
import { compareMobile, newEmail, resetRateLimits, signUp } from "./helpers";

test.beforeEach(resetRateLimits);

const noOverflow = async (page: import("@playwright/test").Page, path: string) => {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(o, `défilement horizontal sur ${path}`).toBeLessThanOrEqual(1);
};

test("pages publiques : affichage sans débordement, états de chargement et 404", async ({ page }) => {
  for (const path of ["/", "/diagnostic", "/comparateur/mobile", "/comparateur/internet", "/comparateur/energie", "/tarifs", "/faq", "/aide", "/conseils", "/marque", "/cgv", "/confidentialite", "/inscription", "/connexion"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await noOverflow(page, path);
  }
  const res = await page.goto("/page-qui-n-existe-pas");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link").first()).toBeVisible();
  expect((await page.request.get("/api/health")).status()).toBe(200);
  expect((await (await page.request.get("/manifest.webmanifest")).json()).short_name).toBe("ECONOM.");
});

test("application : résultat lisible et navigation à une main", async ({ page, isMobile }) => {
  await page.goto("/comparateur/mobile");
  await compareMobile(page);
  await noOverflow(page, "/comparateur/mobile (résultat)");
  await signUp(page, newEmail("resp"));
  for (const path of ["/app", "/app/comparer", "/app/abonnements", "/app/economies", "/app/parrainage", "/app/defis", "/app/rapport", "/app/bons-plans", "/app/assistant", "/app/premium", "/app/compte", "/app/parametres", "/app/notifications", "/app/analyses"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await noOverflow(page, path);
  }
  if (isMobile) {
    const nav = page.getByRole("navigation", { name: "Navigation de l'application" });
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Comparer" }).click();
    await expect(page).toHaveURL(/\/app\/comparer/);
    const box = await nav.getByRole("link", { name: "Scanner" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44); // cible tactile
  }
});
