/**
 * « Faits » d'un lieu : les valeurs de critères dont le moteur de compatibilité
 * a besoin. Ils se lisent soit dans la fiche détaillée, soit dans les
 * propriétés compactes de la couche carte, ce qui permet de colorer toute la
 * carte selon un profil sans charger les fiches.
 */
import { CRITERIA_BY_KEY } from "./criteria.ts";
import type {
  AccessStatus,
  Category,
  CriterionScalar,
  CriterionValue,
  Place,
  PlaceFeatureProps,
} from "./types.ts";

/** Critère -> clé courte dans les propriétés de la couche carte. */
export const FACT_KEYS: Record<string, string> = {
  entree_plain_pied: "ep",
  entree_marches: "em",
  entree_rampe: "er",
  entree_ascenseur: "ea",
  entree_pmr: "eq",
  entree_largeur: "el",
  accueil_plain_pied: "ap",
  accueil_ascenseur: "aa",
  wc_adaptes: "wa",
  stationnement_pmr: "sp",
  chambres_accessibles: "ca",
  chambre_largeur_porte: "cl",
  chambre_aire_rotation: "cr",
  douche_plain_pied: "dp",
  wc_espace_transfert: "wt",
  lit_espace_dessous: "ld",
  leve_personne: "lp",
};

export type Facts = {
  categorie: Category;
  acces: AccessStatus;
  /** Valeur connue et non contestée d'un critère, sinon undefined. */
  value(cle: string): CriterionScalar | undefined;
  /** Les sources se contredisent-elles sur ce critère ? */
  divergent(cle: string): boolean;
};

export function factsFromPlace(place: Place): Facts {
  const get = (cle: string): CriterionValue | undefined => place.criteres[cle];
  return {
    categorie: place.categorie,
    acces: place.acces,
    value: (cle) => {
      const c = get(cle);
      return c && c.preuve !== "divergent" && c.valeur !== null ? c.valeur : undefined;
    },
    divergent: (cle) => get(cle)?.preuve === "divergent",
  };
}

/** Encode les faits d'une fiche pour la couche carte : booléens en 0/1, critères divergents à part. */
export function encodeFacts(place: Place): Pick<PlaceFeatureProps, "f" | "dv"> {
  const f: Record<string, number | string> = {};
  const dv: string[] = [];
  for (const [cle, short] of Object.entries(FACT_KEYS)) {
    const c = place.criteres[cle];
    if (!c || c.valeur === null) continue;
    if (c.preuve === "divergent") dv.push(short);
    else f[short] = typeof c.valeur === "boolean" ? (c.valeur ? 1 : 0) : c.valeur;
  }
  return {
    ...(Object.keys(f).length ? { f } : {}),
    ...(dv.length ? { dv } : {}),
  };
}

export function factsFromFeature(props: PlaceFeatureProps): Facts {
  return {
    categorie: props.c,
    acces: props.a,
    value: (cle) => {
      const raw = props.f?.[FACT_KEYS[cle]];
      if (raw === undefined) return undefined;
      return CRITERIA_BY_KEY[cle]?.type === "bool" ? raw === 1 : raw;
    },
    divergent: (cle) => props.dv?.includes(FACT_KEYS[cle]) ?? false,
  };
}
