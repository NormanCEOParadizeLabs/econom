import type { Metadata, Viewport } from "next";
import { Archivo, Manrope } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const display = Archivo({ variable: "--font-display", subsets: ["latin"], axes: ["wdth"], display: "swap" });
const body = Manrope({ variable: "--font-body", subsets: ["latin"], display: "swap" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "ECONOM. — Ton argent. Tes règles.", template: "%s · ECONOM." },
  description: "ECONOM. identifie les dépenses sur lesquelles tu pourrais économiser, compare les offres adaptées à tes besoins et t'aide à garder davantage chaque mois.",
  applicationName: "ECONOM.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ECONOM.", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  openGraph: { type: "website", locale: "fr_FR", siteName: "ECONOM.", title: "ECONOM. — Ton argent. Tes règles.", description: "Compare tes forfaits, repère les abonnements trop chers, garde plus chaque mois.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F8F2" },
    { media: "(prefers-color-scheme: dark)", color: "#100E1F" },
  ],
};

// Applique thème et mode d'affichage avant le premier rendu (aucun flash).
const themeScript = `try{var d=document.documentElement,t=localStorage.getItem("econom.theme"),s=localStorage.getItem("econom.scheme");if(t==="mint"||t==="signal")d.dataset.theme=t;if(s==="light"||s==="dark")d.dataset.scheme=s}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="volt" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:left-3 focus:rounded-full focus:bg-ink focus:text-bg focus:px-4 focus:py-2 focus:font-bold">
          Aller au contenu
        </a>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
