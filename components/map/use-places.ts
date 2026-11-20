"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getLayer, type PlaceFeature } from "@/lib/data";
import { factsFromFeature } from "@/lib/facts";
import { CATEGORY_FILE, type LayerFile } from "@/lib/labels";
import { evaluate, type Evaluation } from "@/lib/matching";
import { PRESETS, isPresetId, type NeedsProfile } from "@/lib/profile";
import { readProfile, saveProfile } from "@/lib/storage";
import type { Category } from "@/lib/types";

/**
 * Lieux des catégories demandées (les couches sont téléchargées à la première
 * demande), et leur évaluation pour le profil s'il existe.
 */
export function usePlaces(categories: Set<Category>, profile: NeedsProfile | null) {
  const [layers, setLayers] = useState<Partial<Record<LayerFile, PlaceFeature[]>>>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    const needed = new Set([...categories].map((c) => CATEGORY_FILE[c]));
    for (const file of needed) {
      if (layers[file]) continue;
      getLayer(file)
        .then((features) => setLayers((prev) => (prev[file] ? prev : { ...prev, [file]: features })))
        .catch(() => setError(true));
    }
  }, [categories, layers]);

  const features = useMemo(
    () => (Object.values(layers) as PlaceFeature[][]).flatMap((list) => list.filter((f) => categories.has(f.properties.c))),
    [layers, categories],
  );

  const evaluations = useMemo(() => {
    if (!profile) return null;
    return new Map<string, Evaluation>(features.map((f) => [f.properties.id, evaluate(factsFromFeature(f.properties), profile)]));
  }, [features, profile]);

  const loading = !error && [...categories].some((c) => !layers[CATEGORY_FILE[c]]);
  return { features, evaluations, loading, error };
}

/**
 * Le choix « Qui voyage ? » de l'accueil (?profil=…) sert de profil d'exemple,
 * sans écraser un profil déjà enregistré. Rend vrai quand le profil courant vient de là.
 */
export function useUrlPreset(profile: NeedsProfile | null): boolean {
  const preset = useSearchParams().get("profil");
  useEffect(() => {
    if (isPresetId(preset) && !readProfile()) saveProfile(PRESETS[preset]);
  }, [preset]);
  return Boolean(profile && isPresetId(preset) && profile.nom === PRESETS[preset].nom);
}
