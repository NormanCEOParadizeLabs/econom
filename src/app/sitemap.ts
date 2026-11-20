import type { MetadataRoute } from "next";
import { ARTICLES } from "@/content/articles";

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

type Freq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const PAGES: [path: string, priority: number, changeFrequency: Freq][] = [
  ["/", 1, "daily"],
  ["/comparateur/mobile", 0.9, "daily"],
  ["/comparateur/internet", 0.9, "daily"],
  ["/comment-ca-marche", 0.8, "monthly"],
  ["/tarifs", 0.8, "monthly"],
  ["/application", 0.6, "monthly"],
  ["/conseils", 0.7, "weekly"],
  ["/faq", 0.6, "monthly"],
  ["/aide", 0.6, "monthly"],
  ["/contact", 0.4, "yearly"],
  ["/marque", 0.3, "yearly"],
  ["/mentions-legales", 0.2, "yearly"],
  ["/confidentialite", 0.2, "yearly"],
  ["/cookies", 0.2, "yearly"],
  ["/cgu", 0.2, "yearly"],
  ["/cgv", 0.2, "yearly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map(([path, priority, changeFrequency]) => ({ url: `${base}${path}`, changeFrequency, priority })),
    ...ARTICLES.map((a) => ({
      url: `${base}/conseils/${a.slug}`,
      lastModified: new Date(`${a.date}T00:00:00Z`),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
