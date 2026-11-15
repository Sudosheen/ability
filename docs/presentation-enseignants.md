# Ability : plan de présentation aux enseignants

Environ 12 diapositives, 15 minutes, démonstration comprise. Les chiffres viennent de `data/report/qualite.md` (à relancer avec `pnpm etl` avant la présentation pour qu'ils soient à jour).

1. **Le problème.** Préparer un séjour en fauteuil, c'est des heures de recherche et un risque à l'arrivée : une marche, une porte trop étroite, pas de place sous le lit pour le lève-personne.
2. **Pour qui.** Les particuliers (la personne et ses proches) et les structures médico-sociales qui organisent des séjours de groupe de 3 à 7 jours. Territoire de départ : l'Hérault.
3. **Ce qui existe.** Acceslibre, Wheelmap / OpenStreetMap, le label Tourisme & Handicap : utiles, mais séparés, déclaratifs, parfois contradictoires.
4. **Notre idée.** Croiser les trois sources en une fiche par lieu, et afficher pour chaque critère sa source, son niveau de preuve et sa date. Une information inconnue n'est jamais « compatible ».
5. **Les données en chiffres.** Environ 25 000 lieux fusionnés, un millier de lieux réunissant plusieurs sources, une centaine de cas où les sources se contredisent. Plus de la moitié des hébergements n'ont aucune information d'accès fiable, et aucune source ne décrit le lit ou la chambre.
6. **Comment on fusionne.** Rapprochement par SIRET confirmé par la distance, sinon par la proximité, le nom, la catégorie et l'adresse ; fusion automatique au-dessus d'un seuil, revue manuelle en dessous ; jamais deux fiches d'une même source dans un lieu. Schéma de la chaîne `scripts/etl/`.
7. **Démonstration particulier** (3 min). Persona Samia : profil, recherche à Sète, fiche avec niveaux de preuve et sources divergentes, programme proposé, dossier.
8. **Démonstration structure** (2 min). FAM Les Oliviers : cinq résidents codés, besoins agrégés, une chambre accessible par résident, itinéraire, dossier de groupe.
9. **Accessibilité du produit.** Police pour la basse vision, contrastes AA mesurés, cibles de 44 px, aucune information par la couleur seule, liste synchronisée avec la carte, contrôles axe sans violation.
10. **Choix techniques.** Site statique gratuit (Next.js, MapLibre, OpenFreeMap), données préparées hors ligne avec DuckDB, données utilisateur dans le navigateur uniquement, 68 tests automatisés.
11. **Limites assumées.** Trajets estimés à vol d'oiseau, lieux « vérifiés sur place » fictifs, label Tourisme & Handicap figé depuis 2020, pas de comptes ni de vraie vérification communautaire.
12. **Suite.** Résultats des entretiens (temps, confiance, intention de payer), vrai calcul d'itinéraire en fauteuil, visites terrain des hébergements phares, extension au littoral occitan.

Prévoir la démonstration hors ligne en secours : captures d'écran des étapes clés, au cas où le réseau manquerait (les fonds de carte viennent d'internet).
