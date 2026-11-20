import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ECONOM. — Ton argent. Tes règles.",
    short_name: "ECONOM.",
    description: "Compare tes forfaits, suis tes abonnements et repère tes économies possibles.",
    lang: "fr",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#5638F5",
    theme_color: "#5638F5",
    categories: ["finance", "lifestyle", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scanner une facture", url: "/app/scanner" },
      { name: "Comparer mon forfait", url: "/app/comparer" },
    ],
  };
}
