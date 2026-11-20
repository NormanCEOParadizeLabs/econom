// Données de navigation partagées entre composants serveur et client.
import { IconChat, IconCompare, IconDoc, IconGift, IconHelp, IconHome, IconPiggy, IconPin, IconRepeat, IconScan, IconSettings, IconShield, IconStar, IconUser } from "@/components/icons";

export const TABS = [
  { href: "/app", label: "Accueil", icon: IconHome, exact: true },
  { href: "/app/comparer", label: "Comparer", icon: IconCompare },
  { href: "/app/scanner", label: "Scanner", icon: IconScan, main: true },
  { href: "/app/bons-plans", label: "Bons plans", icon: IconPin },
  { href: "/app/compte", label: "Compte", icon: IconUser },
];
export const MORE = [
  { href: "/app/abonnements", label: "Mes abonnements", icon: IconRepeat },
  { href: "/app/economies", label: "Mes économies", icon: IconPiggy },
  { href: "/app/assistant", label: "Assistant", icon: IconChat },
  { href: "/app/analyses", label: "Historique", icon: IconDoc },
  { href: "/app/parrainage", label: "Parrainage", icon: IconGift },
  { href: "/app/defis", label: "Défis entre proches", icon: IconStar },
  { href: "/app/rapport", label: "Mon mois avec ECONOM.", icon: IconPiggy },
  { href: "/app/premium", label: "ECONOM. Plus", icon: IconStar },
  { href: "/app/parametres", label: "Paramètres", icon: IconSettings },
  { href: "/aide", label: "Centre d'aide", icon: IconHelp },
];
