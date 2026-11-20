import { z } from "zod";
import { ApiError, clientIp, handle, jsonOk, rateLimit } from "@/lib/api";
import { dealsNear, publicDealCount } from "@/lib/services/deals";
import { DEAL_CATEGORIES } from "@/lib/format";

export const runtime = "nodejs";

const Query = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(100).default(15),
  category: z.string().refine((c) => c in DEAL_CATEGORIES).optional(),
});

export const GET = handle("deals", async (req: Request) => {
  await rateLimit(`deals:${clientIp(req)}`, 60, 60);
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = Query.safeParse({ ...sp, category: sp.category || undefined });
  if (!parsed.success) throw new ApiError(400, "invalid_input", "Position invalide.");
  const { lat, lon, radius, category } = parsed.data;
  const [deals, total] = await Promise.all([dealsNear({ lat, lon }, radius, category), publicDealCount()]);
  return jsonOk({ deals, total });
});
