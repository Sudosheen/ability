"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { EvaluationSummary } from "@/components/ability/evaluation";
import { PlaceDetail } from "@/components/ability/place-detail";
import { Button } from "@/components/ui/button";
import { getPlace } from "@/lib/data";
import { factsFromPlace } from "@/lib/facts";
import { evaluate } from "@/lib/matching";
import { aggregateProfile, emptyGroup, roomsNeeded } from "@/lib/group";
import { useGroup, useProfile } from "@/lib/storage";
import { AddToTrip } from "@/components/trip/add-to-trip";
import type { Place } from "@/lib/types";

type State = { id: string; place: Place | null } | { id: string; error: true };

/** Page d'un lieu, partageable par son adresse (/lieu/?id=…). La fiche est chargée dans le navigateur. */
export function PlacePage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  // ?groupe=1 : évaluer le lieu pour le groupe de la structure plutôt que pour le profil personnel.
  const isGroup = params.get("groupe") === "1";
  const personal = useProfile();
  const group = useGroup() ?? emptyGroup();
  const profile = isGroup ? aggregateProfile(group) : personal;
  const rooms = isGroup ? roomsNeeded(group) : 1;
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPlace(id)
      .then((place) => !cancelled && setState({ id, place }))
      .catch(() => !cancelled && setState({ id, error: true }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const current = state && state.id === id ? state : null;
  const place = current && "place" in current ? current.place : null;

  useEffect(() => {
    if (place) document.title = `${place.nom} · Ability`;
  }, [place]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link href={isGroup ? "/pro/" : "/recherche/"}>
          <ChevronLeft aria-hidden="true" />
          {isGroup ? "Retour au séjour de groupe" : "Retour à la recherche"}
        </Link>
      </Button>

      {!id || (current && !place) ? (
        <div role="alert" className="rounded-2xl border-2 border-dashed border-ink-400 p-6">
          <h1 className="text-2xl">Lieu introuvable</h1>
          <p className="mt-2 text-ink-700">
            {current && "error" in current
              ? "Les données n'ont pas pu être chargées. Rechargez la page."
              : "Cette fiche n'existe pas ou plus. Les identifiants changent quand les sources sont fusionnées autrement."}
          </p>
        </div>
      ) : !place ? (
        <p role="status" className="text-ink-600">
          Chargement de la fiche…
        </p>
      ) : (
        <>
          <h1 className="sr-only">{place.nom}</h1>
          {profile ? (
            <EvaluationSummary
              evaluation={evaluate(factsFromPlace(place), profile, { chambres: rooms })}
              profile={profile}
              placeName={place.nom}
              headingId="pour-votre-profil"
            />
          ) : (
            <section aria-label="Mon profil" className="flex flex-col gap-2 rounded-2xl bg-butter-100 p-4">
              <p className="font-extrabold">Ce lieu vous convient-il, à vous ?</p>
              <p className="text-ink-700">
                Décrivez vos besoins pour voir ce qui convient, ce qui bloque et ce qu&apos;il reste à confirmer.
              </p>
              <Button asChild className="self-start">
                <Link href="/profil/">
                  Décrire mes besoins
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </section>
          )}
          <PlaceDetail place={place} hideUnknown={Boolean(profile)} />
          {!isGroup && <AddToTrip place={place} />}
        </>
      )}
    </div>
  );
}
