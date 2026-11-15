"use client";

import { useEffect, useMemo, useState } from "react";
import { getLayer, type PlaceFeature } from "@/lib/data";
import { factsFromFeature } from "@/lib/facts";
import type { Candidate } from "@/lib/itinerary";
import { evaluate, type Evaluation, type TripNeeds } from "@/lib/matching";
import type { NeedsProfile } from "@/lib/profile";
import type { Creneau, TripStop } from "@/lib/trip";

export type Evaluated = { feature: PlaceFeature; evaluation: Evaluation };

/** Lieux de la couche « places » (hébergements, restauration, activités…), évalués pour un profil. */
export function useEvaluatedPlaces(profile: NeedsProfile | null, needs: TripNeeds) {
  const [features, setFeatures] = useState<PlaceFeature[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLayer("places")
      .then((f) => !cancelled && setFeatures(f))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const chambres = needs.chambres;
  const evaluated = useMemo<Evaluated[] | null>(() => {
    if (!features || !profile) return null;
    return features.map((feature) => ({
      feature,
      evaluation: evaluate(factsFromFeature(feature.properties), profile, { chambres }),
    }));
  }, [features, profile, chambres]);

  return { evaluated, loading: !features && !error, error };
}

export function toCandidate({ feature, evaluation }: Evaluated): Candidate {
  const p = feature.properties;
  return {
    id: p.id,
    nom: p.n,
    c: p.c,
    co: p.co,
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    statut: evaluation.statut,
    aConfirmer: evaluation.aConfirmer.length,
  };
}

export function featureToStop(feature: PlaceFeature, creneau: Creneau): TripStop {
  const p = feature.properties;
  return { id: p.id, nom: p.n, c: p.c, co: p.co, lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0], creneau };
}
