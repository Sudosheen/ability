/**
 * Étape 1 : récupération des sources ouvertes pour l'Hérault (34).
 *
 *   pnpm etl:fetch            # tout
 *   pnpm etl:fetch osm        # une seule source : osm | acceslibre | th
 *
 * Chaque source est rangée dans son propre dossier sous data/raw/. Le fichier
 * national d'Acceslibre (~200 Mo) est filtré sur le 34 puis supprimé : seul
 * l'extrait est conservé dans le dépôt. Le reste de l'ETL (pnpm etl) ne touche
 * jamais au réseau.
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DuckDBInstance } from "@duckdb/node-api";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RAW = path.join(ROOT, "data/raw");
const USER_AGENT = "Ability-POC/0.1 (maquette etudiante, ETL open data Herault)";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Mêmes données que Wheelmap : tout objet portant une information fauteuil,
// plus les hébergements, lieux de visite, toilettes, plages et places PMR
// (même sans information, pour pouvoir afficher « inconnu »).
const OVERPASS_QUERY = `
[out:json][timeout:240];
area["ref:INSEE"="34"]["admin_level"="6"]->.a;
(
  nwr["wheelchair"](area.a);
  nwr["amenity"="toilets"](area.a);
  nwr["amenity"="parking_space"]["parking_space"="disabled"](area.a);
  nwr["amenity"="parking"]["capacity:disabled"](area.a);
  nwr["tourism"~"^(hotel|motel|guest_house|hostel|camp_site|chalet|apartment|museum|attraction|information)$"](area.a);
  nwr["natural"="beach"](area.a);
);
out center meta;
`;

const ACCESLIBRE_URL =
  "https://www.data.gouv.fr/api/1/datasets/r/5b0f44f2-e6ea-4a58-874d-6fe364b40342";
const TH_DATASET =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/liste-des-etablissements-labellises-tourisme-et-handicap";
const GEOCODERS = [
  "https://data.geopf.fr/geocodage/search",
  "https://api-adresse.data.gouv.fr/search/",
];

type SourceEntry = {
  id: string;
  titre: string;
  url: string;
  licence: string;
  attribution: string;
  fichier: string;
  octets: number;
  enregistrements: number;
  recupereLe: string;
  note?: string;
};

async function fileSize(file: string) {
  return (await stat(file)).size;
}

async function fetchOsm(): Promise<SourceEntry> {
  const dir = path.join(RAW, "osm");
  await mkdir(dir, { recursive: true });
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[osm] requête Overpass sur ${endpoint} …`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": USER_AGENT,
        },
        body: "data=" + encodeURIComponent(OVERPASS_QUERY),
        signal: AbortSignal.timeout(300_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = (await res.json()) as {
        osm3s?: { timestamp_osm_base?: string };
        elements: Record<string, unknown>[];
      };
      if (!Array.isArray(json.elements) || json.elements.length === 0) {
        throw new Error("réponse vide");
      }
      // On ne garde aucune donnée sur les contributeurs (user, uid, changeset).
      const elements = json.elements.map((el) => {
        const rest = { ...el };
        for (const key of ["user", "uid", "changeset", "nodes", "members"]) delete rest[key];
        return rest;
      });
      const file = path.join(dir, "herault.json");
      await writeFile(
        file,
        JSON.stringify({ base: json.osm3s?.timestamp_osm_base ?? null, elements }),
      );
      console.log(`[osm] ${elements.length} objets`);
      return {
        id: "osm",
        titre: "OpenStreetMap (données affichées par Wheelmap), via Overpass",
        url: endpoint,
        licence: "ODbL 1.0",
        attribution: "© les contributeurs d'OpenStreetMap",
        fichier: path.relative(ROOT, file),
        octets: await fileSize(file),
        enregistrements: elements.length,
        recupereLe: new Date().toISOString(),
        note: `Base OSM du ${json.osm3s?.timestamp_osm_base ?? "?"}`,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[osm] échec sur ${endpoint} : ${String(err)}`);
    }
  }
  throw new Error(`Overpass indisponible : ${String(lastError)}`);
}

async function fetchAcceslibre(): Promise<SourceEntry> {
  const dir = path.join(RAW, "acceslibre");
  await mkdir(dir, { recursive: true });
  const national = path.join(dir, "acceslibre-national.csv");
  const extrait = path.join(dir, "acceslibre_34.csv");

  console.log("[acceslibre] téléchargement de l'export national (~200 Mo) …");
  const res = await fetch(ACCESLIBRE_URL, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(national));
  const nationalBytes = await fileSize(national);
  console.log(`[acceslibre] ${(nationalBytes / 1e6).toFixed(0)} Mo reçus, filtrage sur le 34 …`);

  const db = await DuckDBInstance.create(":memory:");
  const con = await db.connect();
  await con.run(`
    COPY (
      SELECT * FROM read_csv('${national}', header = true, all_varchar = true,
                             delim = ',', quote = '"', escape = '"')
      WHERE postal_code LIKE '34___'
      ORDER BY id
    ) TO '${extrait}' (HEADER, DELIMITER ',');
  `);
  const count = await con.runAndReadAll(
    `SELECT count(*) AS n FROM read_csv('${extrait}', header = true, all_varchar = true)`,
  );
  const n = Number(count.getRowObjectsJson()[0].n);
  con.closeSync();
  await rm(national);
  console.log(`[acceslibre] ${n} établissements dans l'Hérault`);
  return {
    id: "acceslibre",
    titre: "Acceslibre : accessibilité des établissements recevant du public",
    url: ACCESLIBRE_URL,
    licence: "Licence Ouverte 2.0 (Etalab)",
    attribution: "Acceslibre, Ministère chargé des Transports / data.gouv.fr",
    fichier: path.relative(ROOT, extrait),
    octets: await fileSize(extrait),
    enregistrements: n,
    recupereLe: new Date().toISOString(),
    note: "L'export ne fournit pas de date de mise à jour par établissement.",
  };
}

type ThRecord = {
  nom_etablissement: string | null;
  adresse: string | null;
  commune: string | null;
  cp: string | null;
  geocodage: { lon: number; lat: number } | null;
  [key: string]: unknown;
};

async function geocode(q: string, postcode: string) {
  for (const base of GEOCODERS) {
    try {
      const url = `${base}?q=${encodeURIComponent(q)}&postcode=${postcode}&limit=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        features?: {
          geometry: { coordinates: [number, number] };
          properties: { score: number; label: string; type: string };
        }[];
      };
      const f = json.features?.[0];
      if (!f) return null;
      return {
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        score: f.properties.score,
        libelle: f.properties.label,
        type: f.properties.type,
      };
    } catch {
      // essai du géocodeur suivant
    }
  }
  return null;
}

async function fetchTourismeHandicap(): Promise<SourceEntry> {
  const dir = path.join(RAW, "tourisme-handicap");
  await mkdir(dir, { recursive: true });
  const meta = (await (
    await fetch(TH_DATASET, { headers: { "User-Agent": USER_AGENT } })
  ).json()) as { metas?: { default?: { modified?: string; title?: string } } };
  const url = `${TH_DATASET}/exports/json?refine=${encodeURIComponent("departement:Hérault")}`;
  console.log("[th] téléchargement de la liste Tourisme & Handicap (Hérault) …");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const records = (await res.json()) as ThRecord[];
  const file = path.join(dir, "th_34.json");
  await writeFile(file, JSON.stringify(records, null, 1));

  // Les fiches sans coordonnées sont géocodées par la Base Adresse Nationale.
  // Le résultat est rangé à part : le fichier source reste intact.
  // `index` est la position de la fiche dans th_34.json.
  const geocodes: Record<string, unknown>[] = [];
  for (const [index, r] of records.entries()) {
    if (r.geocodage || !r.cp) continue;
    const q = [r.adresse, r.commune].filter(Boolean).join(" ");
    const hit = await geocode(q, r.cp);
    if (hit) geocodes.push({ index, ...hit });
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  await writeFile(path.join(dir, "th_34_geocodage.json"), JSON.stringify(geocodes, null, 1));
  console.log(`[th] ${records.length} établissements, ${geocodes.length} géocodés par la BAN`);
  const modified = meta.metas?.default?.modified ?? null;
  return {
    id: "th",
    titre: "Liste des établissements labellisés Tourisme & Handicap",
    url,
    licence: "Licence Ouverte 2.0 (Etalab)",
    attribution: "Direction générale des Entreprises / data.economie.gouv.fr",
    fichier: path.relative(ROOT, file),
    octets: await fileSize(file),
    enregistrements: records.length,
    recupereLe: new Date().toISOString(),
    note: `Jeu de données figé depuis le ${modified?.slice(0, 10) ?? "?"} : les labels (valables 5 ans) sont à reconfirmer.`,
  };
}

const FETCHERS: Record<string, () => Promise<SourceEntry>> = {
  osm: fetchOsm,
  acceslibre: fetchAcceslibre,
  th: fetchTourismeHandicap,
};

async function main() {
  const wanted = process.argv.slice(2);
  const ids = wanted.length ? wanted : Object.keys(FETCHERS);
  await mkdir(RAW, { recursive: true });
  const manifestFile = path.join(RAW, "manifest.json");
  let manifest: { sources: SourceEntry[] } = { sources: [] };
  try {
    manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  } catch {
    // premier lancement
  }
  for (const id of ids) {
    const fetcher = FETCHERS[id];
    if (!fetcher) throw new Error(`Source inconnue : ${id}`);
    const entry = await fetcher();
    manifest.sources = [...manifest.sources.filter((s) => s.id !== id), entry].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  }
  console.log("Terminé. Manifest : data/raw/manifest.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
