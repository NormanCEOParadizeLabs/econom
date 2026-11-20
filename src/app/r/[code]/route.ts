import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/api";
import { track } from "@/lib/analytics";
import { REF_COOKIE, getReferralRules, isReferralCode, referrerIdForCode } from "@/lib/services/referral";

export const runtime = "nodejs";
const PREVIEW_BOTS = /whatsapp|facebookexternalhit|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|snapchat|bot\b|crawler|spider|preview/i;

/** Lien de parrainage court : mémorise le parrain (cookie d'attribution) puis ouvre la page d'invitation. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const code = (await ctx.params).code.toUpperCase();
  const res = NextResponse.redirect(new URL("/invitation", base), 307);
  if (!isReferralCode(code)) return res;
  const isBot = PREVIEW_BOTS.test(request.headers.get("user-agent") ?? "");
  try {
    await rateLimit(`ref-open:${clientIp(request)}`, 30, 3600);
  } catch {
    return res; // ouverture en rafale : redirection sans attribution
  }
  if (!(await referrerIdForCode(code))) return res;
  const { attribution_days } = await getReferralRules();
  res.cookies.set(REF_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: base.startsWith("https://"), path: "/", maxAge: Math.min(90, Math.max(1, attribution_days)) * 86400 });
  if (!isBot) await track("referral_link_opened", { source: "parrainage" });
  return res;
}
