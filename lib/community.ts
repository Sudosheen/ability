/**
 * Communauté : les voyageurs disent ce qu'ils ont constaté sur place, bloc par
 * bloc de la fiche d'accessibilité « niveau soignant ». Ces retours font monter
 * (ou descendre) le niveau de preuve des lieux.
 *
 * Règle de la maquette, volontairement simple :
 * - un seul retour ne suffit pas : le bloc reste « en attente d'un 2e retour » ;
 * - deux personnes différentes qui confirment : « Confirmé par la communauté » ;
 * - deux personnes différentes qui infirment : « Infirmé par la communauté » ;
 * - des avis contraires : « Avis contraires », à reconfirmer avant de partir.
 * Les retours de plus de 24 mois ne comptent plus.
 */
import type { Category, ProofLevel } from "./types.ts";

/** Les huit blocs de la fiche d'accessibilité « niveau soignant ». */
export type BlocId =
  | "stationnement"
  | "entrees"
  | "chambre"
  | "sanitaires"
  | "restauration"
  | "activites"
  | "transport"
  | "metadonnees";

export type BlocDef = {
  id: BlocId;
  libelle: string;
  /** Ce que le voyageur confirme ou infirme, en une question simple. */
  question: string;
  /** Catégories de lieux concernées. Vide : le bloc n'est pas confirmé par les voyageurs. */
  categories: Category[];
};

const LIEUX_RECUS: Category[] = ["hebergement", "restauration", "activite", "plage", "info"];

export const BLOCS: BlocDef[] = [
  {
    id: "stationnement",
    libelle: "Stationnement",
    question: "Avez-vous pu vous garer près de l'entrée, avec la place de déplier une rampe ou un hayon (minibus compris) ?",
    categories: LIEUX_RECUS,
  },
  {
    id: "entrees",
    libelle: "Entrées et circulations",
    question: "Entrée, portes, pentes et ascenseur : tout est-il passé en fauteuil, avec la place de faire demi-tour ?",
    categories: LIEUX_RECUS,
  },
  {
    id: "chambre",
    libelle: "Chambre",
    question: "La chambre correspondait-elle à la fiche (passage autour du lit, hauteur du lit, place pour un lève-personne) ?",
    categories: ["hebergement"],
  },
  {
    id: "sanitaires",
    libelle: "Sanitaires",
    question: "Toilettes et douche : barres d'appui, siège et place pour le transfert étaient-ils bien là ?",
    categories: ["hebergement", "restauration", "activite", "plage", "info"],
  },
  {
    id: "restauration",
    libelle: "Restauration",
    question: "Avez-vous pu manger à table en fauteuil, avec le reste du groupe ?",
    categories: ["hebergement", "restauration"],
  },
  {
    id: "activites",
    libelle: "Activités",
    question: "Le parcours s'est-il fait sans rupture (pas de marche, de sable ou de pente imprévue) ?",
    categories: ["activite", "plage"],
  },
  {
    id: "transport",
    libelle: "Transport",
    question: "Le trajet jusqu'ici (véhicule adapté, transport en commun, assistance) s'est-il passé comme prévu ?",
    categories: LIEUX_RECUS,
  },
  {
    id: "metadonnees",
    libelle: "Métadonnées",
    question: "Date, vérificateur et niveau de preuve : calculés à partir des retours, rien à remplir.",
    categories: [],
  },
];

export const BLOC_BY_ID = Object.fromEntries(BLOCS.map((b) => [b.id, b])) as Record<BlocId, BlocDef>;

/** Blocs qu'un voyageur peut confirmer pour une catégorie de lieu. */
export function blocsFor(categorie: Category): BlocDef[] {
  return BLOCS.filter((b) => b.categories.includes(categorie));
}

export type Reponse = "conforme" | "non_conforme" | "pas_vu";

export const REPONSE_LABELS: Record<Reponse, string> = {
  conforme: "Conforme",
  non_conforme: "Pas conforme",
  pas_vu: "Pas vu",
};

/** Ressenti d'ensemble sur l'itinéraire suivi. */
export type Ressenti = "sans_rupture" | "quelques_ruptures" | "difficile";

export const RESSENTI_LABELS: Record<Ressenti, string> = {
  sans_rupture: "Sans rupture : tout s'est enchaîné",
  quelques_ruptures: "Quelques ruptures, contournées",
  difficile: "Difficile : des étapes ont bloqué",
};

