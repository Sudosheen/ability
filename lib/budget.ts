/**
 * Budget de l'itinéraire entier (proposition à tester en entretien).
 *
 * Le coût total additionne deux natures de montants, toujours séparées :
 * - « réel » : le prix public du prestataire, pour les activités et les
 *   locations de matériel ;
 * - « estimé » : un ordre de grandeur, pour l'hébergement, la restauration et
 *   les trajets sur place. Il est affiché avec sa fourchette (± 25 %).
 *
 * Dans la maquette, tous les prix sont simulés (voir `simulatedOffer`) : ils
 * passent par lib/data.ts pour être remplacés plus tard par de vraies données.
 */
import { dayLegs } from "./routing.ts";
import type { Trip } from "./trip.ts";
import type { Category } from "./types.ts";

export type Portee = "sejour" | "personne";

export type BudgetSettings = {
  /** Enveloppe en euros. null : pas de plafond, on affiche seulement le coût. */
  montant: number | null;
  /** L'enveloppe vaut pour tout le séjour, ou par personne (accompagnants compris). */
  portee: Portee;
  /** Personnes en situation de handicap qui partent. */
  voyageurs: number;
  accompagnants: number;
  /** Ne garder que les prestataires qui acceptent les Chèques-Vacances ANCV. */
  chequesVacances: boolean;
};

export const DEFAULT_BUDGET: BudgetSettings = {
  montant: null,
  portee: "sejour",
  voyageurs: 1,
  accompagnants: 1,
  chequesVacances: false,
};

export const MONTANT_MAX = 20_000;

/** Acceptation des Chèques-Vacances par le prestataire. « sans_objet » : lieu gratuit. */
export type Acceptation = "oui" | "non" | "inconnu" | "sans_objet";

export type TarifAccompagnant = "gratuit" | "reduit" | "plein";

export type Offer = {
  /** Prix d'entrée par personne (réel), pour les activités. null quand le lieu n'a pas de billet. */
  prix: number | null;
  tarifAccompagnant: TarifAccompagnant | null;
  /** Prix moyen d'une chambre par nuit (estimé), pour les hébergements. */
  nuitEstimee: number | null;
  chequesVacances: Acceptation;
  /** Toujours vrai dans la maquette : aucun prix n'est réel. */
  simule: boolean;
};

// Hypothèses d'estimation : à affiner avec les entretiens et de vraies données.
export const REPAS_PAR_JOUR = 35; // déjeuner et dîner, par personne
export const NUIT_PAR_DEFAUT = 85; // quand aucun hébergement n'est choisi
export const KM_VEHICULE = 0.35; // carburant et usure d'un véhicule adapté
export const LEVE_PERSONNE_JOUR = 12; // location de lève-personne livré sur place
export const MARGE_ESTIMATION = 0.25;

/** Petit hachage stable : le même lieu donne toujours le même prix simulé. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PRIX_ACTIVITE = [0, 5, 8, 10, 12, 15, 18, 25, 35];
const NUITS = [62, 74, 85, 96, 110, 128, 145];

/** Offre simulée d'un lieu. À remplacer par les tarifs des partenaires (voir lib/data.ts). */
export function simulatedOffer(id: string, categorie: Category): Offer {
  const h = hash(id);
  const cv: Acceptation = h % 10 < 6 ? "oui" : h % 10 < 8 ? "non" : "inconnu";
  if (categorie === "hebergement") {
    return { prix: null, tarifAccompagnant: null, nuitEstimee: NUITS[(h >>> 4) % NUITS.length], chequesVacances: cv, simule: true };
  }
  if (categorie === "activite") {
    const prix = PRIX_ACTIVITE[(h >>> 4) % PRIX_ACTIVITE.length];
    const tarifs: TarifAccompagnant[] = ["gratuit", "gratuit", "reduit", "plein"];
    return {
      prix,
      tarifAccompagnant: prix === 0 ? null : tarifs[(h >>> 8) % tarifs.length],
      nuitEstimee: null,
      chequesVacances: prix === 0 ? "sans_objet" : cv,
      simule: true,
    };
  }
  if (categorie === "plage" || categorie === "info") {
    return { prix: 0, tarifAccompagnant: null, nuitEstimee: null, chequesVacances: "sans_objet", simule: true };
  }
  // Restauration et autres lieux : pas de billet, le repas est estimé.
  return { prix: null, tarifAccompagnant: null, nuitEstimee: null, chequesVacances: cv, simule: true };
}

