# Licence des données Ability

## La base de données fusionnée : ODbL 1.0

La base de données d'Ability (les lieux de l'Hérault et leurs critères d'accessibilité, fusionnés à partir de plusieurs sources) est mise à disposition sous la licence **Open Database License (ODbL) 1.0**.

Texte complet : [`data/ODBL-1.0.txt`](data/ODBL-1.0.txt), et en ligne sur <https://opendatacommons.org/licenses/odbl/1-0/>.

Elle comprend :

- les fichiers publiés sur le site, dans `public/data/` (produits par `pnpm etl`) ;
- le rapport qualité et les files de revue, dans `data/report/` et `data/review/` ;
- les lieux fictifs de démonstration, dans `data/demo/`.

Vous pouvez copier, diffuser, adapter et réutiliser cette base, y compris à des fins commerciales, à trois conditions :

1. **Citer les sources** (voir ci-dessous).
2. **Partager à l'identique** : une base dérivée que vous diffusez doit l'être sous ODbL.
3. **Garder la base ouverte** : si vous la diffusez avec des mesures techniques qui en restreignent l'accès, une version sans restriction doit aussi être disponible.

## Mention à reprendre

> Données d'accessibilité : Ability, à partir d'Acceslibre (Licence Ouverte 2.0), de la liste des établissements labellisés Tourisme & Handicap (Licence Ouverte 2.0) et d'OpenStreetMap, © les contributeurs d'OpenStreetMap (ODbL 1.0).

## Les sources

| Source | Licence | Attribution |
|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright), données affichées par Wheelmap | ODbL 1.0 | © les contributeurs d'OpenStreetMap |
| [Acceslibre](https://acceslibre.beta.gouv.fr) | Licence Ouverte 2.0 (Etalab) | Acceslibre, ministère chargé des Transports, data.gouv.fr |
| [Liste des établissements labellisés Tourisme & Handicap](https://data.economie.gouv.fr/explore/dataset/liste-des-etablissements-labellises-tourisme-et-handicap) | Licence Ouverte 2.0 (Etalab) | Direction générale des Entreprises, data.economie.gouv.fr |

La base fusionnée contient des données OpenStreetMap : c'est pourquoi elle est diffusée sous ODbL. La Licence Ouverte des deux autres sources est compatible avec l'ODbL.

Les extraits bruts gardent la licence de leur source : `data/raw/osm/` sous ODbL, `data/raw/acceslibre/` et `data/raw/tourisme-handicap/` sous Licence Ouverte 2.0.

## Ce que cette licence ne couvre pas

- **Le code** de l'application (`app/`, `components/`, `lib/`, `scripts/`, `tests/`) : aucune licence n'a encore été choisie, il reste donc soumis au droit d'auteur.
- **Les fonds de carte** affichés sur le site : ils viennent d'OpenFreeMap et d'OpenMapTiles, avec leurs propres conditions, citées sur la carte.

## Avertissement

Ces données sont issues de sources ouvertes non vérifiées sur place. Les lieux marqués « lieu fictif » n'existent pas. Elles sont fournies sans garantie : vérifiez chaque information auprès des établissements avant de vous déplacer.
