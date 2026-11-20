import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PASSWORD, admin, compareMobile, logIn, newEmail, resetRateLimits, signUp, userIdByEmail } from "./helpers";

test.beforeEach(resetRateLimits);

test("diagnostic sans compte : résultat avant/après calculé par le moteur", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ton argent.");
  await page.getByRole("link", { name: /Calculer mes économies/ }).click();
  await page.getByRole("link", { name: /Mon forfait mobile/ }).click();
  await expect(page).toHaveURL(/comparateur\/mobile/);
  await compareMobile(page);
  const result = page.getByRole("region", { name: "Ton résultat" });
  await expect(result).toContainText("AVANT");
  await expect(result).toContainText("29,99");
  await expect(result).toContainText("12,99");
  // 29,99 × 12 − (12,99 × 12 + 10 € de SIM) = 194,00 € ; sur 24 mois la hausse à 19,99 € est comptée : 719,76 − 405,76 = 314,00 €
  await expect(result).toContainText("194,00");
  await expect(result).toContainText("314,00");
  await expect(result).toContainText("n'est pas garantie");
  await expect(page.getByText("Vérifiée le").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Voir l'offre sur le site officiel/ }).first()).toHaveAttribute("href", /^https:\/\/mobile\.free\.fr/);
  await expect(page.getByText("Comment ces offres sont classées")).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer mon compte gratuit" }).first()).toBeVisible();
});

test("une offre actuelle déjà moins chère n'affiche aucun gain", async ({ page }) => {
  await page.goto("/comparateur/mobile");
  await page.getByLabel("Prix payé chaque mois (€)").fill("1,50");
  await page.getByRole("button", { name: "Comparer maintenant" }).click();
  await expect(page.getByText("Ton offre actuelle tient la route.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Ton résultat" })).toHaveCount(0);
});

test("carte d'économies : aperçu réel et export de l'image", async ({ page }) => {
  await page.goto("/comparateur/mobile");
  await compareMobile(page);
  await page.getByRole("button", { name: /Partager mon résultat|Montrer à mes proches/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const painted = await dialog.locator("canvas").evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < d.length; i += 4 * 997) colors.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    return { w: c.width, h: c.height, colors: colors.size };
  });
  expect(painted).toMatchObject({ w: 1080, h: 1920 });
  expect(painted.colors).toBeGreaterThan(3);
  for (const style of ["VOLT IMPACT", "MINIMAL MONEY", "AVANT / APRÈS"]) await dialog.getByRole("button", { name: style }).click();
  await dialog.getByRole("button", { name: "Carré 1:1" }).click();
  expect(await dialog.locator("canvas").evaluate((c: HTMLCanvasElement) => `${c.width}x${c.height}`)).toBe("1080x1080");
  const [download] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "Télécharger l'image" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^econom-.*\.png$/);
  const path = await download.path();
  const { statSync, readFileSync } = await import("node:fs");
  expect(statSync(path).size).toBeGreaterThan(20_000);
  expect(readFileSync(path).subarray(1, 4).toString()).toBe("PNG");
  await expect(dialog.getByText("/diagnostic")).toBeVisible(); // lien sans compte : aucune donnée personnelle
});

