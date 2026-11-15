/**
 * Générateur d'itinéraire par règles, sans IA.
 *
 * Chaque jour : une activité le matin, un déjeuner près de cette activité,
 * une seconde activité l'après-midi près de la première (si le rythme le
 * permet). Les lieux incompatibles sont exclus ; on préfère les lieux
 * compatibles, puis ceux qui ont le moins d'informations à confirmer, puis
 * les plus proches. Aucun lieu n'est proposé deux fois.
 */
import type { Compatibility } from "../matching/index.ts";
import { haversineKm, type LatLng } from "../routing.ts";
import type { Creneau } from "../trip.ts";
import type { Category } from "../types.ts";

export type Candidate = LatLng & {
  id: string;
  nom: string;
  c: Category;
  co: string | null;
  statut: Compatibility;
  /** Nombre d'exigences bloquantes à confirmer. */
  aConfirmer: number;
};

export type ItineraryOptions = {
  jours: number;
  /** 1 : une activité par jour (rythme calme). 2 : matin et après-midi. */
  activitesParJour: 1 | 2;
  /** Distance maximale entre l'hébergement et une activité, en km (à vol d'oiseau). */
  rayonActiviteKm: number;
  /** Distance maximale entre l'activité du matin et le restaurant, en km. */
  rayonDejeunerKm: number;
};

export const DEFAULT_OPTIONS: Omit<ItineraryOptions, "jours"> = {
  activitesParJour: 2,
  rayonActiviteKm: 25,
  rayonDejeunerKm: 3,
};

export type PlannedStop = { creneau: Creneau; lieu: Candidate | null; raison?: string };

const ACTIVITES: Category[] = ["activite", "plage"];
const RANG: Record<Compatibility, number> = { compatible: 0, a_confirmer: 1, incompatible: 2 };

function score(c: Candidate, from: LatLng) {
  return RANG[c.statut] * 1000 + c.aConfirmer * 20 + haversineKm(c, from);
}

function best(list: Candidate[], from: LatLng, maxKm: number, used: Set<string>): Candidate | null {
  let pick: Candidate | null = null;
  let pickScore = Infinity;
  for (const c of list) {
    if (used.has(c.id) || c.statut === "incompatible") continue;
    if (haversineKm(c, from) > maxKm) continue;
    const s = score(c, from);
    if (s < pickScore || (s === pickScore && pick && c.id < pick.id)) {
      pick = c;
      pickScore = s;
    }
  }
  return pick;
}

export function generateItinerary(base: LatLng, candidates: Candidate[], options: ItineraryOptions): PlannedStop[][] {
  const activites = candidates.filter((c) => ACTIVITES.includes(c.c));
  const restaurants = candidates.filter((c) => c.c === "restauration");
  const used = new Set<string>();
  const days: PlannedStop[][] = [];

  for (let d = 0; d < options.jours; d++) {
    const day: PlannedStop[] = [];
    const matin = best(activites, base, options.rayonActiviteKm, used);
    if (matin) used.add(matin.id);
    day.push(
      matin
        ? { creneau: "matin", lieu: matin }
        : { creneau: "matin", lieu: null, raison: `Aucune activité compatible ou à confirmer à moins de ${options.rayonActiviteKm} km.` },
    );

    const autour = matin ?? base;
    const dejeuner = best(restaurants, autour, options.rayonDejeunerKm, used);
    if (dejeuner) used.add(dejeuner.id);
    day.push(
      dejeuner
        ? { creneau: "midi", lieu: dejeuner }
        : { creneau: "midi", lieu: null, raison: `Aucun restaurant compatible ou à confirmer à moins de ${options.rayonDejeunerKm} km.` },
    );

    if (options.activitesParJour === 2) {
      // L'après-midi, on reste près du matin pour limiter les trajets.
      const apresMidi =
        best(activites, autour, Math.min(10, options.rayonActiviteKm), used) ??
        best(activites, base, options.rayonActiviteKm, used);
      if (apresMidi) used.add(apresMidi.id);
      day.push(
        apresMidi
          ? { creneau: "apres-midi", lieu: apresMidi }
          : { creneau: "apres-midi", lieu: null, raison: "Plus d'activité disponible : temps libre ou repos." },
      );
    }
    days.push(day);
  }
  return days;
}
