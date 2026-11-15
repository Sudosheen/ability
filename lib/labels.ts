/** Libellés et couleurs partagés par l'interface. Jamais la couleur seule : chaque statut a un texte et une forme. */
import type { AccessStatus, Category, DateKind, ProofLevel, SourceId } from "./types";

export const CATEGORY_LABELS: Record<Category, string> = {
  hebergement: "Hébergements",
  restauration: "Restauration",
  activite: "Activités et visites",
  plage: "Plages",
  info: "Offices de tourisme",
  sante: "Santé",
  commerce: "Commerces",
  service: "Services",
  autre: "Autres lieux",
  toilettes: "Toilettes",
  stationnement: "Stationnement adapté",
};

export const CATEGORY_SINGULAR: Record<Category, string> = {
  hebergement: "Hébergement",
  restauration: "Restauration",
  activite: "Activité ou visite",
  plage: "Plage",
  info: "Office de tourisme",
  sante: "Santé",
  commerce: "Commerce",
  service: "Service",
  autre: "Autre lieu",
  toilettes: "Toilettes",
  stationnement: "Stationnement adapté",
};

/** Fichier GeoJSON qui contient chaque catégorie. */
export type LayerFile = "places" | "services" | "equipements";

export const CATEGORY_FILE: Record<Category, LayerFile> = {
  hebergement: "places",
  restauration: "places",
  activite: "places",
  plage: "places",
  info: "places",
  sante: "services",
  commerce: "services",
  service: "services",
  autre: "services",
  toilettes: "equipements",
  stationnement: "equipements",
};

/** Ordre d'affichage des calques, et ceux activés à l'ouverture de la carte. */
export const CATEGORY_ORDER: Category[] = [
  "hebergement",
  "restauration",
  "activite",
  "plage",
  "info",
  "toilettes",
  "stationnement",
  "sante",
  "commerce",
  "service",
  "autre",
];

export const DEFAULT_CATEGORIES: Category[] = ["hebergement", "restauration", "activite", "plage", "info"];

export type StatusMeta = {
  label: string;
  /** Formulation courte, pour les marqueurs et les listes denses. */
  court: string;
  /** Couleur pleine (marqueur, pastille). */
  couleur: string;
  /** Classes Tailwind de la pastille texte. */
  classes: string;
};

export const ACCESS_META: Record<AccessStatus, StatusMeta> = {
  oui: {
    label: "Accessible en fauteuil",
    court: "Accessible",
    couleur: "#2e7d32",
    classes: "bg-ok-100 text-ok-700 border-ok-600/40",
  },
  partiel: {
    label: "Partiellement accessible",
    court: "Partiel",
    couleur: "#c25e00",
    classes: "bg-warn-100 text-warn-700 border-warn-600/40",
  },
  non: {
    label: "Non accessible en fauteuil",
    court: "Non accessible",
    couleur: "#b3261e",
    classes: "bg-ko-100 text-ko-700 border-ko-600/40",
  },
  divergent: {
    label: "Les sources se contredisent",
    court: "Sources divergentes",
    couleur: "#1d1b16",
    classes: "bg-sun-400 text-ink-900 border-ink-900/50",
  },
  inconnu: {
    label: "Accessibilité inconnue",
    court: "Inconnu",
    couleur: "#6b6657",
    classes: "bg-white text-ink-700 border-ink-400 border-dashed",
  },
};

export const ACCESS_ORDER: AccessStatus[] = ["oui", "partiel", "non", "divergent", "inconnu"];

export type ProofMeta = {
  label: string;
  description: string;
  classes: string;
};

export const PROOF_META: Record<ProofLevel, ProofMeta> = {
  verifie: {
    label: "Vérifié sur place",
    description: "Visite avec mesures et photos. Simulé dans cette maquette.",
    classes: "bg-ok-100 text-ok-700 border-ok-600/40",
  },
  label: {
    label: "Label officiel",
    description: "Label Tourisme & Handicap pour le handicap moteur.",
    classes: "bg-label-100 text-label-700 border-label-600/40",
  },
  communaute: {
    label: "Confirmé par la communauté",
    description: "Au moins deux retours concordants de voyageurs. Simulé dans cette maquette.",
    classes: "bg-commu-100 text-commu-700 border-commu-700/40",
  },
  declare: {
    label: "Déclaré",
    description: "Critères détaillés déclarés sur Acceslibre, sans vérification.",
    classes: "bg-ink-100 text-ink-900 border-ink-400",
  },
  indicatif: {
    label: "Indicatif",
    description: "Avis global (oui, partiel ou non) relevé sur OpenStreetMap, la base de Wheelmap.",
    classes: "bg-white text-ink-700 border-ink-400",
  },
  divergent: {
    label: "Sources divergentes",
    description: "Les sources ne disent pas la même chose : à confirmer avant de partir.",
    classes: "bg-sun-400 text-ink-900 border-ink-900/50",
  },
  inconnu: {
    label: "Inconnu",
    description: "Aucune source ne renseigne ce critère : c'est une question à poser à l'établissement.",
    classes: "bg-white text-ink-700 border-ink-400 border-dashed",
  },
};

export const PROOF_ORDER: ProofLevel[] = [
  "verifie",
  "label",
  "communaute",
  "declare",
  "indicatif",
  "divergent",
  "inconnu",
];

export const SOURCE_LABELS: Record<SourceId, string> = {
  acceslibre: "Acceslibre",
  osm: "OpenStreetMap / Wheelmap",
  th: "Tourisme & Handicap",
  demo: "Visite Ability (simulée)",
};

const DATE_PREFIX: Record<DateKind, string> = {
  verification: "vérifié en",
  modification: "modifié en",
  liste: "liste de",
  export: "",
};

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « vérifié en mars 2026 », « liste de décembre 2020 », ou « non daté ». */
export function formatDate(date: string | null, type: DateKind | null): string {
  if (!date || !type || type === "export") return "non daté";
  const [y, m] = date.split("-").map(Number);
  if (!y || !m) return "non daté";
  return `${DATE_PREFIX[type]} ${MOIS[m - 1]} ${y}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}