/** Le lieu passe le filtre « Chèques-Vacances » : il les accepte, ou il est gratuit. Inconnu ne passe pas. */
export function acceptsChequesVacances(offer: Offer): boolean {
  return offer.chequesVacances === "oui" || offer.chequesVacances === "sans_objet";
}

export function personnes(s: BudgetSettings): number {
  return Math.max(1, s.voyageurs + s.accompagnants);
}

/** Enveloppe totale du séjour, quelle que soit la façon dont elle est saisie. */
export function envelope(s: BudgetSettings): number | null {
  if (s.montant === null) return null;
  return s.portee === "personne" ? s.montant * personnes(s) : s.montant;
}

/** Prix d'une activité pour tout le monde : les voyageurs paient plein tarif, les accompagnants selon le lieu. */
export function activityCost(offer: Offer, s: BudgetSettings): number {
  if (!offer.prix) return 0;
  const acc = offer.tarifAccompagnant === "gratuit" ? 0 : offer.tarifAccompagnant === "reduit" ? offer.prix / 2 : offer.prix;
  return offer.prix * s.voyageurs + acc * s.accompagnants;
}

export function nights(jours: number): number {
  return Math.max(1, jours - 1);
}

/** Une chambre pour deux, sauf pour un groupe qui indique son nombre de chambres. */
export function roomsFor(s: BudgetSettings, rooms?: number): number {
  return rooms ?? Math.ceil(personnes(s) / 2);
}

export type Nature = "reel" | "estime";

export type BudgetLine = {
  poste: "hebergement" | "activites" | "materiel" | "restauration" | "transport";
  libelle: string;
  nature: Nature;
  montant: number;
  detail: string;
};

export type BudgetStatus = "sans_plafond" | "dans_budget" | "incertain" | "depasse";

export type BudgetEstimate = {
  lignes: BudgetLine[];
  total: number;
  reel: number;
  estime: number;
  /** Fourchette du total : la part estimée varie de ± 25 %. */
  bas: number;
  haut: number;
  /** Part du total qui est estimée, de 0 à 1. */
  partEstimee: number;
  enveloppe: number | null;
  statut: BudgetStatus;
};

const euros = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

export type EstimateContext = {
  offerOf: (id: string, categorie: Category) => Offer;
  /** Nombre de chambres, pour un groupe. */
  rooms?: number;
  /** Lève-personne à louer sur place. */
  levePersonne?: boolean;
};

