import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
export const anon = () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

export interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

export async function createUser(label = "u", opts: { email?: string; confirm?: boolean } = {}): Promise<TestUser> {
  const email = opts.email ?? `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.econom.local`;
  const password = "Test-" + Math.random().toString(36).slice(2) + "A1!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: opts.confirm ?? true });
  if (error || !data.user) throw new Error("createUser: " + error?.message);
  const client = anon();
  if (opts.confirm !== false) {
    const { error: e2 } = await client.auth.signInWithPassword({ email, password });
    if (e2) throw new Error("signIn: " + e2.message);
  }
  return { id: data.user.id, email, password, client };
}

export async function deleteUser(u: TestUser) {
  await admin.auth.admin.deleteUser(u.id);
}

export async function setPlus(userId: string, patch: Record<string, unknown> = {}) {
  await admin.from("subscriptions").update({ status: "active", current_period_end: new Date(Date.now() + 20 * 864e5).toISOString(), ...patch }).eq("user_id", userId);
}

export async function seedOffer(over: Record<string, unknown> = {}) {
  const slug = "t-" + Math.random().toString(36).slice(2, 10);
  const { data: p } = await admin.from("providers").insert({ slug, name: "Opérateur Test " + slug }).select("id").single();
  const { data, error } = await admin
    .from("offers")
    .insert({
      provider_id: p!.id, category: "mobile", name: "Forfait test 100 Go", monthly_cents: 999, intro_months: 0, after_cents: 999,
      data_gb: 100, roaming_gb: 30, five_g: true, url: "https://example.org/offre", status: "verified", verified_at: "2026-11-20",
      valid_until: "2099-01-01", is_demo: false, ...over,
    })
    .select("id")
    .single();
  if (error) throw new Error("seedOffer: " + error.message);
  return { offerId: data!.id as string, providerId: p!.id as string };
}

export async function cleanupProvider(providerId: string) {
  await admin.from("offers").delete().eq("provider_id", providerId);
  await admin.from("providers").delete().eq("id", providerId);
}
