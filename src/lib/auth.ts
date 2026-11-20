import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";

export const getUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export async function requireUser(next?: string) {
  const user = await getUser();
  if (!user) redirect(`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/** Le rôle admin vient exclusivement de la table `admins` (inaccessible en écriture aux clients). */
export const isAdmin = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
});

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!(await isAdmin())) redirect("/app");
  return user;
}
