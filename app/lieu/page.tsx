import type { Metadata } from "next";
import { Suspense } from "react";
import { PlacePage } from "@/components/ability/place-page";
import { SiteFooter } from "@/components/ability/site-chrome";
import { getMeta } from "@/lib/server-data";

export const metadata: Metadata = { title: "Fiche d'accessibilité" };

export default function LieuPage() {
  return (
    <>
      <main id="contenu">
        <Suspense
          fallback={
            <p role="status" className="p-8 text-ink-600">
              Chargement de la fiche…
            </p>
          }
        >
          <PlacePage />
        </Suspense>
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
