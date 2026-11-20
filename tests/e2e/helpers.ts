import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export const admin = createClient("http://127.0.0.1:54321", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU", { auth: { persistSession: false } });
export const PASSWORD = "Une-phrase-facile-2026";
export const newEmail = (label: string) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.econom.local`;
export const resetRateLimits = async () => { await admin.from("rate_limits").delete().neq("key", ""); };

export async function signUp(page: Page, email: string, name = "Camille") {
  await page.goto("/inscription");
  await page.getByLabel("Prénom (facultatif)").fill(name);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte gratuit" }).click();
  await page.waitForURL("**/app/bienvenue");
  await page.getByRole("button", { name: "Passer" }).click();
  await page.waitForURL(/\/app$/);
}

export async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await page.waitForURL(/\/app/);
}

/** Lance une comparaison mobile ; le catalogue contient la Série Free vérifiée (12,99 € × 12 + 10 € de SIM). */
export async function compareMobile(page: Page, price = "29,99", data = "100") {
  await page.getByLabel("Prix payé chaque mois (€)").fill(price);
  await page.getByLabel("Data incluse dans ton forfait (Go)").fill(data);
  await page.getByRole("button", { name: "Comparer maintenant" }).click();
  await expect(page.getByRole("region", { name: "Ton résultat" })).toBeVisible();
}

export async function userIdByEmail(email: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email)!.id;
}
