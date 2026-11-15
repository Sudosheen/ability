/** Modèle de données partagé entre l'ETL (scripts/etl) et l'interface. */

export type SourceId = "acceslibre" | "osm" | "th" | "demo";

/** Niveau de preuve d'un critère, du plus fort au plus faible. */
export type ProofLevel =
  | "verifie" // visite sur place avec mesures (simulé dans la maquette)
  | "label" // label Tourisme & Handicap moteur
  | "communaute" // confirmations concordantes (simulé dans la maquette)
  | "declare" // Acceslibre : critères détaillés déclarés
  | "indicatif" // OpenStreetMap / Wheelmap : oui, partiel ou non
  | "divergent" // les sources se contredisent
  | "inconnu"; // aucune source

/** Accessibilité « brute » en fauteuil, telle que la donnent les sources. */
export type AccessStatus = "oui" | "partiel" | "non" | "inconnu" | "divergent";

export type Category =
  | "hebergement"
  | "restauration"
  | "activite"
  | "plage"
  | "toilettes"
  | "stationnement"
  | "info"
  | "sante"
  | "commerce"
  | "service"
  | "autre";

export type CriterionScalar = string | number | boolean;

/**
 * Nature de la date fournie par une source :
 * - verification : la source dit quand l'information a été vérifiée ;
 * - modification : dernière modification de l'objet (OpenStreetMap) ;
 * - liste : date de publication de la liste (label Tourisme & Handicap) ;
 * - export : la source ne date pas l'information, seul l'export est daté.
 */
export type DateKind = "verification" | "modification" | "liste" | "export";

export type SourcedValue = {
  source: SourceId;
  valeur: CriterionScalar;
  date: string | null;
  dateType: DateKind | null;
  /** Valeur déduite d'autres champs de la source (règle documentée dans l'ETL). */
  derive?: boolean;
};

export type CriterionValue = {
  /** Valeur affichée : celle de la source la plus fiable. null = inconnu. */
  valeur: CriterionScalar | null;
  preuve: ProofLevel;
  source: SourceId | null;
  date: string | null;
  dateType: DateKind | null;
  /** Information datée de plus de 24 mois. */
  aReconfirmer: boolean;
  /** Toutes les valeurs, source par source. */
  sources: SourcedValue[];
  demo?: boolean;
};

export type PlaceSourceRef = {
  source: SourceId;
  id: string;
  url: string | null;
};

export type Place = {
  id: string;
  slug: string;
  nom: string;
  categorie: Category;
  activite: string | null;
  adresse: string | null;
  codePostal: string | null;
  commune: string | null;
  lat: number;
  lng: number;
  siteWeb: string | null;
  acces: AccessStatus;
  accesPreuve: ProofLevel;
  note: string | null;
  sources: PlaceSourceRef[];
  criteres: Record<string, CriterionValue>;
};

/** Propriétés compactes d'un lieu dans public/data/places.geojson. */
export type PlaceFeatureProps = {
  id: string;
  /** nom */
  n: string;
  /** catégorie */
  c: Category;
  /** accessibilité brute */
  a: AccessStatus;
  /** niveau de preuve de l'accessibilité brute */
  p: ProofLevel;
  /** sources : 1 = Acceslibre, 2 = OpenStreetMap, 4 = Tourisme & Handicap, 8 = visite simulée */
  s: number;
  /** commune */
  co: string | null;
  /** WC adaptés : 1 oui, 0 non, absent = inconnu */
  w?: 0 | 1;
  /** stationnement PMR : 1 oui, 0 non, absent = inconnu */
  k?: 0 | 1;
  /** faits pour le moteur de compatibilité (clés courtes de lib/facts.ts, booléens en 0/1) */
  f?: Record<string, number | string>;
  /** clés courtes des critères sur lesquels les sources divergent */
  dv?: string[];
};

export const SOURCE_BITS: Record<SourceId, number> = {
  acceslibre: 1,
  osm: 2,
  th: 4,
  demo: 8,
};
