"use client";

import Link from "next/link";
import { ArrowRight, FileText, MessagesSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Commune } from "@/lib/data";
import { describeProfile } from "@/lib/profile";
import { tripStore, useProfile, useTrip } from "@/lib/storage";
import { emptyTrip, type Trip } from "@/lib/trip";
import { BudgetSettingsForm, BudgetSummary } from "./budget-panel";
import { LodgingPicker, ProgramEditor, TripSettings } from "./trip-sections";
import { useEvaluatedPlaces } from "./use-candidates";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`etape-${n}`} className="flex flex-col gap-4 border-t border-ink-200 pt-8">
      <h2 id={`etape-${n}`} className="flex items-center gap-3 text-2xl">
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-sun-400 text-lg">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Séjour d'un particulier : destination et dates, hébergement, programme, dossier. */
export function TripPlanner({ communes }: { communes: Commune[] }) {
  const profile = useProfile();
  const stored = useTrip();
  const trip = stored ?? emptyTrip();
  const save = (t: Trip) => tripStore.save(t);
  const { evaluated, error } = useEvaluatedPlaces(profile, { chambres: 1 });
  const levePersonne = profile?.transfert === "leve_personne" && profile.levePersonne === "sur_place";

  if (!profile) {
    return (
      <section className="flex flex-col gap-3 rounded-3xl bg-butter-100 p-6">
        <h2 className="text-2xl">D&apos;abord, vos besoins</h2>
        <p className="text-ink-700">
          Le séjour se construit à partir de votre profil : c&apos;est lui qui dit quels lieux conviennent.
          Deux minutes suffisent, et rien ne quitte ce navigateur.
        </p>
        <Button asChild className="self-start">
          <Link href="/profil/">
            Décrire mes besoins
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-2xl bg-butter-100 p-4 text-ink-700">
        Pour : <strong className="text-ink-900">{describeProfile(profile)}</strong>.{" "}
        <Link href="/profil/" className="font-bold text-ink-900 underline underline-offset-4">
          Modifier le profil
        </Link>
      </p>
      {error && (
        <p role="alert" className="rounded-2xl bg-ko-100 p-3 font-bold text-ko-700">
          Les lieux n&apos;ont pas pu être chargés. Rechargez la page.
        </p>
      )}

      <Step n={1} title="Destination et dates">
        <TripSettings trip={trip} onChange={save} communes={communes} />
      </Step>

      <Step n={2} title="Budget et moyens de paiement">
        <BudgetSettingsForm trip={trip} onChange={save} />
      </Step>

      <Step n={3} title="Hébergement">
        <LodgingPicker trip={trip} onChange={save} communes={communes} evaluated={evaluated} />
      </Step>

      <Step n={4} title="Programme jour par jour">
        <ProgramEditor trip={trip} onChange={save} communes={communes} evaluated={evaluated} levePersonne={levePersonne} />
        <BudgetSummary trip={trip} levePersonne={levePersonne} />
      </Step>

      <Step n={5} title="Dossier de séjour">
        <p className="text-ink-700">
          Tout le séjour sur une page à imprimer ou à enregistrer en PDF : besoins, hébergement, programme,
          points à confirmer, numéros utiles.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="dark">
            <Link href="/dossier/">
              <FileText aria-hidden="true" />
              Voir le dossier
            </Link>
          </Button>
          {stored && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (window.confirm("Effacer ce séjour de ce navigateur ?")) tripStore.clear();
              }}
            >
              <Trash2 aria-hidden="true" />
              Effacer le séjour
            </Button>
          )}
        </div>
      </Step>

      <Step n={6} title="Après le séjour">
        <p className="text-ink-700">
          Racontez comment l&apos;itinéraire s&apos;est passé et confirmez, lieu par lieu, ce que vous avez trouvé sur
          place. Vos retours rendent les fiches plus sûres pour les suivants.
        </p>
        <Button asChild variant="outline" className="self-start">
          <Link href="/communaute/#donner-un-retour">
            <MessagesSquare aria-hidden="true" />
            Donner mon retour à la communauté
          </Link>
        </Button>
      </Step>
    </div>
  );
}
