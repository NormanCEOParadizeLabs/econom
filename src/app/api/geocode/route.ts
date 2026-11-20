import { ApiError, clientIp, handle, jsonOk, rateLimit } from "@/lib/api";

export const runtime = "nodejs";

/** Recherche d'une ville ou d'un code postal via la Base Adresse Nationale (service public). La requête n'est pas journalisée. */
export const GET = handle("geocode", async (req: Request) => {
  await rateLimit(`geocode:${clientIp(req)}`, 30, 60);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) throw new ApiError(400, "invalid_input", "Indique une ville ou un code postal.");
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=5`, { signal: AbortSignal.timeout(6000) }).catch(() => null);
  if (!res?.ok) throw new ApiError(502, "geocoder_unavailable", "Recherche de ville indisponible. Réessaie dans un instant.");
  const json = (await res.json()) as { features?: { properties: { label: string; postcode: string; city: string }; geometry: { coordinates: [number, number] } }[] };
  return jsonOk({ results: (json.features ?? []).map((f) => ({ label: `${f.properties.city} (${f.properties.postcode})`, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] })) });
});
