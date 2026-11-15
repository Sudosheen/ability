/**
 * Profil de besoins : des besoins fonctionnels, jamais un diagnostic.
 * Il reste dans le navigateur de la personne (voir lib/storage.ts).
 */

export type NeedsProfile = {
  version: 1;
  /** Nom d'affichage, par exemple « Fauteuil électrique ». */
  nom: string;
  fauteuil: "manuel" | "electrique";
  /** Largeur hors tout du fauteuil, en centimètres. */
  largeurFauteuil: number;
  /** Peut-on franchir une marche à l'entrée ? */
  marche: "aucune" | "une_avec_aide";
  /** Passage du fauteuil au lit, aux toilettes ou à la douche. */
  transfert: "autonome" | "aide" | "leve_personne";
  /** Si le transfert se fait au lève-personne : on apporte le sien, ou il en faut un sur place. */
  levePersonne: "apporte" | "sur_place";
  douchePlainPied: boolean;
  wcTransfert: boolean;
  stationnement: boolean;
};

export type PresetId = "manuel" | "electrique" | "leve-personne";

export const PRESETS: Record<PresetId, NeedsProfile> = {
  manuel: {
    version: 1,
    nom: "Fauteuil manuel",
    fauteuil: "manuel",
    largeurFauteuil: 65,
    marche: "une_avec_aide",
    transfert: "autonome",
    levePersonne: "apporte",
    douchePlainPied: true,
    wcTransfert: true,
    stationnement: false,
  },
  electrique: {
    version: 1,
    nom: "Fauteuil électrique",
    fauteuil: "electrique",
    largeurFauteuil: 68,
    marche: "aucune",
    transfert: "aide",
    levePersonne: "apporte",
    douchePlainPied: true,
    wcTransfert: true,
    stationnement: true,
  },
  "leve-personne": {
    version: 1,
    nom: "Fauteuil et lève-personne",
    fauteuil: "electrique",
    largeurFauteuil: 68,
    marche: "aucune",
    transfert: "leve_personne",
    levePersonne: "apporte",
    douchePlainPied: true,
    wcTransfert: true,
    stationnement: true,
  },
};

export const LARGEUR_MIN = 50;
export const LARGEUR_MAX = 90;

/** Marge de passage ajoutée à la largeur du fauteuil pour franchir une porte, en centimètres. */
export const MARGE_PORTE_CM = 7;

export function isPresetId(value: string | null): value is PresetId {
  return value !== null && value in PRESETS;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Remet d'aplomb un profil lu depuis le navigateur. Rend null s'il est inutilisable. */
export function sanitizeProfile(raw: unknown): NeedsProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  const base = PRESETS.electrique;
  const largeur = Number(r.largeurFauteuil);
  return {
    version: 1,
    nom: typeof r.nom === "string" && r.nom.trim() ? r.nom.trim().slice(0, 60) : "Mon profil",
    fauteuil: oneOf(r.fauteuil, ["manuel", "electrique"] as const, base.fauteuil),
    largeurFauteuil: Number.isFinite(largeur)
      ? Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, Math.round(largeur)))
      : base.largeurFauteuil,
    marche: oneOf(r.marche, ["aucune", "une_avec_aide"] as const, base.marche),
    transfert: oneOf(r.transfert, ["autonome", "aide", "leve_personne"] as const, base.transfert),
    levePersonne: oneOf(r.levePersonne, ["apporte", "sur_place"] as const, base.levePersonne),
    douchePlainPied: r.douchePlainPied !== false,
    wcTransfert: r.wcTransfert !== false,
    stationnement: r.stationnement === true,
  };
}

/** Résumé en une ligne, pour les en-têtes et le dossier. */
export function describeProfile(p: NeedsProfile): string {
  const parts = [
    `fauteuil ${p.fauteuil === "manuel" ? "manuel" : "électrique"} de ${p.largeurFauteuil} cm`,
    p.transfert === "leve_personne"
      ? `transferts au lève-personne (${p.levePersonne === "apporte" ? "apporté" : "à trouver sur place"})`
      : p.transfert === "aide"
        ? "transferts avec aide"
        : "transferts autonomes",
    p.marche === "aucune" ? "aucune marche" : "une marche possible avec aide",
  ];
  return parts.join(", ");
}
