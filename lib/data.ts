/**
 * Accès aux données de la maquette. Tout passe par ce fichier : si le projet
 * continue, on remplacera ici les fichiers statiques par une base, sans
 * toucher aux écrans.
 */
import demoCommunity from "../data/demo/retours-fictifs.json";
import { simulatedOffer, type Offer } from "./budget";
import type { CommunityData } from "./community";
import type { LayerFile } from "./labels";
import type { Category, Place, PlaceFeatureProps } from "./types";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type PlaceFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: PlaceFeatureProps;
};

export type Commune = { nom: string; n: number; lat: number; lng: number };

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE_PATH}/data/${file}`);
  if (!res.ok) throw new Error(`Données indisponibles : ${file} (${res.status})`);
  return (await res.json()) as T;
}

const layerCache = new Map<LayerFile, Promise<PlaceFeature[]>>();

/** Lieux d'une couche de la carte (chargés une seule fois). */
export function getLayer(file: LayerFile): Promise<PlaceFeature[]> {
  let cached = layerCache.get(file);
  if (!cached) {
    cached = getJson<{ features: PlaceFeature[] }>(`${file}.geojson`).then((fc) => fc.features);
    cached.catch(() => layerCache.delete(file));
    layerCache.set(file, cached);
  }
  return cached;
}

const shardCache = new Map<string, Promise<Record<string, Place>>>();

/** Fiche détaillée d'un lieu, chargée à la demande. */
export async function getPlace(id: string): Promise<Place | null> {
  const key = id.slice(0, 2);
  let cached = shardCache.get(key);
  if (!cached) {
    cached = getJson<Record<string, Place>>(`places/${key}.json`);
    cached.catch(() => shardCache.delete(key));
    shardCache.set(key, cached);
  }
  return (await cached)[id] ?? null;
}

let communesCache: Promise<Commune[]> | null = null;

export function getCommunes(): Promise<Commune[]> {
  communesCache ??= getJson<Commune[]>("communes.json");
  return communesCache;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Commune dont le nom correspond le mieux à la saisie (les plus fournies d'abord). */
export function findCommune(communes: Commune[], query: string): Commune | null {
  const q = normalize(query);
  if (!q) return null;
  return (
    communes.find((c) => normalize(c.nom) === q) ??
    communes.find((c) => normalize(c.nom).startsWith(q)) ??
    communes.find((c) => normalize(c.nom).includes(q)) ??
    null
  );
}

/**
 * Prix et moyens de paiement d'un lieu. Dans la maquette, tout est simulé à
 * partir de l'identifiant du lieu ; plus tard, les tarifs viendront des
 * partenaires et la liste des prestataires conventionnés, de l'ANCV.
 */
export function getOffer(id: string, categorie: Category): Offer {
  return simulatedOffer(id, categorie);
}

/** Retours de démonstration de la communauté (inventés, sur les lieux fictifs seulement). */
export function getDemoCommunity(): CommunityData {
  return { retours: demoCommunity.retours, sejours: demoCommunity.sejours } as CommunityData;
}
