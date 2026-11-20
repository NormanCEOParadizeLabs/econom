import { expect, test } from "@playwright/test";
import { admin, newEmail, resetRateLimits, signUp, userIdByEmail } from "./helpers";

test.beforeEach(resetRateLimits);

test("administration et Growth Studio : chaque onglet s'affiche pour un administrateur", async ({ page }) => {
  const email = newEmail("admin");
  await signUp(page, email, "Admin");
  await admin.from("admins").insert({ user_id: await userIdByEmail(email) });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const tab of ["apercu", "utilisateurs", "offres", "bons-plans", "ia", "business", "securite", "parametres"]) {
    const res = await page.goto(`/admin?tab=${tab}`);
    expect(res?.status(), `admin ${tab}`).toBe(200);
    await expect(page.locator("main#contenu")).toBeVisible();
    await expect(page.getByText(/Quelque chose s'est mal passé|Application error/)).toHaveCount(0);
  }
  await page.goto("/admin?tab=offres");
  await expect(page.getByText("Série Free 110 Go 5G").first()).toBeVisible(); // catalogue vérifié
  for (const tab of ["tableau", "contenus", "createurs", "comptes", "hooks", "scripts", "experiences", "recompenses"]) {
    const res = await page.goto(`/admin/growth?tab=${tab}`);
    expect(res?.status(), `growth ${tab}`).toBe(200);
    await expect(page.locator("main#contenu")).toBeVisible();
    await expect(page.getByText(/Quelque chose s'est mal passé|Application error/)).toHaveCount(0);
  }
  await page.goto("/admin/growth?tab=tableau");
  await expect(page.getByText(/Coefficient viral/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});
