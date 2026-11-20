import "server-only";
import { getUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

/** Lien à partager : lien de parrainage personnel si connecté, sinon lien de diagnostic sans attribution personnelle. */
export async function shareLinkFor(): Promise<string> {
  const user = await getUser().catch(() => null);
  if (user) {
    const supabase = await supabaseServer();
    const { data } = await supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle();
    if (data?.referral_code) return `${env.appUrl}/r/${data.referral_code}`;
  }
  return `${env.appUrl}/diagnostic?utm_source=partage`;
}
