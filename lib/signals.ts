"use client";

/**
 * Signaux d'intérêt notés pendant un entretien : clics sur une offre de la
 * page tarifs, sur une fonction pas encore construite… Ils restent dans le
 * navigateur de démonstration, s'affichent sur /demo et s'effacent avec la
 * réinitialisation. Aucune mesure d'audience, rien n'est envoyé.
 */

const KEY = "ability:signaux";
const MAX = 200;

export type Signal = { type: string; detail: string; page: string; at: string };

export function readSignals(): Signal[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as Signal[]).filter((s) => s && typeof s.type === "string") : [];
  } catch {
    return [];
  }
}

export function logSignal(type: string, detail: string) {
  try {
    const list = [...readSignals(), { type, detail, page: window.location.pathname, at: new Date().toISOString() }];
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    // stockage indisponible : le signal est perdu, la démonstration continue
  }
}

/** Efface toutes les données Ability de ce navigateur (profil, groupe, séjours, signaux). */
export function resetAll() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("ability:")) window.localStorage.removeItem(key);
    }
  } catch {
    // rien à effacer
  }
  window.dispatchEvent(new Event("ability:stockage"));
}
