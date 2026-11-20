import type { Metadata } from "next";
import { Suspense } from "react";
import { CommunityPage } from "@/components/community/community-page";
import { SiteFooter } from "@/components/ability/site-chrome";
import { getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Communauté",
  description: "Les voyageurs racontent leur itinéraire et confirment, bloc par bloc, l'accessibilité des lieux.",
};

export default function CommunautePage() {
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="text-4xl">Communauté</h1>
        <p className="mt-3 mb-8 max-w-3xl text-lg text-ink-700">
          Vous revenez de séjour ? Dites comment l&apos;itinéraire s&apos;est passé et confirmez, ou non, ce que
          les fiches annonçaient. Chaque retour concordant renforce la base d&apos;accessibilité pour les
          voyageurs suivants.
        </p>
        <Suspense
          fallback={
            <p role="status" className="text-ink-600">
              Chargement…
            </p>
          }
        >
          <CommunityPage />
        </Suspense>
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