test("compte : inscription, comparaison enregistrée, abonnements, déconnexion, reconnexion", async ({ page }) => {
  const email = newEmail("parcours");
  await page.goto("/app");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fapp/); // route privée protégée
  await signUp(page, email);
  await expect(page.getByRole("heading", { name: /Bonjour Camille/ })).toBeVisible();

  await page.goto("/app/comparer");
  await compareMobile(page);
  await expect(page.getByText("Comparaison enregistrée.")).toBeVisible();
  await page.goto("/app/economies");
  await expect(page.getByText("Free — Série Free 110 Go 5G")).toBeVisible();
  await page.getByRole("button", { name: "J'ai lancé le changement" }).click();
  await page.getByRole("button", { name: /Je confirme/ }).click();
  await expect(page.getByText("déclarée par toi")).toBeVisible();

  await page.goto("/app/abonnements/nouveau");
  await page.getByLabel("Nom", { exact: true }).fill("Netflix");
  await page.getByLabel("Prix (€)").fill("13,49");
  await page.getByRole("button", { name: "Ajouter cet abonnement" }).click();
  await expect(page).toHaveURL(/\/app\/abonnements$/);
  await expect(page.getByText("Netflix")).toBeVisible();
  await expect(page.getByText("13,49").first()).toBeVisible();
  // Formule gratuite : le second abonnement est refusé par la base, pas seulement masqué par l'interface.
  await page.goto("/app/abonnements/nouveau");
  await page.getByLabel("Nom", { exact: true }).fill("Spotify");
  await page.getByLabel("Prix (€)").fill("10,99");
  await page.getByRole("button", { name: "Ajouter cet abonnement" }).click();
  await expect(page.getByText(/La formule gratuite permet de suivre un abonnement/)).toBeVisible();

  await page.goto("/app/scanner");
  await expect(page.getByText("Analyse automatique indisponible")).toBeVisible(); // pas de clé IA en local : repli honnête
  await page.goto("/app/premium");
  await expect(page.getByText("Paiement pas encore activé")).toBeVisible();
  await expect(page.getByRole("button", { name: /Passer à Plus/ })).toBeDisabled();
  await page.goto("/app/bons-plans");
  await expect(page.getByText("Où cherches-tu ?")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/app$/); // non administrateur
  await page.goto("/admin/growth");
  await expect(page).toHaveURL(/\/app$/);

  await page.goto("/app/compte");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Exporter mes données/ }).click()]);
  const exported = JSON.parse((await import("node:fs")).readFileSync(await download.path(), "utf8"));
  expect(exported.compte.email).toBe(email);
  expect(exported.user_contracts).toHaveLength(1);

  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/app/abonnements");
  await expect(page).toHaveURL(/\/connexion/);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
  await logIn(page, email);
  await page.goto("/app/abonnements");
  await expect(page.getByText("Netflix")).toBeVisible(); // données retrouvées
});