/** Retour d'un voyageur sur un lieu. */
export type Retour = {
  id: string;
  lieuId: string;
  lieuNom: string;
  categorie: Category;
  commune: string | null;
  /** Date de la visite, AAAA-MM-JJ. */
  date: string;
  /** Pseudonyme : jamais de nom réel dans la maquette. */
  auteur: string;
  blocs: Partial<Record<BlocId, Reponse>>;
  /** Une photo accompagne le retour (simulé : aucune image n'est envoyée). */
  photo: boolean;
  commentaire: string;
  /** Retour inventé pour la démonstration. */
  demo?: boolean;
};

/** Retour d'un voyageur sur l'itinéraire suivi dans son ensemble. */
export type RetourSejour = {
  id: string;
  date: string;
  auteur: string;
  commune: string | null;
  jours: number;
  ressenti: Ressenti;
  commentaire: string;
  demo?: boolean;
};

export type CommunityData = { retours: Retour[]; sejours: RetourSejour[] };

/** Verdict de la communauté sur un bloc d'un lieu. */
export type Verdict = "aucun" | "en_attente" | "confirme" | "infirme" | "contraire";

export const VERDICT_META: Record<Verdict, { label: string; description: string }> = {
  aucun: { label: "Aucun retour", description: "Personne n'a encore donné son avis sur ce point." },
  en_attente: {
    label: "1 retour, en attente d'un 2e",
    description: "Un seul voyageur s'est prononcé : il faut un second retour concordant.",
  },
  confirme: {
    label: "Confirmé par la communauté",
    description: "Au moins deux voyageurs différents l'ont constaté sur place.",
  },
  infirme: {
    label: "Infirmé par la communauté",
    description: "Au moins deux voyageurs différents disent que la fiche est fausse sur ce point.",
  },
  contraire: {
    label: "Avis contraires",
    description: "Les voyageurs ne disent pas la même chose : à reconfirmer avant de partir.",
  },
};

/** Au-delà de 24 mois, un retour ne compte plus. */
export const VALIDITE_MOIS = 24;
/** Nombre de personnes différentes qu'il faut pour confirmer ou infirmer. */
export const SEUIL_CONCORDANCE = 2;

