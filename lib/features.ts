/**
 * Fonctions de la maquette que l'on peut masquer sans supprimer leur code.
 *
 * - `budget` : budget de l'itinéraire entier (lib/budget.ts, components/trip/budget-panel.tsx).
 *   Masqué : ce n'est pas la proposition de valeur principale, et c'est trop complexe
 *   pour la maquette. Le filtre Chèques-Vacances ANCV reste affiché.
 *   Remettre à `true` pour le réafficher.
 */
export const FEATURES = {
  budget: false,
} as const;
