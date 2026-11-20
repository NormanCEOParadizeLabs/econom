import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const safeNext = (n: string | null) => (n && /^\/(?!\/)[\w\-./?=&%]*$/.test(n) ? n : "/app");

/** Retour des liens e-mail (confirmation, réinitialisation) et des connexions Google / Apple. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const code = searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), base));
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", base));
}
