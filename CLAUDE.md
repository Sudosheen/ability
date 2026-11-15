# Ability : consignes pour Claude

Maquette fonctionnelle (preuve de concept) pour préparer des séjours accessibles en fauteuil dans l'Hérault. Elle sert aux entretiens utilisateurs et à une présentation aux enseignants : ce n'est pas un produit en production. Présentation complète dans le [README](README.md). Échanger en français.

Lire aussi [AGENTS.md](AGENTS.md) : la version de Next.js utilisée diffère de ce que tu connais, sa documentation est dans `node_modules/next/dist/docs/`.

## Règles de développement (strictes)

- **Fonctionnel avant l'optimisation.** Du code clair, lisible, qui marche du premier coup. Pas d'optimisation prématurée ni d'algorithme complexe pendant la phase de maquette.
- **Indépendance des composants.** La logique d'état reste séparée de l'interface, pour passer plus tard à de vraies données sans toucher aux écrans :
  - état et règles métier dans `lib/` (`storage.ts`, `trip.ts`, `group.ts`, `matching/`, `itinerary/`…), en fonctions pures testées dans `tests/` dès que possible ;
  - écrans dans `components/` et `app/`, qui appellent `lib/` sans réécrire ses règles ;
  - tout accès aux données passe par `lib/data.ts`.

## Workflow git

- Ne jamais proposer de commande pour commit ou push sur la branche `main`.
- Travailler toujours sur une branche `feature/nom-du-composant`. La fusion dans `main` est faite par l'utilisateur ; elle republie le site sur GitHub Pages.
- Rester concentré sur la tâche demandée, étape par étape.
- Si une erreur survient, en analyser la cause d'abord, au lieu de proposer un correctif à l'aveugle.

## Contraintes du projet

- **Coût nul** : site statique (`output: "export"`), aucun serveur, services gratuits et sans clé.
- **Aucune donnée personnelle réelle** : besoins fonctionnels uniquement, jamais de diagnostic ; données utilisateur dans le navigateur (localStorage) seulement.
- **Honnêteté de la maquette** : les données simulées restent marquées (« lieu fictif », « simulé », bandeau « Maquette »).
- **Une information inconnue n'est jamais « compatible »** : elle donne « À confirmer ».
- **Accessibilité** : viser WCAG 2.2 AA (contrastes, cibles de 44 px, focus visible, aucune information portée par la couleur seule).

## Commandes

- `pnpm dev` : site en local.
- `pnpm etl` : régénère `public/data/` à partir de `data/raw/`, hors ligne. À lancer après un clone ou un changement de l'ETL.
- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` : à faire passer avant de proposer un commit.
