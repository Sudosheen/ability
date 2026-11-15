# Rapport qualité des données Ability

Généré le 2026-11-15 par `pnpm etl`. Territoire : Hérault (34).

## Sources

| Source | Récupérée le | Fiches brutes | Fiches gardées | Remarque |
|---|---|---|---|---|
| Acceslibre : accessibilité des établissements recevant du public | 2026-11-14 | 10925 | 10925 | L'export ne fournit pas de date de mise à jour par établissement. |
| OpenStreetMap (données affichées par Wheelmap), via Overpass | 2026-11-14 | 20358 | 15059 | Base OSM du 2026-11-14T18:33:59Z |
| Liste des établissements labellisés Tourisme & Handicap | 2026-11-14 | 83 | 82 | Jeu de données figé depuis le 2020-12-15 : les labels (valables 5 ans) sont à reconfirmer. |

Les fiches écartées sont hors de l'Hérault, ou sont des objets OpenStreetMap qui ne sont pas des lieux (passages piétons, arrêts, panneaux).

## Lieux après fusion

- **25070** lieux : 4030 pour préparer un séjour (hébergements, restauration, activités, plages, offices de tourisme), 12033 commerces, services et lieux de santé, 9007 équipements (toilettes, stationnement adapté).
- 4 fiche(s) sans coordonnées, absentes de la carte.
- 8 hébergements **fictifs** « vérifiés sur place » (`data/demo/lieux-fictifs.json`) sont comptés dans ces totaux. Leur nom porte la mention « lieu fictif ».

| Catégorie | Lieux |
|---|---|
| stationnement | 8168 |
| commerce | 5226 |
| service | 4982 |
| restauration | 1894 |
| sante | 1523 |
| hebergement | 1293 |
| toilettes | 839 |
| activite | 576 |
| autre | 302 |
| info | 144 |
| plage | 123 |

| Sources réunies | Lieux |
|---|---|
| osm | 14088 |
| acceslibre | 9952 |
| acceslibre + osm | 944 |
| th | 41 |
| acceslibre + osm + th | 19 |
| acceslibre + th | 10 |
| demo | 8 |
| osm + th | 8 |

## Rapprochement

- 1894 paires candidates (score d'au moins 0,5).
- **993** fusions automatiques (score d'au moins 0.82), 7 forcée(s) par `overrides.json`.
- **353** paires à vérifier à la main : `data/review/a_verifier.csv`.
- Contrôle : `data/review/echantillon_fusions.csv` contient 50 fusions automatiques à relire.

| Source | Fiches | Rapprochées d'une autre source | Taux |
|---|---|---|---|
| acceslibre | 10925 | 973 | 8.9 % |
| osm | 15059 | 971 | 6.4 % |
| th | 78 | 37 | 47.4 % |

## Accessibilité en fauteuil (hors équipements)

| Statut | Lieux |
|---|---|
| oui | 11086 |
| inconnu | 2632 |
| non | 1690 |
| partiel | 553 |
| divergent | 102 |

Hébergements seuls :

| Statut | Hébergements |
|---|---|
| inconnu | 735 |
| oui | 434 |
| non | 98 |
| partiel | 24 |
| divergent | 2 |

8346 lieux ont une information d'accès datée de plus de 24 mois (« à reconfirmer »).

## Divergences entre sources

| Critère | Lieux où les sources se contredisent |
|---|---|
| acces_fauteuil | 103 |
| label_th_moteur | 1 |
| wc_adaptes | 1 |

## Critères bloquants renseignés pour les 1293 hébergements

| Critère | Renseigné | Part |
|---|---|---|
| Accès en fauteuil roulant | 558 | 43.2 % |
| Entrée de plain-pied | 432 | 33.4 % |
| Largeur de la porte d'entrée | 283 | 21.9 % |
| Circulation intérieure de plain-pied | 135 | 10.4 % |
| Toilettes adaptées | 248 | 19.2 % |
| Nombre de chambres accessibles | 393 | 30.4 % |
| Largeur de la porte de la chambre | 8 | 0.6 % |
| Hauteur du lit | 8 | 0.6 % |
| Espace libre sous le lit pour un lève-personne | 8 | 0.6 % |
| Aire de rotation de 150 cm dans la chambre | 8 | 0.6 % |
| Douche de plain-pied | 199 | 15.4 % |
| Espace de transfert aux toilettes de la chambre | 44 | 3.4 % |

Les critères à 0 % n'existent dans aucune source ouverte : ce sont ceux qu'Ability devra collecter (visites, questions aux établissements).

## Poids des fichiers

- `places.geojson` : 0.92 Mo
- `services.geojson` : 2.80 Mo
- `equipements.geojson` : 2.05 Mo
- 256 paquets de fiches détaillées
