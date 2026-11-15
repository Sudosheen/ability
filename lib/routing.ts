/**
 * Estimation des trajets entre deux étapes, sans service externe.
 *
 * Distance à vol d'oiseau multipliée par 1,4 pour approcher le trajet réel.
 * En dessous de 2 km : en fauteuil, à 3,5 km/h. Au-delà : en véhicule
 * adapté, à 35 km/h de moyenne, plus 10 minutes pour l'installation.
 * Ce sont des ordres de grandeur, présentés comme tels.
 *
 * Plus tard : remplacer `estimateLeg` par un appel à openrouteservice
 * (profil wheelchair, pentes et revêtements) quand une clé est disponible.
 */

export type LatLng = { lat: number; lng: number };
export type Leg = { km: number; minutes: number; mode: "fauteuil" | "vehicule" };

export const DETOUR = 1.4;
export const SEUIL_FAUTEUIL_KM = 2;
const VITESSE_FAUTEUIL = 3.5;
const VITESSE_VEHICULE = 35;
const INSTALLATION_MIN = 10;

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function estimateLeg(a: LatLng, b: LatLng): Leg {
  const km = haversineKm(a, b) * DETOUR;
  if (km < SEUIL_FAUTEUIL_KM) {
    return { km, minutes: Math.max(1, Math.round((km / VITESSE_FAUTEUIL) * 60)), mode: "fauteuil" };
  }
  return { km, minutes: Math.round((km / VITESSE_VEHICULE) * 60) + INSTALLATION_MIN, mode: "vehicule" };
}

/** Trajets d'une journée : depuis l'hébergement, d'étape en étape, puis retour. */
export function dayLegs(base: LatLng | null, stops: LatLng[]): Leg[] {
  const points = base ? [base, ...stops, base] : stops;
  const legs: Leg[] = [];
  for (let i = 1; i < points.length; i++) legs.push(estimateLeg(points[i - 1], points[i]));
  return legs;
}

export function formatLeg(leg: Leg): string {
  const distance = leg.km < 1 ? `${Math.round(leg.km * 1000 / 50) * 50} m` : `${leg.km.toFixed(1).replace(".", ",")} km`;
  const duree = leg.minutes >= 60 ? `${Math.floor(leg.minutes / 60)} h ${String(leg.minutes % 60).padStart(2, "0")}` : `${leg.minutes} min`;
  return `${leg.mode === "fauteuil" ? "En fauteuil" : "En véhicule"} · ${distance} · environ ${duree}`;
}
