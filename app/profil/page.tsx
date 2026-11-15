import type { Metadata } from "next";
import { NeedsWizard } from "@/components/ability/needs-wizard";
import { SiteFooter } from "@/components/ability/site-chrome";
import { getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Mon profil de besoins",
  description: "Décrivez vos besoins une fois : fauteuil, transferts, salle de bain. Ability en déduit les lieux qui conviennent.",
};

export default function ProfilPage() {
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-4xl">Mon profil de besoins</h1>
        <p className="mt-3 mb-8 text-lg text-ink-700">
          Moins de deux minutes. Ability s&apos;en sert pour dire, lieu par lieu, ce qui convient, ce qui
          bloque et ce qu&apos;il reste à confirmer.
        </p>
        <NeedsWizard />
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
