/**
 * ETL hors ligne : normalisation, rapprochement, fusion, export.
 *
 *   pnpm etl
 *
 * Lit data/raw/ (rempli par `pnpm etl:fetch`) et écrit :
 *   public/data/places.geojson        lieux pour la carte (propriétés compactes)
 *   public/data/equipements.geojson   toilettes et stationnement adapté (calques)
 *   public/data/places/<xx>.json      fiches détaillées, par paquets
 *   public/data/communes.json         communes pour la recherche
 *   public/data/meta.json             sources, licences, dates
 *   data/review/a_verifier.csv        rapprochements à valider à la main
 *   data/review/echantillon_fusions.csv  50 fusions automatiques à contrôler
 *   data/report/qualite.{json,md}     rapport qualité
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import {
  buildClusters,
  SEUIL_FUSION,
  SEUIL_REVUE,
  type Candidate,
  type Overrides,
} from "../../lib/cluster.ts";
import { CRITERIA, CRITERIA_BY_KEY } from "../../lib/criteria.ts";
import { encodeFacts } from "../../lib/facts.ts";
import { parseValue, resolveAccess, resolveCriterion } from "../../lib/merge.ts";
import {
  SOURCE_BITS,
  type Category,
  type CriterionValue,
  type DateKind,
  type Place,
  type PlaceFeatureProps,
  type SourcedValue,
  type SourceId,
} from "../../lib/types.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const ETL = import.meta.dirname;
const OUT = path.join(ROOT, "public/data");
const REVIEW = path.join(ROOT, "data/review");
const REPORT = path.join(ROOT, "data/report");

const CATEGORY_LABELS: Record<Category, string> = {
  hebergement: "Hébergement",
  restauration: "Restauration",
  activite: "Activité",
  plage: "Plage",
  toilettes: "Toilettes publiques",
  stationnement: "Stationnement adapté",
  info: "Office de tourisme",
  sante: "Santé",
  commerce: "Commerce",
  service: "Service",
  autre: "Autre lieu",
};

type Row = Record<string, unknown>;

async function runSqlFile(con: DuckDBConnection, name: string) {
  const sql = await readFile(path.join(ETL, name), "utf8");
  const extracted = await con.extractStatements(sql);
  for (let i = 0; i < extracted.count; i++) {
    const prepared = await extracted.prepare(i);
    await prepared.run();
  }
}

async function rows(con: DuckDBConnection, sql: string): Promise<Row[]> {
  const reader = await con.runAndReadAll(sql);
  return reader.getRowObjectsJson() as Row[];
}

const num = (v: unknown) => Number(v);
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** « SAINT-PONS-DE-THOMIERES » -> « Saint-Pons-de-Thomieres » */
function titleCase(s: string) {
  if (s !== s.toUpperCase()) return s;
  const small = new Set(["de", "du", "des", "la", "le", "les", "sur", "sous", "en", "et", "l", "d"]);
  return s
    .toLowerCase()
    .replace(/[a-zà-ÿ]+/g, (w, offset: number) =>
      offset > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    );
}

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], data: Row[]) {
  return [header.join(","), ...data.map((r) => header.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n";
}

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((1000 * n) / d) / 10);

async function main() {
  const now = new Date();
  const manifest = JSON.parse(await readFile(path.join(ROOT, "data/raw/manifest.json"), "utf8")) as {
    sources: {
      id: string;
      titre: string;
      licence: string;
      attribution: string;
      enregistrements: number;
      recupereLe: string;
      note?: string;
    }[];
  };
  const thNote = manifest.sources.find((s) => s.id === "th")?.note ?? "";
  const thDate = /\d{4}-\d{2}-\d{2}/.exec(thNote)?.[0] ?? "2020-12-15";

  // ETL_DB=data/work/etl.duckdb garde la base sur disque, pour l'explorer après coup.
  const dbFile = process.env.ETL_DB ? path.resolve(ROOT, process.env.ETL_DB) : ":memory:";
  if (dbFile !== ":memory:") {
    await mkdir(path.dirname(dbFile), { recursive: true });
    await rm(dbFile, { force: true });
  }
  const db = await DuckDBInstance.create(dbFile);
  const con = await db.connect();
  // Les chemins des fichiers SQL sont relatifs à la racine du projet.
  process.chdir(ROOT);
  await con.run(`SET VARIABLE th_date = '${thDate}'`);

  console.log("2/5 normalisation …");
  await runSqlFile(con, "02_normalize.sql");
  // Lieux fictifs « vérifiés sur place » : ils entrent comme une quatrième
  // source, sans jamais être rapprochés des sources réelles.
  const demo = JSON.parse(await readFile(path.join(ROOT, "data/demo/lieux-fictifs.json"), "utf8")) as {
    lieux: {
      id: string;
      nom: string;
      activite: string;
      commune: string;
      codePostal: string;
      lat: number;
      lng: number;
      visiteLe: string;
      criteres: Record<string, string | number | boolean>;
    }[];
  };
  for (const lieu of demo.lieux) {
    if (!lieu.nom.includes("(lieu fictif)")) throw new Error(`Lieu fictif sans mention : ${lieu.nom}`);
    await con.run(
      `INSERT INTO src_places (source, source_id, nom, nom_norm, categorie, activite, adresse, code_postal, commune, lat, lng, coord_approx)
       VALUES ('demo', $id, $nom, norm_nom($nom), 'hebergement', $activite, 'Adresse fictive', $cp, $commune, $lat, $lng, false)`,
      { id: lieu.id, nom: lieu.nom, activite: lieu.activite, cp: lieu.codePostal, commune: lieu.commune, lat: lieu.lat, lng: lieu.lng },
    );
    for (const [cle, valeur] of Object.entries(lieu.criteres)) {
      if (!CRITERIA_BY_KEY[cle]) throw new Error(`${lieu.id} : critère hors catalogue « ${cle} »`);
      await con.run(
        `INSERT INTO src_criteria VALUES ('demo', $id, $cle, $valeur, $date, 'verification', false)`,
        { id: lieu.id, cle, valeur: String(valeur), date: lieu.visiteLe },
      );
    }
  }

  console.log("3/5 rapprochement …");
  await runSqlFile(con, "03_match.sql");

  // --- Regroupement -------------------------------------------------------
  const cles = (await rows(con, "SELECT cle FROM p ORDER BY cle")).map((r) => String(r.cle));
  const candidateRows = await rows(con, "SELECT * FROM match_candidates");
  const candidates: Candidate[] = candidateRows.map((r) => ({
    a: String(r.a),
    b: String(r.b),
    score: num(r.score),
    methode: String(r.methode),
  }));
  const overrides = JSON.parse(await readFile(path.join(ETL, "overrides.json"), "utf8")) as Overrides;
  const clusters = buildClusters(cles, candidates, overrides);

  await con.run("CREATE OR REPLACE TABLE clusters (cle VARCHAR, cluster_id VARCHAR)");
  const appender = await con.createAppender("clusters");
  for (const [cle, clusterId] of clusters.clusterOf) {
    appender.appendVarchar(cle);
    appender.appendVarchar(clusterId);
    appender.endRow();
  }
  appender.flushSync();
  appender.closeSync();

  console.log("4/5 fusion …");
  await runSqlFile(con, "04_merge.sql");

  // --- Export -------------------------------------------------------------
  console.log("5/5 export …");
  const placeRows = await rows(con, "SELECT * FROM places ORDER BY cluster_id");
  const sourceRows = await rows(con, "SELECT * FROM place_sources");
  const valueRows = await rows(con, "SELECT * FROM place_values");

  const sourcesByCluster = new Map<string, Row[]>();
  for (const r of sourceRows) {
    const k = String(r.cluster_id);
    (sourcesByCluster.get(k) ?? sourcesByCluster.set(k, []).get(k)!).push(r);
  }
  const valuesByCluster = new Map<string, Row[]>();
  for (const r of valueRows) {
    const k = String(r.cluster_id);
    (valuesByCluster.get(k) ?? valuesByCluster.set(k, []).get(k)!).push(r);
  }

  const places: Place[] = [];
  const idByCluster = new Map<string, string>();
  let sansCoordonnees = 0;
  const seenIds = new Set<string>();

  for (const r of placeRows) {
    const clusterId = String(r.cluster_id);
    if (r.lat === null || r.lng === null) {
      sansCoordonnees++;
      continue;
    }
    const members = sourcesByCluster.get(clusterId) ?? [];
    const id = createHash("sha1")
      .update(members.map((m) => `${m.source}:${m.source_id}`).sort().join("|"))
      .digest("hex")
      .slice(0, 10);
    if (seenIds.has(id)) throw new Error(`Collision d'identifiant : ${id}`);
    seenIds.add(id);
    idByCluster.set(clusterId, id);

    const categorie = String(r.categorie) as Category;
    const nom = str(r.nom) ?? str(r.activite) ?? CATEGORY_LABELS[categorie];

    const grouped = new Map<string, SourcedValue[]>();
    for (const v of valuesByCluster.get(clusterId) ?? []) {
      const def = CRITERIA_BY_KEY[String(v.critere)];
      if (!def) throw new Error(`Critère hors catalogue : ${String(v.critere)}`);
      const valeur = parseValue(def, String(v.valeur));
      if (valeur === null) continue;
      const sv: SourcedValue = {
        source: String(v.source) as SourceId,
        valeur,
        date: str(v.date),
        dateType: str(v.date_type) as DateKind | null,
        ...(v.derive ? { derive: true } : {}),
      };
      (grouped.get(def.cle) ?? grouped.set(def.cle, []).get(def.cle)!).push(sv);
    }
    const criteres: Record<string, CriterionValue> = {};
    for (const def of CRITERIA) {
      const vals = grouped.get(def.cle);
      if (vals?.length) criteres[def.cle] = resolveCriterion(def, vals, now);
    }
    const { acces, preuve } = resolveAccess(criteres.acces_fauteuil);

    const commune = str(r.commune);
    places.push({
      id,
      slug: `${slugify(nom) || categorie}-${id}`,
      nom,
      categorie,
      activite: str(r.activite),
      adresse: str(r.adresse),
      codePostal: str(r.code_postal),
      commune: commune ? titleCase(commune) : null,
      lat: Math.round(num(r.lat) * 1e6) / 1e6,
      lng: Math.round(num(r.lng) * 1e6) / 1e6,
      siteWeb: str(r.site_web),
      acces,
      accesPreuve: preuve,
      note: str(r.note),
      sources: members.map((m) => ({
        source: String(m.source) as SourceId,
        id: String(m.source_id),
        url: str(m.url),
      })),
      criteres,
    });
  }

  // Seuls les fichiers produits ici sont remplacés (public/data/routes est conservé).
  await rm(path.join(OUT, "places"), { recursive: true, force: true });
  await mkdir(path.join(OUT, "places"), { recursive: true });
  await mkdir(REVIEW, { recursive: true });
  await mkdir(REPORT, { recursive: true });

  // Fiches détaillées, regroupées par les deux premiers caractères de l'identifiant.
  const shards = new Map<string, Record<string, Place>>();
  for (const pl of places) {
    const key = pl.id.slice(0, 2);
    (shards.get(key) ?? shards.set(key, {}).get(key)!)[pl.id] = pl;
  }
  for (const [key, content] of shards) {
    await writeFile(path.join(OUT, "places", `${key}.json`), JSON.stringify(content));
  }

  // Couches carte.
  const feature = (pl: Place) => {
    const wc = pl.criteres.wc_adaptes;
    const pk = pl.criteres.stationnement_pmr;
    const props: PlaceFeatureProps = {
      id: pl.id,
      n: pl.nom,
      c: pl.categorie,
      a: pl.acces,
      p: pl.accesPreuve,
      s: pl.sources.reduce((bits, s) => bits | (SOURCE_BITS[s.source as keyof typeof SOURCE_BITS] ?? 0), 0),
      co: pl.commune,
      ...(wc && wc.preuve !== "divergent" && typeof wc.valeur === "boolean" ? { w: wc.valeur ? 1 : 0 } : {}),
      ...(pk && pk.preuve !== "divergent" && typeof pk.valeur === "boolean" ? { k: pk.valeur ? 1 : 0 } : {}),
      ...encodeFacts(pl),
    };
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Math.round(pl.lng * 1e5) / 1e5, Math.round(pl.lat * 1e5) / 1e5],
      },
      properties: props,
    };
  };
  // Trois couches, pour ne charger au départ que ce qui sert à préparer un séjour.
  const COUCHES: Record<string, Category[]> = {
    places: ["hebergement", "restauration", "activite", "plage", "info"],
    services: ["sante", "commerce", "service", "autre"],
    equipements: ["toilettes", "stationnement"],
  };
  const isEquipement = (pl: Place) => COUCHES.equipements.includes(pl.categorie);
  const poids: Record<string, number> = {};
  const parCouche: Record<string, number> = {};
  for (const [couche, categories] of Object.entries(COUCHES)) {
    const list = places.filter((pl) => categories.includes(pl.categorie));
    const json = JSON.stringify({ type: "FeatureCollection", features: list.map(feature) });
    await writeFile(path.join(OUT, `${couche}.geojson`), json);
    poids[`${couche}.geojson`] = Buffer.byteLength(json);
    parCouche[couche] = list.length;
  }

  // Communes (noms et centres d'après Acceslibre), pour la barre de recherche.
  const communes = (
    await rows(
      con,
      `SELECT arg_max(commune, n) AS nom, sum(n) AS n,
              round(sum(lat * n) / sum(n), 5) AS lat, round(sum(lng * n) / sum(n), 5) AS lng
       FROM (SELECT commune, norm_txt(commune) AS cle, count(*) AS n,
                    median(CAST(latitude AS DOUBLE)) AS lat, median(CAST(longitude AS DOUBLE)) AS lng
             FROM acceslibre_raw WHERE commune IS NOT NULL GROUP BY ALL)
       GROUP BY cle ORDER BY n DESC, nom`,
    )
  ).map((r) => ({ nom: String(r.nom), n: num(r.n), lat: num(r.lat), lng: num(r.lng) }));
  await writeFile(path.join(OUT, "communes.json"), JSON.stringify(communes));

  // --- Revue manuelle -----------------------------------------------------
  const candidateByPair = new Map(candidateRows.map((r) => [`${r.a}|${r.b}`, r]));
  const reviewHeader = [
    "score", "motif", "methode", "dist_m", "nom_a", "nom_b", "cat_a", "cat_b",
    "adresse_a", "adresse_b", "commune", "a", "b",
  ];
  const reviewRows = clusters.aVerifier.map((c) => ({
    ...candidateByPair.get(`${c.a}|${c.b}`),
    motif: c.motif,
  }));
  await writeFile(path.join(REVIEW, "a_verifier.csv"), toCsv(reviewHeader, reviewRows));

  // Échantillon stable de 50 fusions automatiques, pour le contrôle à la main.
  const autoMerged = candidateRows.filter(
    (r) =>
      num(r.score) >= SEUIL_FUSION &&
      clusters.clusterOf.get(String(r.a)) === clusters.clusterOf.get(String(r.b)),
  );
  const sample = [...autoMerged]
    .sort((x, y) =>
      createHash("sha1").update(`${x.a}|${x.b}`).digest("hex").localeCompare(
        createHash("sha1").update(`${y.a}|${y.b}`).digest("hex"),
      ),
    )
    .slice(0, 50);
  await writeFile(
    path.join(REVIEW, "echantillon_fusions.csv"),
    toCsv(["correct", ...reviewHeader.filter((h) => h !== "motif")], sample),
  );

  // --- Rapport qualité ----------------------------------------------------
  const countBy = <T,>(list: T[], key: (x: T) => string) => {
    const out: Record<string, number> = {};
    for (const x of list) out[key(x)] = (out[key(x)] ?? 0) + 1;
    return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
  };
  const gardees = Object.fromEntries(
    (await rows(con, "SELECT source, count(*) AS n FROM src_places GROUP BY 1")).map((r) => [
      String(r.source),
      num(r.n),
    ]),
  );
  const combinaison = (pl: Place) => pl.sources.map((s) => s.source).sort().join(" + ");
  const withSource = (s: SourceId) => places.filter((pl) => pl.sources.some((x) => x.source === s));
  const matched = (s: SourceId) => withSource(s).filter((pl) => pl.sources.length > 1).length;
  const divergences: Record<string, number> = {};
  let aReconfirmer = 0;
  for (const pl of places) {
    for (const [cle, c] of Object.entries(pl.criteres)) {
      if (c.preuve === "divergent") divergences[cle] = (divergences[cle] ?? 0) + 1;
    }
    if (pl.criteres.acces_fauteuil?.aReconfirmer) aReconfirmer++;
  }
  const hebergements = places.filter((pl) => pl.categorie === "hebergement");
  const couverture = Object.fromEntries(
    CRITERIA.filter((c) => c.bloquant).map((c) => {
      const n = hebergements.filter((pl) => pl.criteres[c.cle]).length;
      return [c.cle, { libelle: c.libelle, renseigne: n, pourcentage: pct(n, hebergements.length) }];
    }),
  );

  const report = {
    genereLe: now.toISOString(),
    sources: manifest.sources.map((s) => ({
      id: s.id,
      titre: s.titre,
      recupereLe: s.recupereLe,
      fichesBrutes: s.enregistrements,
      fichesGardees: gardees[s.id] ?? 0,
      note: s.note ?? null,
    })),
    lieux: {
      total: places.length,
      parCouche,
      sansCoordonnees,
      parCategorie: countBy(places, (pl) => pl.categorie),
      parCombinaisonDeSources: countBy(places, combinaison),
    },
    rapprochement: {
      seuilFusion: SEUIL_FUSION,
      seuilRevue: SEUIL_REVUE,
      pairesCandidates: candidates.length,
      fusionsAutomatiques: clusters.fusionsAuto,
      fusionsForcees: clusters.fusionsForcees,
      aVerifier: clusters.aVerifier.length,
      tauxParSource: Object.fromEntries(
        (["acceslibre", "osm", "th"] as SourceId[]).map((s) => [
          s,
          { fiches: withSource(s).length, rapprochees: matched(s), pourcentage: pct(matched(s), withSource(s).length) },
        ]),
      ),
    },
    accessibilite: {
      parStatut: countBy(places.filter((pl) => !isEquipement(pl)), (pl) => pl.acces),
      parStatutHebergements: countBy(hebergements, (pl) => pl.acces),
      aReconfirmer,
    },
    divergences,
    couvertureCriteresBloquantsHebergements: {
      hebergements: hebergements.length,
      criteres: couverture,
    },
    poids: { ...poids, paquetsDeFiches: shards.size },
  };
  await writeFile(path.join(REPORT, "qualite.json"), JSON.stringify(report, null, 2) + "\n");

  const table = (obj: Record<string, number>) =>
    Object.entries(obj).map(([k, v]) => `| ${k} | ${v} |`).join("\n");
  const md = `# Rapport qualité des données Ability

Généré le ${now.toISOString().slice(0, 10)} par \`pnpm etl\`. Territoire : Hérault (34).

## Sources

| Source | Récupérée le | Fiches brutes | Fiches gardées | Remarque |
|---|---|---|---|---|
${report.sources.map((s) => `| ${s.titre} | ${s.recupereLe.slice(0, 10)} | ${s.fichesBrutes} | ${s.fichesGardees} | ${s.note ?? ""} |`).join("\n")}

Les fiches écartées sont hors de l'Hérault, ou sont des objets OpenStreetMap qui ne sont pas des lieux (passages piétons, arrêts, panneaux).

## Lieux après fusion

- **${report.lieux.total}** lieux : ${parCouche.places} pour préparer un séjour (hébergements, restauration, activités, plages, offices de tourisme), ${parCouche.services} commerces, services et lieux de santé, ${parCouche.equipements} équipements (toilettes, stationnement adapté).
- ${report.lieux.sansCoordonnees} fiche(s) sans coordonnées, absentes de la carte.
- ${demo.lieux.length} hébergements **fictifs** « vérifiés sur place » (\`data/demo/lieux-fictifs.json\`) sont comptés dans ces totaux. Leur nom porte la mention « lieu fictif ».

| Catégorie | Lieux |
|---|---|
${table(report.lieux.parCategorie)}

| Sources réunies | Lieux |
|---|---|
${table(report.lieux.parCombinaisonDeSources)}

## Rapprochement

- ${report.rapprochement.pairesCandidates} paires candidates (score d'au moins 0,5).
- **${report.rapprochement.fusionsAutomatiques}** fusions automatiques (score d'au moins ${SEUIL_FUSION}), ${report.rapprochement.fusionsForcees} forcée(s) par \`overrides.json\`.
- **${report.rapprochement.aVerifier}** paires à vérifier à la main : \`data/review/a_verifier.csv\`.
- Contrôle : \`data/review/echantillon_fusions.csv\` contient 50 fusions automatiques à relire.

| Source | Fiches | Rapprochées d'une autre source | Taux |
|---|---|---|---|
${Object.entries(report.rapprochement.tauxParSource).map(([s, v]) => `| ${s} | ${v.fiches} | ${v.rapprochees} | ${v.pourcentage} % |`).join("\n")}

## Accessibilité en fauteuil (hors équipements)

| Statut | Lieux |
|---|---|
${table(report.accessibilite.parStatut)}

Hébergements seuls :

| Statut | Hébergements |
|---|---|
${table(report.accessibilite.parStatutHebergements)}

${report.accessibilite.aReconfirmer} lieux ont une information d'accès datée de plus de 24 mois (« à reconfirmer »).

## Divergences entre sources

| Critère | Lieux où les sources se contredisent |
|---|---|
${table(report.divergences) || "| (aucune) | 0 |"}

## Critères bloquants renseignés pour les ${report.couvertureCriteresBloquantsHebergements.hebergements} hébergements

| Critère | Renseigné | Part |
|---|---|---|
${Object.values(couverture).map((c) => `| ${c.libelle} | ${c.renseigne} | ${c.pourcentage} % |`).join("\n")}

Les critères à 0 % n'existent dans aucune source ouverte : ce sont ceux qu'Ability devra collecter (visites, questions aux établissements).

## Poids des fichiers

${Object.entries(poids).map(([f, o]) => `- \`${f}\` : ${(o / 1e6).toFixed(2)} Mo`).join("\n")}
- ${shards.size} paquets de fiches détaillées
`;
  await writeFile(path.join(REPORT, "qualite.md"), md);

  // Métadonnées pour l'interface (pied de page, à propos, légende).
  await writeFile(
    path.join(OUT, "meta.json"),
    JSON.stringify({
      genereLe: now.toISOString(),
      sources: manifest.sources.map((s) => ({
        id: s.id,
        titre: s.titre,
        licence: s.licence,
        attribution: s.attribution,
        recupereLe: s.recupereLe,
        fiches: gardees[s.id] ?? 0,
        note: s.note ?? null,
      })),
      total: places.length,
      parCouche,
      parCategorie: report.lieux.parCategorie,
      parStatut: report.accessibilite.parStatut,
      hebergements: {
        total: hebergements.length,
        parStatut: report.accessibilite.parStatutHebergements,
      },
      fictifs: demo.lieux.length,
      fusions: clusters.fusionsAuto + clusters.fusionsForcees,
      divergences: Object.values(divergences).reduce((a, b) => a + b, 0),
    }),
  );

  con.closeSync();
  console.log(
    `Terminé : ${places.length} lieux, ${clusters.fusionsAuto} fusions automatiques, ` +
      `${clusters.aVerifier.length} à vérifier. Rapport : data/report/qualite.md`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
