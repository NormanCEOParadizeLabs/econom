import { NextResponse, type NextRequest } from "next/server";

/** Lien court d'invitation à un défi → page de présentation publique. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const { token } = await ctx.params;
  return NextResponse.redirect(new URL(/^[0-9a-f]{24}$/.test(token) ? `/defi/${token}` : "/", base), 307);
}
