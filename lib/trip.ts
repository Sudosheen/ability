/**
 * Séjour : une destination, des dates, un hébergement et un programme jour
 * par jour. Les étapes gardent de quoi s'afficher sans recharger les fiches.
 */
import type { Category } from "./types.ts";

export type Creneau = "matin" | "midi" | "apres-midi";

export const CRENEAU_LABELS: Record<Creneau, string> = {
  matin: "Matin",
  midi: "Déjeuner",
  "apres-midi": "Après-midi",
};

export type TripStop = {
  id: string;
  nom: string;
  c: Category;
  lat: number;
  lng: number;
  co: string | null;
  creneau: Creneau;
};

export type Trip = {
  version: 1;
  commune: string | null;
  du: string | null;
  au: string | null;
  hebergement: TripStop | null;
  /** Un tableau d'étapes par jour. */
  programme: TripStop[][];
};

export const JOURS_MIN = 1;
export const JOURS_MAX = 7;
export const JOURS_DEFAUT = 3;

export function emptyTrip(jours = JOURS_DEFAUT): Trip {
  return { version: 1, commune: null, du: null, au: null, hebergement: null, programme: Array.from({ length: jours }, () => []) };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Nombre de jours d'un séjour d'après ses dates (arrivée et départ compris), borné de 1 à 7. */
export function daysBetween(du: string | null, au: string | null): number | null {
  if (!du || !au || !ISO.test(du) || !ISO.test(au)) return null;
  const n = Math.round((Date.parse(au) - Date.parse(du)) / 86_400_000) + 1;
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(JOURS_MAX, n);
}

/** Change le nombre de jours : les jours retirés perdent leurs étapes. */
export function setDayCount(trip: Trip, n: number): Trip {
  const jours = Math.min(JOURS_MAX, Math.max(JOURS_MIN, Math.round(n)));
  const programme = Array.from({ length: jours }, (_, i) => trip.programme[i] ?? []);
  return { ...trip, programme };
}

export function addStop(trip: Trip, day: number, stop: TripStop): Trip {
  if (day < 0 || day >= trip.programme.length) return trip;
  if (trip.programme[day].some((s) => s.id === stop.id)) return trip;
  const programme = trip.programme.map((d, i) => (i === day ? [...d, stop] : d));
  return { ...trip, programme };
}

export function removeStop(trip: Trip, day: number, index: number): Trip {
  const programme = trip.programme.map((d, i) => (i === day ? d.filter((_, j) => j !== index) : d));
  return { ...trip, programme };
}

/** Déplace une étape d'un cran dans sa journée (-1 vers le haut, 1 vers le bas). */
export function moveStop(trip: Trip, day: number, index: number, direction: -1 | 1): Trip {
  const list = [...(trip.programme[day] ?? [])];
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return trip;
  [list[index], list[target]] = [list[target], list[index]];
  return { ...trip, programme: trip.programme.map((d, i) => (i === day ? list : d)) };
}

/** Déplace une étape vers un autre jour, en fin de journée. */
export function moveStopToDay(trip: Trip, day: number, index: number, toDay: number): Trip {
  const stop = trip.programme[day]?.[index];
  if (!stop || toDay === day || toDay < 0 || toDay >= trip.programme.length) return trip;
  return addStop(removeStop(trip, day, index), toDay, stop);
}

const CATEGORIES: Category[] = [
  "hebergement", "restauration", "activite", "plage", "info", "sante",
  "commerce", "service", "autre", "toilettes", "stationnement",
];

function sanitizeStop(raw: unknown): TripStop | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.nom !== "string") return null;
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: r.id,
    nom: r.nom.slice(0, 160),
    c: CATEGORIES.includes(r.c as Category) ? (r.c as Category) : "autre",
    lat,
    lng,
    co: typeof r.co === "string" ? r.co : null,
    creneau: r.creneau === "matin" || r.creneau === "midi" ? r.creneau : "apres-midi",
  };
}

/** Remet d'aplomb un séjour lu depuis le navigateur. Rend null s'il est inutilisable. */
export function sanitizeTrip(raw: unknown): Trip | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1 || !Array.isArray(r.programme)) return null;
  const date = (v: unknown) => (typeof v === "string" && ISO.test(v) ? v : null);
  const programme = r.programme
    .slice(0, JOURS_MAX)
    .map((d) => (Array.isArray(d) ? d.map(sanitizeStop).filter((s): s is TripStop => s !== null) : []));
  return {
    version: 1,
    commune: typeof r.commune === "string" ? r.commune.slice(0, 80) : null,
    du: date(r.du),
    au: date(r.au),
    hebergement: sanitizeStop(r.hebergement),
    programme: programme.length ? programme : emptyTrip().programme,
  };
}

/** « mardi 3 mars » pour le jour i d'un séjour daté, sinon « Jour 1 ». */
export function dayLabel(trip: Trip, i: number): string {
  if (!trip.du) return `Jour ${i + 1}`;
  const d = new Date(`${trip.du}T12:00:00`);
  d.setDate(d.getDate() + i);
  return `Jour ${i + 1} · ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`;
}
