import type { Metadata } from "next";
import { Suspense } from "react";
import { ExplorePage } from "@/components/explore/explore-page";
import { getCommuneList, getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Carte des lieux accessibles de l'Hérault",
  description:
    "Explorer librement la carte : hébergements, restaurants, activités, toilettes et stationnement adapté, avec l'accessibilité en fauteuil d'après Acceslibre, OpenStreetMap et Tourisme & Handicap.",
};

export default function CartePage() {
  const meta = getMeta();
  return (
    <main id="contenu">
      <h1 className="sr-only">Carte des lieux accessibles de l&apos;Hérault</h1>
      {/* useSearchParams (paramètre « ou ») impose une frontière Suspense en export statique. */}
      <Suspense
        fallback={
          <p role="status" className="p-8 text-ink-600">
            Chargement de la carte…
          </p>
        }
      >
        <ExplorePage communes={getCommuneList()} categoryCounts={meta.parCategorie} />
      </Suspense>
    </main>
  );
}
