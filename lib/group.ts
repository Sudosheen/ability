/**
 * Groupe accompagné (structures médico-sociales) : des résidents désignés par
 * un code, jamais par leur nom, chacun avec ses besoins fonctionnels.
 */
import { PRESETS, sanitizeProfile, type NeedsProfile } from "./profile.ts";

export type Resident = { code: string; profil: NeedsProfile };

export type Group = {
  version: 1;
  nom: string;
  residents: Resident[];
  accompagnants: number;
};

export const RESIDENTS_MAX = 15;

export function emptyGroup(): Group {
  return {
    version: 1,
    nom: "Mon groupe",
    residents: [
      { code: "R1", profil: PRESETS.electrique },
      { code: "R2", profil: PRESETS.manuel },
    ],
    accompagnants: 2,
  };
}

/** Besoins du groupe : pour chaque critère, l'exigence la plus stricte parmi les résidents. */
export function aggregateProfile(group: Group): NeedsProfile {
  const profils = group.residents.map((r) => r.profil);
  if (profils.length === 0) return PRESETS.electrique;
  const any = (test: (p: NeedsProfile) => boolean) => profils.some(test);
  return {
    version: 1,
    nom: group.nom,
    fauteuil: any((p) => p.fauteuil === "electrique") ? "electrique" : "manuel",
    largeurFauteuil: Math.max(...profils.map((p) => p.largeurFauteuil)),
    marche: any((p) => p.marche === "aucune") ? "aucune" : "une_avec_aide",
    transfert: any((p) => p.transfert === "leve_personne")
      ? "leve_personne"
      : any((p) => p.transfert === "aide")
        ? "aide"
        : "autonome",
    levePersonne: any((p) => p.transfert === "leve_personne" && p.levePersonne === "sur_place") ? "sur_place" : "apporte",
    douchePlainPied: any((p) => p.douchePlainPied),
    wcTransfert: any((p) => p.wcTransfert),
    stationnement: any((p) => p.stationnement),
  };
}

/** Une chambre accessible par résident en fauteuil. */
export function roomsNeeded(group: Group): number {
  return Math.max(1, group.residents.length);
}

export function sanitizeGroup(raw: unknown): Group | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1 || !Array.isArray(r.residents)) return null;
  const residents = r.residents
    .slice(0, RESIDENTS_MAX)
    .map((x, i): Resident | null => {
      if (!x || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const profil = sanitizeProfile(o.profil);
      if (!profil) return null;
      const code = typeof o.code === "string" && o.code.trim() ? o.code.trim().slice(0, 12) : `R${i + 1}`;
      return { code, profil };
    })
    .filter((x): x is Resident => x !== null);
  const accompagnants = Number(r.accompagnants);
  return {
    version: 1,
    nom: typeof r.nom === "string" && r.nom.trim() ? r.nom.trim().slice(0, 60) : "Mon groupe",
    residents,
    accompagnants: Number.isFinite(accompagnants) ? Math.min(20, Math.max(0, Math.round(accompagnants))) : 2,
  };
}
