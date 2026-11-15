import type { Metadata } from "next";
import { Check } from "lucide-react";
import { NotYetButton } from "@/components/ability/not-yet";
import { SiteFooter } from "@/components/ability/site-chrome";
import { getMeta } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Offres",
  description: "Hypothèses d'offres testées pendant les entretiens. Rien n'est en vente.",
};

type Offer = { id: string; public: string; nom: string; prix: string; detail: string; inclus: string[]; cta: string };

// Prix indicatifs : ce sont des hypothèses à tester en entretien, pas des tarifs.
const OFFERS: Offer[] = [
  {
    id: "particulier-gratuit",
    public: "Particuliers",
    nom: "Découverte",
    prix: "Gratuit",
    detail: "Pour chercher et comparer.",
    inclus: ["Carte et fiches d'accessibilité", "Profil de besoins", "Questions à poser aux établissements"],
    cta: "Continuer gratuitement",
  },
  {
    id: "particulier-pass",
    public: "Particuliers",
    nom: "Pass séjour",
    prix: "9 € par séjour",
    detail: "Pour partir l'esprit tranquille.",
    inclus: ["Tout Découverte", "Vérification des points à confirmer par l'équipe Ability", "Dossier de séjour complet", "Aide par téléphone avant le départ"],
    cta: "Choisir le Pass séjour",
  },
  {
    id: "structure-pro",
    public: "Structures",
    nom: "Ability Pro",
    prix: "29 € par mois",
    detail: "Pour les établissements qui organisent plusieurs séjours par an.",
    inclus: ["Séjours de groupe illimités", "Fiches résidents réutilisables", "Tableau de bord des séjours", "Hébergements vérifiés sur place en priorité"],
    cta: "Essayer Ability Pro",
  },
];

export default function TarifsPage() {
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="text-4xl">Offres</h1>
        <p className="mt-3 max-w-3xl text-lg text-ink-700">
          Ability est une maquette : rien n&apos;est en vente. Ces offres et ces prix sont des hypothèses que nous testons
          avec vous.
        </p>
        <ul className="mt-8 grid gap-5 lg:grid-cols-3">
          {OFFERS.map((o) => (
            <li key={o.id} className="flex flex-col gap-4 rounded-3xl border-2 border-ink-900 bg-white p-6">
              <p className="text-sm font-bold tracking-wide text-ink-600 uppercase">{o.public}</p>
              <h2 className="text-2xl">{o.nom}</h2>
              <p className="text-3xl font-extrabold tracking-tight">{o.prix}</p>
              <p className="text-ink-700">{o.detail}</p>
              <ul className="flex flex-col gap-2">
                {o.inclus.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ok-700" strokeWidth={3} />
                    {i}
                  </li>
                ))}
              </ul>
              <NotYetButton
                className="mt-auto"
                variant={o.id === "particulier-gratuit" ? "outline" : "default"}
                signal={{ type: "offre", detail: `${o.nom} (${o.prix})` }}
                message="Merci ! Cette offre n'existe pas encore : votre choix nous aide à savoir ce qui serait utile."
              >
                {o.cta}
              </NotYetButton>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter meta={getMeta()} />
    </>
  );
}
