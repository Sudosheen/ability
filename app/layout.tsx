import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { FeedbackButton } from "@/components/ability/feedback-button";
import { DemoBanner, SiteHeader } from "@/components/ability/site-chrome";
import "./globals.css";

// Police conçue pour la basse vision (Braille Institute), en graisse variable.
// Fichier latin de Google Fonts (français compris), licence OFL : app/fonts/OFL.txt.
const atkinson = localFont({
  src: "./fonts/atkinson-hyperlegible-next-latin.woff2",
  weight: "200 800",
  variable: "--font-atkinson",
  display: "swap",
  // Next.js n'a pas de métriques de repli pour cette police.
  adjustFontFallback: false,
  // Les métriques d'origine (98 % / 32 %) placent les lettres trop haut : dans une pastille,
  // un bouton ou un lien centré, le texte paraissait 1 à 2 px au-dessus de l'icône.
  // 110 % / 20 % centre le texte en casse mixte, sans changer la hauteur totale (130 %).
  declarations: [
    { prop: "ascent-override", value: "110%" },
    { prop: "descent-override", value: "20%" },
    { prop: "line-gap-override", value: "0%" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Ability : des séjours accessibles, vérifiés critère par critère",
    template: "%s · Ability",
  },
  description:
    "Maquette : préparer un séjour accessible dans l'Hérault pour une personne en fauteuil, avec le niveau de preuve de chaque information.",
};

export const viewport: Viewport = {
  themeColor: "#ffcb3d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${atkinson.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <DemoBanner />
        <SiteHeader />
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}