function monthsBetween(from: string, to: string): number {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

export type BlocResult = {
  verdict: Verdict;
  conformes: number;
  nonConformes: number;
  photos: number;
  /** Date du retour le plus récent pris en compte. */
  derniere: string | null;
};

/**
 * Verdict d'un bloc d'après les retours. Une personne compte une seule fois
 * (son retour le plus récent), pour éviter qu'un même compte confirme seul.
 */
export function blocVerdict(retours: Retour[], bloc: BlocId, today: string): BlocResult {
  const parAuteur = new Map<string, Retour>();
  for (const r of retours) {
    const rep = r.blocs[bloc];
    if (!rep || rep === "pas_vu") continue;
    if (monthsBetween(r.date, today) > VALIDITE_MOIS) continue;
    const prev = parAuteur.get(r.auteur);
    if (!prev || prev.date < r.date) parAuteur.set(r.auteur, r);
  }
  const retenus = [...parAuteur.values()];
  const conformes = retenus.filter((r) => r.blocs[bloc] === "conforme").length;
  const nonConformes = retenus.length - conformes;
  const photos = retenus.filter((r) => r.photo).length;
  const derniere = retenus.reduce<string | null>((d, r) => (!d || r.date > d ? r.date : d), null);

  let verdict: Verdict = "aucun";
  if (conformes > 0 && nonConformes > 0) verdict = "contraire";
  else if (conformes >= SEUIL_CONCORDANCE) verdict = "confirme";
  else if (nonConformes >= SEUIL_CONCORDANCE) verdict = "infirme";
  else if (retenus.length > 0) verdict = "en_attente";
  return { verdict, conformes, nonConformes, photos, derniere };
}

/** Niveau de preuve qu'apporte la communauté à un bloc, ou null si elle ne change rien. */
export function verdictProof(verdict: Verdict): ProofLevel | null {
  if (verdict === "confirme") return "communaute";
  if (verdict === "contraire" || verdict === "infirme") return "divergent";
  return null;
}

export type PlaceCommunity = {
  lieuId: string;
  lieuNom: string;
  categorie: Category;
  commune: string | null;
  retours: number;
  blocs: { bloc: BlocDef; result: BlocResult }[];
  /** Bloc « métadonnées » : ce que la fiche enregistre sur la vérification. */
  meta: { derniere: string | null; verificateurs: number; confirmes: number; aReconfirmer: number };
  demo: boolean;
};

/** Synthèse par lieu : un verdict par bloc, et les métadonnées de vérification. */
export function summarizePlaces(retours: Retour[], today: string): PlaceCommunity[] {
  const byPlace = new Map<string, Retour[]>();
  for (const r of retours) byPlace.set(r.lieuId, [...(byPlace.get(r.lieuId) ?? []), r]);
  return [...byPlace.values()]
    .map((list) => {
      const first = list[0];
      const blocs = blocsFor(first.categorie).map((bloc) => ({ bloc, result: blocVerdict(list, bloc.id, today) }));
      const dates = list.map((r) => r.date).sort();
      return {
        lieuId: first.lieuId,
        lieuNom: first.lieuNom,
        categorie: first.categorie,
        commune: first.commune,
        retours: list.length,
        blocs,
        meta: {
          derniere: dates.at(-1) ?? null,
          verificateurs: new Set(list.map((r) => r.auteur)).size,
          confirmes: blocs.filter((b) => b.result.verdict === "confirme").length,
          aReconfirmer: blocs.filter((b) => b.result.verdict === "contraire" || b.result.verdict === "infirme").length,
        },
        demo: list.every((r) => r.demo),
      };
    })
    .sort((a, b) => b.meta.confirmes - a.meta.confirmes || a.lieuNom.localeCompare(b.lieuNom, "fr"));
}

// --- Lecture depuis le navigateur -----------------------------------------

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const REPONSES: Reponse[] = ["conforme", "non_conforme", "pas_vu"];
const RESSENTIS: Ressenti[] = ["sans_rupture", "quelques_ruptures", "difficile"];
const CATEGORIES: Category[] = ["hebergement", "restauration", "activite", "plage", "info"];

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function sanitizeRetour(raw: unknown): Retour | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.lieuId !== "string" || typeof r.date !== "string" || !ISO.test(r.date)) return null;
  const blocs: Partial<Record<BlocId, Reponse>> = {};
  if (r.blocs && typeof r.blocs === "object") {
    for (const b of BLOCS) {
      const v = (r.blocs as Record<string, unknown>)[b.id];
      if (REPONSES.includes(v as Reponse)) blocs[b.id] = v as Reponse;
    }
  }
  return {
    id: r.id,
    lieuId: r.lieuId,
    lieuNom: text(r.lieuNom, 160) || "Lieu",
    categorie: CATEGORIES.includes(r.categorie as Category) ? (r.categorie as Category) : "activite",
    commune: typeof r.commune === "string" ? r.commune.slice(0, 80) : null,
    date: r.date,
    auteur: text(r.auteur, 40) || "Moi",
    blocs,
    photo: r.photo === true,
    commentaire: text(r.commentaire, 600),
  };
}

function sanitizeSejour(raw: unknown): RetourSejour | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.date !== "string" || !ISO.test(r.date)) return null;
  const jours = Number(r.jours);
  return {
    id: r.id,
    date: r.date,
    auteur: text(r.auteur, 40) || "Moi",
    commune: typeof r.commune === "string" ? r.commune.slice(0, 80) : null,
    jours: Number.isFinite(jours) ? Math.min(7, Math.max(1, Math.round(jours))) : 1,
    ressenti: RESSENTIS.includes(r.ressenti as Ressenti) ? (r.ressenti as Ressenti) : "quelques_ruptures",
    commentaire: text(r.commentaire, 600),
  };
}

/** Remet d'aplomb les retours lus depuis le navigateur. Les retours « demo » n'y sont jamais. */
export function sanitizeCommunity(raw: unknown): CommunityData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const list = <T>(v: unknown, fn: (x: unknown) => T | null) =>
    Array.isArray(v) ? v.slice(-200).map(fn).filter((x): x is T => x !== null) : [];
  return { retours: list(r.retours, sanitizeRetour), sejours: list(r.sejours, sanitizeSejour) };
}
