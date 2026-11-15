import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { FeedbackButton } from "@/components/ability/feedback-button";
import { DemoBanner, SiteHeader } from "@/components/ability/site-chrome";
import "./globals.css";

// Police conçue pour la basse vision (Braille Institute), en graisse variable.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  // Next.js n'a pas de métriques de repli pour cette police.
  adjustFontFallback: false,
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