/** Coût de l'itinéraire entier, poste par poste, avec la part réelle et la part estimée. */
export function estimateTrip(trip: Trip, s: BudgetSettings, ctx: EstimateContext): BudgetEstimate {
  const jours = trip.programme.length;
  const n = nights(jours);
  const chambres = roomsFor(s, ctx.rooms);
  const p = personnes(s);
  const lignes: BudgetLine[] = [];

  const nuit = trip.hebergement ? (ctx.offerOf(trip.hebergement.id, "hebergement").nuitEstimee ?? NUIT_PAR_DEFAUT) : NUIT_PAR_DEFAUT;
  lignes.push({
    poste: "hebergement",
    libelle: "Hébergement",
    nature: "estime",
    montant: nuit * n * chambres,
    detail: `${n} nuit${n > 1 ? "s" : ""} × ${chambres} chambre${chambres > 1 ? "s" : ""} × environ ${euros(nuit)}${trip.hebergement ? "" : " (aucun hébergement choisi : prix moyen)"}`,
  });

  const activites = trip.programme.flat().filter((st) => st.c === "activite" || st.c === "plage" || st.c === "info");
  const coutActivites = activites.reduce((sum, st) => sum + activityCost(ctx.offerOf(st.id, st.c), s), 0);
  const gratuites = activites.filter((st) => activityCost(ctx.offerOf(st.id, st.c), s) === 0).length;
  lignes.push({
    poste: "activites",
    libelle: "Activités et visites",
    nature: "reel",
    montant: coutActivites,
    detail: activites.length
      ? `${activites.length} activité${activites.length > 1 ? "s" : ""}, ${gratuites === 0 ? "toutes payantes" : `dont ${gratuites} gratuite${gratuites > 1 ? "s" : ""}`}, tarifs accompagnant compris`
      : "Aucune activité au programme",
  });

  if (ctx.levePersonne) {
    lignes.push({
      poste: "materiel",
      libelle: "Location de lève-personne",
      nature: "reel",
      montant: LEVE_PERSONNE_JOUR * jours,
      detail: `${jours} jour${jours > 1 ? "s" : ""} × ${euros(LEVE_PERSONNE_JOUR)}, livré à l'hébergement`,
    });
  }

  lignes.push({
    poste: "restauration",
    libelle: "Repas",
    nature: "estime",
    montant: REPAS_PAR_JOUR * jours * p,
    detail: `${jours} jour${jours > 1 ? "s" : ""} × ${p} personne${p > 1 ? "s" : ""} × environ ${euros(REPAS_PAR_JOUR)} (déjeuner et dîner)`,
  });

  const km = trip.programme
    .flatMap((day) => dayLegs(trip.hebergement, day))
    .filter((leg) => leg.mode === "vehicule")
    .reduce((sum, leg) => sum + leg.km, 0);
  lignes.push({
    poste: "transport",
    libelle: "Trajets sur place",
    nature: "estime",
    montant: km * KM_VEHICULE,
    detail: `Environ ${Math.round(km)} km en véhicule adapté × ${KM_VEHICULE.toLocaleString("fr-FR")} €. Le voyage aller-retour n'est pas compté.`,
  });

  const reel = lignes.filter((l) => l.nature === "reel").reduce((a, l) => a + l.montant, 0);
  const estime = lignes.filter((l) => l.nature === "estime").reduce((a, l) => a + l.montant, 0);
  const total = reel + estime;
  const bas = reel + estime * (1 - MARGE_ESTIMATION);
  const haut = reel + estime * (1 + MARGE_ESTIMATION);
  const env = envelope(s);
  const statut: BudgetStatus =
    env === null ? "sans_plafond" : haut <= env ? "dans_budget" : total <= env ? "incertain" : "depasse";
  return { lignes, total, reel, estime, bas, haut, partEstimee: total ? estime / total : 0, enveloppe: env, statut };
}

/**
 * Ce qui reste pour les activités une fois les postes estimés retirés de
 * l'enveloppe (hébergement et repas ; les trajets ne sont pas encore connus).
 * null : pas de plafond.
 */
export function activityAllowance(trip: Trip, s: BudgetSettings, ctx: EstimateContext): number | null {
  const env = envelope(s);
  if (env === null) return null;
  const empty = { ...trip, programme: trip.programme.map(() => []) };
  const fixe = estimateTrip(empty, s, ctx).total;
  return Math.max(0, env - fixe);
}

/** Remet d'aplomb les réglages de budget lus depuis le navigateur. */
export function sanitizeBudget(raw: unknown): BudgetSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const int = (v: unknown, min: number, max: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
  };
  return {
    montant: r.montant === null || r.montant === undefined || r.montant === "" ? null : int(r.montant, 0, MONTANT_MAX, 0),
    portee: r.portee === "personne" ? "personne" : "sejour",
    voyageurs: int(r.voyageurs, 1, 20, 1),
    accompagnants: int(r.accompagnants, 0, 20, 1),
    chequesVacances: r.chequesVacances === true,
  };
}
