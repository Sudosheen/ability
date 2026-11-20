/**
 * Filtrage et tri des lieux, communs à la page Recherche et à la page Carte.
 * Fonctions pures : elles ne connaissent ni React ni la carte.
 */
import type { PlaceFeature } from "./data";
import { PROOF_ORDER } from "./labels";
import { compareEvaluations, type Compatibility, type Evaluation } from "./matching";
import { haversineKm, type LatLng } from "./routing";
import type { AccessStatus } from "./types";

/** Emprise d'une carte : [ouest, sud, est, nord]. */
export type Bounds = [west: number, south: number, east: number, north: number];

export type SortKey = "compatible" | "verifie" | "proche";

export const SORT_LABELS: Record<SortKey, string> = {
  compatible: "Le plus compatible",
  verifie: "Le mieux vérifié",
  proche: "Le plus proche",
};

/** Un lieu prêt à afficher : son évaluation (si un profil existe) et sa distance au point de recherche. */
export type Result = {
  feature: PlaceFeature;
  evaluation: Evaluation | null;
  km: number;
};

export function positionOf(feature: PlaceFeature): LatLng {
  return { lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] };
}

export function inBounds(feature: PlaceFeature, [w, s, e, n]: Bounds): boolean {
  const { lat, lng } = positionOf(feature);
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

export function boundsCenter([w, s, e, n]: Bounds): LatLng {
  return { lat: (s + n) / 2, lng: (w + e) / 2 };
}

/** Rayon (en km) du plus grand cercle qui tient dans l'emprise. */
export function boundsRadiusKm(b: Bounds): number {
  const c = boundsCenter(b);
  return Math.min(haversineKm(c, { lat: b[3], lng: c.lng }), haversineKm(c, { lat: c.lat, lng: b[2] }));
}

/** Nombre de sources d'un lieu, d'après le masque de bits de la couche carte. */
export function sourceCount(bits: number): number {
  let n = 0;
  for (let b = bits; b > 0; b >>= 1) n += b & 1;
  return n;
}

/** Lieux à moins de `km` du centre, avec leur distance et leur évaluation. */
export function resultsAround(
  features: PlaceFeature[],
  center: LatLng,
  km: number,
  evaluations: Map<string, Evaluation> | null,
): Result[] {
  const out: Result[] = [];
  for (const feature of features) {
    const d = haversineKm(center, positionOf(feature));
    if (d <= km) out.push({ feature, evaluation: evaluations?.get(feature.properties.id) ?? null, km: d });
  }
  return out;
}

/**
 * Filtre « compatibilité » (quand un profil existe) ou « accessibilité selon
 * les sources » (sans profil). Un lieu sans évaluation passe le filtre de compatibilité.
 */
export function matchesFilters(
  r: Result,
  filters: { compat: Set<Compatibility> | null; access: Set<AccessStatus> },
): boolean {
  if (filters.compat && r.evaluation) return filters.compat.has(r.evaluation.statut);
  return filters.access.has(r.feature.properties.a);
}

function proofRank(r: Result): number {
  const p = r.feature.properties;
  // Sans information d'accès, le niveau de preuve ne compte pas.
  return p.a === "inconnu" || p.a === "divergent" ? PROOF_ORDER.length : PROOF_ORDER.indexOf(p.p);
}

/** Comparateur pour Array.sort, selon le tri choisi. */
export function compareResults(a: Result, b: Result, key: SortKey): number {
  if (key === "compatible" && a.evaluation && b.evaluation) {
    const c = compareEvaluations(a.evaluation, b.evaluation);
    if (c) return c;
  }
  if (key !== "proche") {
    const c = proofRank(a) - proofRank(b) || sourceCount(b.feature.properties.s) - sourceCount(a.feature.properties.s);
    if (c) return c;
  }
  return a.km - b.km || a.feature.properties.id.localeCompare(b.feature.properties.id);
}

export function sortResults(results: Result[], key: SortKey): Result[] {
  return [...results].sort((a, b) => compareResults(a, b, key));
}

/** Nombre de résultats par statut de compatibilité. */
export function countCompat(results: Result[]): Record<Compatibility, number> {
  const counts: Record<Compatibility, number> = { compatible: 0, a_confirmer: 0, incompatible: 0 };
  for (const r of results) if (r.evaluation) counts[r.evaluation.statut]++;
  return counts;
}

/** Nombre de résultats par accessibilité selon les sources. */
export function countAccess(results: Result[]): Record<AccessStatus, number> {
  const counts: Record<AccessStatus, number> = { oui: 0, partiel: 0, non: 0, divergent: 0, inconnu: 0 };
  for (const r of results) counts[r.feature.properties.a]++;
  return counts;
}

/** « 350 m », « 2,4 km », « 12 km ». */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

export type ScreenPoint = { id: string; x: number; y: number };

/**
 * Marqueur le plus proche d'un clic, en pixels d'écran, s'il est à moins de
 * `radius` pixels. Sert à retrouver le lieu cliqué sans dépendre de l'index
 * interne de la carte.
 */
export function nearestPoint(points: ScreenPoint[], click: { x: number; y: number }, radius: number): string | null {
  let best: string | null = null;
  let bestD = radius * radius;
  for (const p of points) {
    const d = (p.x - click.x) ** 2 + (p.y - click.y) ** 2;
    if (d <= bestD) {
      best = p.id;
      bestD = d;
    }
  }
  return best;
}
