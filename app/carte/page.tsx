import type { Metadata } from "next";
import { Suspense } from "react";
import { AbilityMap } from "@/components/map/ability-map";
import { getCommuneList, getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Carte des lieux accessibles de l'Hérault",
  description:
    "Hébergements, restaurants, activités, toilettes et stationnement adapté de l'Hérault, avec l'accessibilité en fauteuil d'après Acceslibre, OpenStreetMap et Tourisme & Handicap.",
};

export default function CartePage() {
  const meta = getMeta();
  const communes = getCommuneList();
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
        <AbilityMap communes={communes} categoryCounts={meta.parCategorie} mode="carte" />
      </Suspense>
    </main>
  );
}
