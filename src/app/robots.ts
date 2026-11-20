import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// « /app » seul bloquerait aussi « /application » (correspondance par préfixe) : on cible l'espace connecté précisément.
const APP_PRIVATE = ["/app$", "/app/", "/app?", "/admin", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: APP_PRIVATE }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
