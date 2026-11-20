import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const safeNext = (n: string | null) => (n && /^\/(?!\/)[\w\-./?=&%]*$/.test(n) ? n : "/app");
const TYPES = ["signup", "recovery", "email", "email_change", "invite", "magiclink"];

/** Variante « token_hash » des modèles d'e-mail Supabase (recommandée en production). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (token_hash && type && TYPES.includes(type)) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/reinitialiser" : safeNext(searchParams.get("next")), base));
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", base));
}
