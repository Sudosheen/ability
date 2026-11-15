"use client";

/**
 * Données de l'utilisateur enregistrées dans le navigateur (localStorage) :
 * profil de besoins, groupe, séjours. Rien n'est envoyé à un serveur : la
 * maquette n'en a pas.
 */
import { useSyncExternalStore } from "react";
import { sanitizeGroup, type Group } from "./group";
import { sanitizeProfile, type NeedsProfile } from "./profile";
import { sanitizeTrip, type Trip } from "./trip";

const EVENT = "ability:stockage";

type Store<T> = {
  read(): T | null;
  save(value: T): boolean;
  clear(): void;
  use(): T | null;
};

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function createStore<T>(key: string, sanitize: (raw: unknown) => T | null): Store<T> {
  let cachedRaw: string | null | undefined;
  let cachedValue: T | null = null;

  // Le résultat est mis en cache pour rester stable d'un rendu à l'autre.
  const read = (): T | null => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== cachedRaw) {
        cachedRaw = raw;
        cachedValue = raw ? sanitize(JSON.parse(raw)) : null;
      }
      return cachedValue;
    } catch {
      // Navigation privée, stockage bloqué ou contenu illisible : on fait sans.
      return null;
    }
  };

  return {
    read,
    save(value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event(EVENT));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // rien à effacer
      }
      window.dispatchEvent(new Event(EVENT));
    },
    use: () => useSyncExternalStore(subscribe, read, () => null),
  };
}

export const profileStore = createStore<NeedsProfile>("ability:profil", sanitizeProfile);
export const groupStore = createStore<Group>("ability:groupe", sanitizeGroup);
export const tripStore = createStore<Trip>("ability:sejour", sanitizeTrip);
export const groupTripStore = createStore<Trip>("ability:sejour-groupe", sanitizeTrip);

export const readProfile = profileStore.read;
export const saveProfile = profileStore.save;
export const clearProfile = profileStore.clear;

/** Profil courant, tenu à jour entre les onglets. null tant qu'aucun profil n'est enregistré. */
export function useProfile(): NeedsProfile | null {
  return profileStore.use();
}

export function useGroup(): Group | null {
  return groupStore.use();
}

export function useTrip(): Trip | null {
  return tripStore.use();
}

export function useGroupTrip(): Trip | null {
  return groupTripStore.use();
}
