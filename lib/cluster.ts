/**
 * Regroupement des fiches sources en lieux, à partir des paires candidates
 * notées par scripts/etl/03_match.sql.
 *
 * Règles :
 * - un lieu contient au plus une fiche par source ;
 * - les paires sont traitées de la mieux notée à la moins bien notée ;
 * - score >= seuil de fusion : fusion automatique ;
 * - score entre le seuil de revue et le seuil de fusion : à vérifier à la main ;
 * - overrides.json force (« fusionner ») ou interdit (« separer ») une paire.
 *
 * Une clé de fiche s'écrit « source:identifiant », par exemple « osm:node/123 ».
 */

export type Candidate = {
  a: string;
  b: string;
  score: number;
  methode: string;
};

export type OverridePair = { a: string; b: string; note?: string };

export type Overrides = {
  fusionner: OverridePair[];
  separer: OverridePair[];
};

export type ReviewItem = Candidate & {
  motif: "score" | "conflit";
};

export type ClusterResult = {
  /** Clé de fiche -> identifiant de groupe (la plus petite clé du groupe). */
  clusterOf: Map<string, string>;
  aVerifier: ReviewItem[];
  fusionsAuto: number;
  fusionsForcees: number;
};

export const SEUIL_FUSION = 0.82;
export const SEUIL_REVUE = 0.65;

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const sourceOf = (cle: string) => cle.slice(0, cle.indexOf(":"));

export function buildClusters(
  cles: string[],
  candidates: Candidate[],
  overrides: Overrides = { fusionner: [], separer: [] },
  seuils = { fusion: SEUIL_FUSION, revue: SEUIL_REVUE },
): ClusterResult {
  const parent = new Map<string, string>();
  const sources = new Map<string, Set<string>>();
  for (const cle of cles) {
    parent.set(cle, cle);
    sources.set(cle, new Set([sourceOf(cle)]));
  }

  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // compression de chemin
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };

  /** Fusionne deux groupes s'ils n'ont aucune source en commun. */
  const union = (a: string, b: string): "ok" | "deja" | "conflit" | "inconnu" => {
    if (!parent.has(a) || !parent.has(b)) return "inconnu";
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return "deja";
    const sa = sources.get(ra)!;
    const sb = sources.get(rb)!;
    for (const s of sa) if (sb.has(s)) return "conflit";
    const [keep, drop] = ra < rb ? [ra, rb] : [rb, ra];
    parent.set(drop, keep);
    const merged = sources.get(keep)!;
    for (const s of sources.get(drop)!) merged.add(s);
    sources.delete(drop);
    return "ok";
  };

  const interdits = new Set(overrides.separer.map(({ a, b }) => pairKey(a, b)));
  const forces = new Set(overrides.fusionner.map(({ a, b }) => pairKey(a, b)));

  let fusionsForcees = 0;
  for (const { a, b } of overrides.fusionner) {
    if (union(a, b) === "ok") fusionsForcees++;
  }

  const sorted = [...candidates].sort(
    (x, y) => y.score - x.score || x.a.localeCompare(y.a) || x.b.localeCompare(y.b),
  );

  let fusionsAuto = 0;
  const aVerifier: ReviewItem[] = [];
  for (const c of sorted) {
    const key = pairKey(c.a, c.b);
    if (interdits.has(key) || forces.has(key)) continue;
    if (c.score >= seuils.fusion) {
      const res = union(c.a, c.b);
      if (res === "ok") fusionsAuto++;
      // Deux fiches d'une même source prétendent au même lieu : à trancher à la main.
      else if (res === "conflit") aVerifier.push({ ...c, motif: "conflit" });
    } else if (c.score >= seuils.revue) {
      aVerifier.push({ ...c, motif: "score" });
    }
  }

  const clusterOf = new Map<string, string>();
  for (const cle of cles) clusterOf.set(cle, find(cle));

  return {
    clusterOf,
    // Une paire déjà réunie par un autre chemin n'a plus besoin d'être vérifiée.
    aVerifier: aVerifier.filter((c) => clusterOf.get(c.a) !== clusterOf.get(c.b)),
    fusionsAuto,
    fusionsForcees,
  };
}
