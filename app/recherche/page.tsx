import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsPage } from "@/components/search/results-page";
import { SiteFooter } from "@/components/ability/site-chrome";
import { getCommuneList, getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Rechercher un hébergement accessible",
  description:
    "Hébergements, restaurants et activités autour d'une destination de l'Hérault, classés selon votre profil de besoins, avec le niveau de preuve de chaque information.",
};

export default function RecherchePage() {
  return (
    <>
      <main id="contenu">
        {/* useSearchParams (paramètres « ou » et « profil ») impose une frontière Suspense en export statique. */}
        <Suspense
          fallback={
            <p role="status" className="p-8 text-ink-600">
              Chargement de la recherche…
            </p>
          }
        >
          <ResultsPage communes={getCommuneList()} />
        </Suspense>
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
