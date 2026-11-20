import { getUser } from "@/lib/auth";
import { ApiError, handle, jsonOk, rateLimit } from "@/lib/api";
import { detectRecurring, parseStatement } from "@/lib/bank-import";

export const runtime = "nodejs";
const MAX = 2_000_000;

/** Analyse d'un relevé exporté par l'utilisateur. Le fichier est lu en mémoire puis écarté : rien n'est stocké ni journalisé. */
export const POST = handle("bank-import", async (req: Request) => {
  const user = await getUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Connecte-toi pour continuer.");
  await rateLimit(`bank-import:${user.id}`, 10, 3600);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "missing_file", "Ajoute le fichier exporté depuis ta banque.");
  if (file.size === 0 || file.size > MAX) throw new ApiError(413, "file_too_large", "Fichier vide ou trop volumineux (2 Mo maximum).");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.subarray(0, 4).join() === "37,80,68,70" || bytes.includes(0)) throw new ApiError(415, "unsupported_format", "Ce fichier n'est pas un export CSV. Dans ta banque en ligne, choisis « Exporter » ou « Télécharger » au format CSV.");
  // Les exports bancaires français sont souvent en Windows-1252.
  let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (text.includes("�")) text = new TextDecoder("windows-1252").decode(bytes);
  const txs = parseStatement(text);
  if (txs.length < 5) throw new ApiError(422, "unreadable", "Nous n'avons pas reconnu de liste d'opérations dans ce fichier. Vérifie qu'il s'agit bien d'un export CSV de ton compte.");
  const dates = txs.map((t) => t.date).sort();
  return jsonOk({ transactions: txs.length, from: dates[0], to: dates.at(-1), candidates: detectRecurring(txs) });
});
