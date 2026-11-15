import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/ability/site-chrome";
import { GroupWizard } from "@/components/pro/group-wizard";
import { getCommuneList, getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Séjour de groupe (structures)",
  description:
    "Pour les structures médico-sociales : profil du groupe, hébergements avec assez de chambres accessibles, itinéraire et dossier de séjour.",
};

export default function ProPage() {
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="text-sm font-bold tracking-wide text-ink-600 uppercase">Espace structures</p>
        <h1 className="text-4xl">Préparer un séjour de groupe</h1>
        <p className="mt-3 mb-8 max-w-3xl text-lg text-ink-700">
          Pour un séjour de 3 à 7 jours avec des résidents en fauteuil et leurs accompagnants. Cinq étapes ; les
          résidents sont désignés par un code, et rien ne quitte ce navigateur.
        </p>
        <GroupWizard communes={getCommuneList()} />
        <p className="mt-10 border-t border-ink-200 pt-6">
          <Link href="/pro/tableau-de-bord/" className="font-bold underline underline-offset-4">
            Voir le tableau de bord de tous les séjours (démonstration)
          </Link>
        </p>
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