test("boucle virale : lien de parrainage → diagnostic sans compte → inscription → qualification → récompense", async ({ page, browser }) => {
  const sponsorEmail = newEmail("parrain");
  await signUp(page, sponsorEmail, "Alex");
  await page.goto("/app/parrainage");
  const link = (await page.locator("p.select-all").innerText()).trim();
  expect(link).toMatch(/\/r\/[A-Z0-9]{8}$/);

  const friend = await browser.newContext({ locale: "fr-FR" });
  const fp = await friend.newPage();
  await fp.goto(link);
  await expect(fp).toHaveURL(/\/invitation$/);
  await expect(fp.getByRole("heading", { level: 1 })).toContainText("Un ami t'invite");
  await fp.getByRole("link", { name: "Calculer mes économies gratuitement" }).click();
  await fp.getByRole("link", { name: /Mon forfait mobile/ }).click();
  await compareMobile(fp); // diagnostic sans inscription
  const friendEmail = newEmail("filleul");
  await signUp(fp, friendEmail, "Sam"); // l'attribution survit grâce au cookie posé par /r/CODE
  await fp.goto("/app/comparer");
  await compareMobile(fp); // diagnostic valide enregistré → qualification
  await expect(fp.getByText("Comparaison enregistrée.")).toBeVisible();

  const sponsorId = await userIdByEmail(sponsorEmail);
  await expect.poll(async () => (await admin.from("referrals").select("status").eq("referrer_id", sponsorId)).data).toEqual([{ status: "qualified" }]);
  await page.reload();
  await expect(page.getByText("1 filleul qualifié", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Débloquée")).toBeVisible();
  await expect(page.getByText("3 analyses IA supplémentaires").first()).toBeVisible();
  await page.goto("/app/notifications");
  await expect(page.getByText("Récompense de parrainage débloquée")).toBeVisible();
  // Le filleul peut à son tour partager : son lien personnel figure sur sa carte.
  await fp.getByRole("button", { name: /Partager mon résultat|Montrer à mes proches/ }).click();
  await expect(fp.getByRole("dialog").locator("p.select-all")).toContainText(/\/r\/[A-Z0-9]{8}/);
  await friend.close();
});

test("défi entre proches : création, invitation, totaux partagés", async ({ page, browser }) => {
  await signUp(page, newEmail("defi"), "Lou");
  await page.goto("/app/defis");
  await page.getByLabel("Ton pseudo dans le défi").fill("Lou");
  await page.getByRole("button", { name: "Créer le défi" }).click();
  await expect(page).toHaveURL(/\/app\/defis\/[0-9a-f-]{36}$/);
  await expect(page.getByText("défi privé")).toBeVisible();
  const id = page.url().split("/").pop()!;
  const token = (await admin.from("challenges").select("invite_token").eq("id", id).single()).data!.invite_token;

  const other = await browser.newContext({ locale: "fr-FR" });
  const op = await other.newPage();
  await signUp(op, newEmail("defi-ami"), "Sam");
  await op.goto(`/d/${token}`);
  await expect(op.getByRole("heading", { level: 1 })).toContainText("On trouve 100 €");
  await op.getByLabel("Ton pseudo dans le défi").fill("Sam");
  await op.getByRole("button", { name: "Rejoindre le défi" }).click();
  await expect(op).toHaveURL(new RegExp(`/app/defis/${id}$`));
  await expect(op.getByText("2 participants")).toBeVisible();
  await op.goto("/app/comparer");
  await compareMobile(op);
  await page.reload();
  await expect(page.getByText("Sam")).toBeVisible();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await expect(page.getByText("194").first()).toBeVisible(); // total potentiel du groupe, issu du moteur
  await other.close();
});

test("mot de passe oublié : e-mail reçu, nouveau mot de passe, reconnexion", async ({ page, request }) => {
  const email = newEmail("reset");
  await signUp(page, email);
  await page.getByRole("link", { name: "Compte" }).click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await page.goto("/mot-de-passe-oublie");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  await expect(page.getByText(/un lien de réinitialisation vient d'être envoyé/)).toBeVisible();
  let link = "";
  await expect.poll(async () => {
    const list = await (await request.get(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const msg = list.messages?.[0];
    if (!msg) return false;
    const full = await (await request.get(`http://127.0.0.1:54324/api/v1/message/${msg.ID}`)).json();
    link = (full.Text.match(/https?:\/\/\S+verify\S+/) ?? [""])[0].replace(/[)\]>]+$/, "");
    return Boolean(link);
  }, { timeout: 20_000 }).toBe(true);
  await page.goto(link);
  await expect(page).toHaveURL(/\/reinitialiser/);
  await page.getByLabel("Nouveau mot de passe").fill("Nouvelle-phrase-2027!");
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page.getByText("Ton mot de passe a bien été modifié.")).toBeVisible();
  await page.getByRole("link", { name: "Compte" }).click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await logIn(page, email, "Nouvelle-phrase-2027!");
  expect(PASSWORD).not.toBe("Nouvelle-phrase-2027!");
});

test("suppression du compte : données effacées", async ({ page }) => {
  const email = newEmail("suppr");
  await signUp(page, email);
  const id = await userIdByEmail(email);
  await page.goto("/app/compte");
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel("Ton mot de passe").fill(PASSWORD);
  await page.getByLabel("Écris SUPPRIMER pour confirmer").fill("supprimer");
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page).toHaveURL(/compte=supprime/);
  expect((await admin.from("profiles").select("id").eq("id", id)).data).toEqual([]);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/connexion/);
});

test("accessibilité : aucun défaut critique ou sérieux sur les parcours essentiels", async ({ page }) => {
  for (const path of ["/", "/diagnostic", "/comparateur/mobile", "/inscription", "/connexion", "/tarifs", "/invitation"]) {
    await page.goto(path);
    await page.waitForTimeout(1000); // fin des animations d'entrée
    const { violations } = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious.map((v) => `${path} · ${v.id} · ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
  }
  await signUp(page, newEmail("a11y"));
  for (const path of ["/app", "/app/comparer", "/app/abonnements", "/app/economies", "/app/parrainage", "/app/compte", "/app/premium"]) {
    await page.goto(path);
    await page.waitForTimeout(1600); // fin de l'écran de lancement
    const { violations } = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious.map((v) => `${path} · ${v.id} · ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
  }
});

test("import d'un relevé bancaire : abonnements détectés, ajout au suivi, conseils", async ({ page }) => {
  const email = newEmail("releve");
  await signUp(page, email);
  await admin.from("subscriptions").update({ status: "active", current_period_end: new Date(Date.now() + 20 * 864e5).toISOString() }).eq("user_id", await userIdByEmail(email));
  const rows = ["Date;Libellé;Débit;Crédit"];
  for (let m = 1; m <= 10; m++) {
    const mm = String(m).padStart(2, "0");
    rows.push(`05/${mm}/2026;PRLV SEPA NETFLIX INTERNATIONAL;${m >= 8 ? "14,99" : "13,49"};`, `12/${mm}/2025;PRLV SEPA FREE MOBILE;19,99;`, `12/${mm}/2026;PRLV SEPA FREE MOBILE;19,99;`, `20/${mm}/2026;CARTE SUPERMARCHE;${30 + m * 7},10;`, `28/${mm}/2026;VIR SALAIRE;;2000,00`);
  }
  await page.goto("/app/abonnements/importer");
  await page.locator("#releve").setInputFiles({ name: "releve.csv", mimeType: "text/csv", buffer: Buffer.from(rows.join("\n"), "latin1") });
  await expect(page.getByText(/2 prélèvements réguliers repérés/)).toBeVisible();
  await expect(page.getByText("Prix en hausse")).toBeVisible();
  await expect(page.getByText("SUPERMARCHE")).toHaveCount(0);
  await page.getByRole("button", { name: /Ajouter 2 abonnements/ }).click();
  await expect(page.getByText("2 abonnements ajoutés")).toBeVisible();
  await page.getByRole("link", { name: /Voir mes abonnements/ }).click();
  await expect(page.getByText("À regarder de plus près")).toBeVisible();
  await expect(page.getByText("Netflix a augmenté")).toBeVisible();
  await expect(page.getByRole("link", { name: "Comparer maintenant" })).toHaveAttribute("href", /fournisseur=Free\+Mobile&prix=19\.99/);
});

test("comparateur box internet : frais de mise en service et de résiliation comptés", async ({ page }) => {
  await page.goto("/comparateur/internet");
  await page.getByLabel("Prix payé chaque mois (€)").fill("44,99");
  await page.getByLabel("Technologie").selectOption("fibre");
  await page.getByRole("button", { name: "Comparer maintenant" }).click();
  const result = page.getByRole("region", { name: "Ton résultat" });
  await expect(result).toBeVisible();
  // 44,99 × 12 − (24,99 × 12 + 39 € de mise en service) = 201,00 € ; sur 24 mois : 441,00 €
  await expect(result).toContainText("201,00");
  await expect(result).toContainText("441,00");
  await expect(page.getByText("Éligibilité à ton adresse non vérifiée").first()).toBeVisible();
  await expect(page.getByText(/Frais si tu quittes cette offre plus tard : 69,00/)).toBeAttached();
});

test("page publique des bons plans : accessible sans compte ni géolocalisation", async ({ page }) => {
  await page.goto("/bons-plans");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("bons plans vérifiés");
  await expect(page.getByText("Où cherches-tu ?")).toBeVisible();
});
