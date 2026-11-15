import type { Metadata } from "next";
import { SiteFooter } from "@/components/ability/site-chrome";
import { TripPlanner } from "@/components/trip/trip-planner";
import { getCommuneList, getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Mon séjour",
  description: "Préparer un séjour accessible : destination, hébergement compatible, programme jour par jour et dossier à imprimer.",
};

export default function SejourPage() {
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="text-4xl">Mon séjour</h1>
        <p className="mt-3 mb-8 max-w-3xl text-lg text-ink-700">
          Une destination, un hébergement qui convient, un programme jour par jour, puis un dossier à emporter.
          Tout reste dans ce navigateur.
        </p>
        <TripPlanner communes={getCommuneList()} />
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
