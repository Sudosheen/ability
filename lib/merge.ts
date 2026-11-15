/**
 * Règle de fusion d'un critère renseigné par plusieurs sources.
 *
 * - On garde toutes les valeurs, source par source.
 * - La valeur affichée est celle de la source la plus fiable.
 * - Si deux sources se contredisent, le critère est « divergent » : il ne
 *   peut plus servir à déclarer un lieu compatible.
 * - Une information datée de plus de 24 mois est « à reconfirmer ».
 */
import type { CriterionDef } from "./criteria.ts";
import type {
  AccessStatus,
  CriterionScalar,
  CriterionValue,
  DateKind,
  ProofLevel,
  SourcedValue,
  SourceId,
} from "./types.ts";

/** Ordre de confiance : visite simulée, label, Acceslibre, OpenStreetMap. */
export const SOURCE_PRIORITY: SourceId[] = ["demo", "th", "acceslibre", "osm"];

const PROOF_BY_SOURCE: Record<SourceId, ProofLevel> = {
  demo: "verifie",
  th: "label",
  acceslibre: "declare",
  osm: "indicatif",
};

export const STALE_AFTER_MONTHS = 24;

/** Convertit la valeur texte de l'ETL selon le type du critère. */
export function parseValue(def: CriterionDef, raw: string): CriterionScalar | null {
  const v = raw.trim();
  if (v === "") return null;
  if (def.type === "bool") {
    if (v === "true") return true;
    if (v === "false") return false;
    return null;
  }
  if (def.type === "nombre") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return v;
}

/** Deux valeurs d'un même critère se contredisent-elles ? */
export function valuesConflict(def: CriterionDef, a: CriterionScalar, b: CriterionScalar): boolean {
  if (def.type === "bool") return a !== b;
  if (def.type === "nombre") {
    return Math.abs(Number(a) - Number(b)) > (def.tolerance ?? 0);
  }
  if (def.cle === "acces_fauteuil") {
    // « partiel » ne contredit ni « oui » ni « non » : seul oui/non s'oppose.
    return (a === "oui" && b === "non") || (a === "non" && b === "oui");
  }
  return a !== b;
}

/** Une date connue et vieille de plus de 24 mois. La date d'un simple export ne compte pas. */
export function isStale(date: string | null, dateType: DateKind | null, now: Date): boolean {
  if (!date || !dateType || dateType === "export") return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - STALE_AFTER_MONTHS);
  return d < limit;
}

function priority(source: SourceId): number {
  const i = SOURCE_PRIORITY.indexOf(source);
  return i === -1 ? SOURCE_PRIORITY.length : i;
}

export function resolveCriterion(
  def: CriterionDef,
  values: SourcedValue[],
  now: Date,
): CriterionValue {
  const sources = [...values].sort((a, b) => priority(a.source) - priority(b.source));
  if (sources.length === 0) {
    return {
      valeur: null,
      preuve: "inconnu",
      source: null,
      date: null,
      dateType: null,
      aReconfirmer: false,
      sources: [],
    };
  }
  const best = sources[0];
  const divergent = sources.some((v, i) =>
    sources.slice(i + 1).some((w) => valuesConflict(def, v.valeur, w.valeur)),
  );
  return {
    valeur: best.valeur,
    preuve: divergent ? "divergent" : PROOF_BY_SOURCE[best.source],
    source: best.source,
    date: best.date,
    dateType: best.dateType,
    aReconfirmer: isStale(best.date, best.dateType, now),
    sources,
    ...(best.source === "demo" ? { demo: true } : {}),
  };
}

/** Accessibilité brute d'un lieu, d'après son critère « acces_fauteuil ». */
export function resolveAccess(critere: CriterionValue | undefined): {
  acces: AccessStatus;
  preuve: ProofLevel;
} {
  if (!critere || critere.valeur === null) return { acces: "inconnu", preuve: "inconnu" };
  if (critere.preuve === "divergent") return { acces: "divergent", preuve: "divergent" };
  const v = critere.valeur;
  if (v === "oui" || v === "partiel" || v === "non") return { acces: v, preuve: critere.preuve };
  return { acces: "inconnu", preuve: "inconnu" };
}
