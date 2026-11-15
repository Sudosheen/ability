import type { Metadata } from "next";
import { Suspense } from "react";
import { AbilityMap } from "@/components/map/ability-map";
import { getCommuneList, getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Rechercher un hébergement accessible",
  description:
    "Hébergements de l'Hérault classés selon votre profil de besoins : compatible, à confirmer ou incompatible, avec le niveau de preuve de chaque information.",
};

export default function RecherchePage() {
  const meta = getMeta();
  return (
    <main id="contenu">
      <h1 className="sr-only">Rechercher un hébergement accessible dans l&apos;Hérault</h1>
      {/* useSearchParams (paramètres « ou » et « profil ») impose une frontière Suspense en export statique. */}
      <Suspense
        fallback={
          <p role="status" className="p-8 text-ink-600">
            Chargement de la recherche…
          </p>
        }
      >
        <AbilityMap communes={getCommuneList()} categoryCounts={meta.parCategorie} mode="recherche" />
      </Suspense>
    </main>
  );
}
