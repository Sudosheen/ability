# Ability

Maquette fonctionnelle (preuve de concept) pour préparer des séjours accessibles dans l'Hérault, pensée pour les personnes en fauteuil roulant, y compris celles qui sont transférées au lève-personne.

Ce n'est pas un service en production : la maquette sert à recueillir des retours en entretien. Elle ne coûte rien à faire tourner : site statique, données ouvertes, aucun serveur.

## L'idée

- **Trois sources croisées** : Acceslibre, OpenStreetMap (les données qu'affiche Wheelmap) et le label Tourisme & Handicap sont rapprochées et fusionnées en une fiche par lieu.
- **Un niveau de preuve par critère** : chaque information affiche sa source et sa date. Quand les sources se contredisent, la fiche le dit.
- **Une information inconnue n'est jamais « compatible »** : elle devient une question à poser à l'établissement.

## Parcours

| Page | Pour quoi |
|---|---|
| `/` | Accueil et barre de recherche |
| `/profil` | Profil de besoins (fauteuil, transferts, salle de bain), gardé dans le navigateur |
| `/recherche` | Hébergements classés selon le profil : compatible, à confirmer, incompatible |
| `/carte` | Exploration libre de tous les lieux et équipements |
| `/lieu/?id=…` | Fiche d'un lieu, avec sources, niveaux de preuve et questions à poser |
| `/sejour` | Séjour d'un particulier : destination, hébergement, programme jour par jour |
| `/pro` | Séjour de groupe pour les structures, en cinq étapes |
| `/communaute` | Retours des voyageurs sur l'itinéraire et confirmation, bloc par bloc, de l'accessibilité des lieux (retours de démonstration sur les lieux fictifs) |
| `/dossier` | Dossier de séjour à imprimer ou enregistrer en PDF (`?groupe=1` pour le groupe) |
| `/demo` | Pour l'enquêteur : personas, remise à zéro, signaux notés pendant l'entretien |
| `/tarifs` | Offres et prix à tester (rien n'est en vente) |
| `/pro/tableau-de-bord` | Écran de démonstration, données inventées |

Les itinéraires sont proposés par des règles simples (`lib/itinerary`), avec un budget sur le séjour entier et un filtre Chèques-Vacances (`lib/budget.ts`, prix et acceptation **simulés**) et les trajets sont **estimés** à vol d'oiseau (`lib/routing.ts`) : il n'y a pas encore de calcul d'itinéraire réel.

Préparer les entretiens : [`docs/guide-entretien.md`](docs/guide-entretien.md). Présentation : [`docs/presentation-enseignants.md`](docs/presentation-enseignants.md).

### Formulaire de retours

Le bouton « Donner mon avis » apparaît sur chaque écran quand l'adresse d'un formulaire [Tally](https://tally.so) est fournie au build :

```bash
NEXT_PUBLIC_TALLY_URL=https://tally.so/r/xxxxxx pnpm build
```

Sous PowerShell (Windows), la variable se pose avant la commande :

```powershell
$env:NEXT_PUBLIC_TALLY_URL = "https://tally.so/r/xxxxxx"; pnpm build
```

Ajoutez au formulaire un champ caché nommé `ecran` : il reçoit l'adresse de la page d'où vient le retour. Sur GitHub Pages, renseignez la variable `NEXT_PUBLIC_TALLY_URL` dans les variables du dépôt.

## Démarrer

Il faut Node 24 et pnpm.

```bash
pnpm install
```

```bash
pnpm etl
```

```bash
pnpm dev
```

`pnpm etl` fabrique `public/data/` à partir des données brutes versionnées dans `data/raw/`. Il ne touche pas au réseau et prend quelques secondes. Il faut le relancer après un `git clone` : `public/data/` n'est pas versionné.

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm dev` | Site en local sur http://localhost:3000 |
| `pnpm build` | Export statique dans `out/` |
| `pnpm etl` | Normalise, rapproche, fusionne et exporte les données (hors ligne) |
| `pnpm etl:fetch` | Retélécharge les sources (réseau) : `pnpm etl:fetch osm`, `acceslibre` ou `th` pour une seule |
| `pnpm test` | Tests Vitest (fusion, regroupement, compatibilité, itinéraires, séjours) |
| `pnpm lint`, `pnpm typecheck` | Contrôles de code |

## Les données

| Source | Contenu | Licence |
|---|---|---|
| [Acceslibre](https://acceslibre.beta.gouv.fr) | Critères détaillés déclarés (entrée, largeur de porte, sanitaires, chambres) | Licence Ouverte 2.0 |
| [OpenStreetMap](https://www.openstreetmap.org) via Overpass | Avis global fauteuil (oui, partiel, non), toilettes, stationnement adapté | ODbL 1.0 |
| [Tourisme & Handicap](https://data.economie.gouv.fr/explore/dataset/liste-des-etablissements-labellises-tourisme-et-handicap) | Établissements labellisés (liste figée fin 2020) | Licence Ouverte 2.0 |

La base fusionnée contient des données OpenStreetMap : elle est mise à disposition sous licence **ODbL 1.0**, avec la mention « © les contributeurs d'OpenStreetMap ». Détail, mention à reprendre et périmètre : [`LICENCE-DONNEES.md`](LICENCE-DONNEES.md). L'ETL joint la licence aux données publiées (`public/data/LICENCE.txt`). Le code n'a pas encore de licence.

### La chaîne de traitement (`scripts/etl/`)

1. `01_fetch.ts` télécharge les sources dans `data/raw/` (un dossier par source) et tient `manifest.json`.
2. `02_normalize.sql` ramène les trois sources à un schéma commun (DuckDB).
3. `03_match.sql` note les paires de fiches qui pourraient désigner le même lieu : distance, nom, catégorie, adresse, SIRET.
4. `lib/cluster.ts` regroupe les fiches : fusion automatique au-dessus de 0,82, revue manuelle entre 0,65 et 0,82, jamais deux fiches d'une même source dans un lieu.
5. `04_merge.sql` puis `lib/merge.ts` gardent toutes les valeurs de chaque critère, choisissent la valeur affichée et signalent les divergences.
6. `run.ts` exporte les couches de la carte, les fiches détaillées et le rapport qualité.

À lire après chaque `pnpm etl` :

- `data/report/qualite.md` : volumes, taux de rapprochement, divergences, critères manquants.
- `data/review/a_verifier.csv` : paires à valider à la main.
- `data/review/echantillon_fusions.csv` : 50 fusions automatiques à contrôler.

Les décisions manuelles vont dans `scripts/etl/overrides.json` (`fusionner` ou `separer`, avec une note). Elles sont réappliquées à chaque exécution.

## Organisation du code

```
app/                    pages : accueil, /carte, /dev/design
components/ability/     barre de recherche, badges de preuve, cartes de résultat, fiche
components/map/         carte MapLibre, style du fond, marqueurs
components/ui/          composants shadcn adaptés aux tokens Ability
lib/                    types, catalogue des critères, fusion, accès aux données
scripts/etl/            récupération et fusion des données
tests/                  tests Vitest
data/raw/               sources brutes (versionnées)
data/report, data/review  rapport qualité et files de revue (générés)
```

Tout l'accès aux données passe par `lib/data.ts` : c'est le seul endroit à changer pour brancher une base plus tard.

## Accessibilité

Le site vise le niveau AA des WCAG 2.2 : police Atkinson Hyperlegible Next, texte à 18 px, cibles de 44 px, focus toujours visible, aucun statut porté par la couleur seule, et une liste synchronisée qui donne les mêmes lieux que la carte. Le système de design est visible sur `/dev/design`.

## Déploiement

Le workflow `.github/workflows/deploy.yml` vérifie chaque pull request vers `main` (`pnpm etl`, lint, types, tests, build), sans rien publier. À chaque push sur `main`, il refait la même vérification puis publie le site sur GitHub Pages, avec `NEXT_PUBLIC_BASE_PATH=/<nom-du-dépôt>`. Dans les réglages du dépôt, choisir « GitHub Actions » comme source de Pages.
