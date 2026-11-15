import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CircleHelp, FileText } from "lucide-react";
import { NotYetButton } from "@/components/ability/not-yet";
import { SiteFooter } from "@/components/ability/site-chrome";
import { CompatibilityPill } from "@/components/ability/status";
import type { Compatibility } from "@/lib/matching";
import { getMeta } from "@/lib/server-data";

export const metadata: Metadata = { title: "Tableau de bord des séjours (démonstration)" };

// Écran de façade : séjours et résidents inventés, pour montrer l'idée en entretien.
const SEJOURS: {
  nom: string;
  dates: string;
  lieu: string;
  hebergement: string;
  statut: Compatibility;
  aConfirmer: number;
  residents: string[];
  accompagnants: number;
  dossier: "prêt" | "à finaliser" | "à commencer";
}[] = [
  { nom: "Bord de mer, printemps", dates: "12 au 15 mai 2027", lieu: "La Grande-Motte", hebergement: "Centre de séjour La Pinède (lieu fictif)", statut: "compatible", aConfirmer: 0, residents: ["R1", "R2", "R4"], accompagnants: 2, dossier: "prêt" },
  { nom: "Patrimoine à Sète", dates: "7 au 9 juin 2027", lieu: "Sète", hebergement: "Hôtel Les Dunes (lieu fictif)", statut: "a_confirmer", aConfirmer: 3, residents: ["R3", "R5"], accompagnants: 2, dossier: "à finaliser" },
  { nom: "Arrière-pays, automne", dates: "4 au 8 oct. 2027", lieu: "Lodève", hebergement: "À choisir", statut: "a_confirmer", aConfirmer: 6, residents: ["R1", "R2", "R3", "R4", "R5", "R6"], accompagnants: 4, dossier: "à commencer" },
];

const RESIDENTS = ["R1", "R2", "R3", "R4", "R5", "R6"];

export default function TableauDeBordPage() {
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="text-sm font-bold tracking-wide text-ink-600 uppercase">Espace structures</p>
        <h1 className="text-4xl">Tableau de bord des séjours</h1>
        <p className="mt-4 rounded-2xl bg-ink-900 p-4 text-white">
          <strong>Écran de démonstration.</strong> Les séjours et les résidents sont inventés ; cet écran montre ce que
          pourrait offrir la version complète.
        </p>

        <section aria-labelledby="titre-sejours" className="mt-8 flex flex-col gap-4">
          <h2 id="titre-sejours" className="text-2xl">Séjours de l&apos;année</h2>
          <ul className="grid gap-4 lg:grid-cols-3">
            {SEJOURS.map((s) => (
              <li key={s.nom} className="flex flex-col gap-3 rounded-3xl border border-ink-200 bg-white p-5">
                <h3 className="text-xl">{s.nom}</h3>
                <p className="flex items-center gap-2 text-ink-700">
                  <CalendarDays aria-hidden="true" className="size-5" />
                  {s.dates} · {s.lieu}
                </p>
                <p className="text-ink-700">Hébergement : {s.hebergement}</p>
                <CompatibilityPill status={s.statut} short className="self-start" />
                {s.aConfirmer > 0 && (
                  <p className="flex items-center gap-2 text-sm text-warn-700">
                    <CircleHelp aria-hidden="true" className="size-4" />
                    {s.aConfirmer} point{s.aConfirmer > 1 ? "s" : ""} à confirmer
                  </p>
                )}
                <p className="text-sm text-ink-700">
                  Résidents : {s.residents.join(", ")} · {s.accompagnants} accompagnants
                </p>
                <p className="flex items-center gap-2 text-sm font-bold">
                  <FileText aria-hidden="true" className="size-4" />
                  Dossier {s.dossier}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titre-residents" className="mt-10 flex flex-col gap-4">
          <h2 id="titre-residents" className="text-2xl">Qui part quand ?</h2>
          <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Participation de chaque résident aux séjours de l&apos;année</caption>
              <thead>
                <tr className="border-b border-ink-400">
                  <th scope="col" className="p-3">Résident</th>
                  {SEJOURS.map((s) => (
                    <th key={s.nom} scope="col" className="p-3">
                      {s.nom}
                    </th>
                  ))}
                  <th scope="col" className="p-3">Séjours</th>
                </tr>
              </thead>
              <tbody>
                {RESIDENTS.map((r) => {
                  const n = SEJOURS.filter((s) => s.residents.includes(r)).length;
                  return (
                    <tr key={r} className="border-b border-ink-200">
                      <th scope="row" className="p-3">{r}</th>
                      {SEJOURS.map((s) => (
                        <td key={s.nom} className="p-3">
                          {s.residents.includes(r) ? "Inscrit" : "–"}
                        </td>
                      ))}
                      <td className="p-3 font-bold">{n}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="titre-actions" className="mt-10 flex flex-col gap-4 rounded-3xl bg-butter-100 p-5">
          <h2 id="titre-actions" className="text-2xl">Et ensuite ?</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <NotYetButton
              signal={{ type: "fonction", detail: "relance des établissements" }}
              message="Pas encore disponible : Ability enverrait les questions aux établissements et suivrait leurs réponses."
            >
              Relancer les établissements
            </NotYetButton>
            <NotYetButton
              variant="outline"
              signal={{ type: "fonction", detail: "partage aux familles" }}
              message="Pas encore disponible : un lien de lecture seule pour les familles et les tuteurs."
            >
              Partager avec les familles
            </NotYetButton>
          </div>
          <Link href="/pro/" className="self-start font-bold underline underline-offset-4">
            Préparer un nouveau séjour de groupe
          </Link>
        </section>
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
