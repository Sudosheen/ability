-- Étape 3 : rapprochement des fiches entre sources.
--
-- Produit match_candidates : une ligne par paire de fiches de sources
-- différentes qui pourraient désigner le même lieu, avec un score de 0 à 1.
-- Le regroupement final (une fiche par source au plus dans un lieu, décisions
-- manuelles de overrides.json) est fait par cluster.ts.
--
-- Même SIRET, confirmé par la distance (100 m) : fusion.
-- Sinon : fiches à moins de 75 m l'une de l'autre (250 m pour la liste
-- Tourisme & Handicap, géocodée à l'adresse, ou même code postal avec un nom
-- très proche), puis score = 0,60 nom + 0,15 catégorie + 0,15 adresse + 0,10 distance.

CREATE OR REPLACE MACRO haversine_m(lat1, lng1, lat2, lng2) AS
  2 * 6371000 * asin(sqrt(
    pow(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * pow(sin(radians(lng2 - lng1) / 2), 2)));

CREATE OR REPLACE MACRO jaccard_mots(a, b) AS
  CASE WHEN a = '' OR b = '' THEN 0.0
       ELSE len(list_intersect(string_split(a, ' '), string_split(b, ' ')))
            / len(list_distinct(list_concat(string_split(a, ' '), string_split(b, ' '))))::DOUBLE
  END;

-- Un nom est-il contenu dans l'autre ?
--   0,93 : le plus court est le début du plus long (« ibis budget » / « ibis budget montpellier sud ») ;
--   0,90 : il en couvre au moins 60 % des mots ;
--   0,75 : simple mot commun en fin de nom (« arceaux » / « pressing arceaux »), à vérifier.
CREATE OR REPLACE MACRO sim_inclusion(court, long) AS
  CASE
    WHEN length(court) < 4 OR NOT contains(' ' || long || ' ', ' ' || court || ' ') THEN 0.0
    WHEN starts_with(long || ' ', court || ' ') THEN 0.93
    WHEN len(string_split(court, ' ')) >= 0.6 * len(string_split(long, ' ')) THEN 0.90
    ELSE 0.75
  END;

-- Similarité de deux noms normalisés.
CREATE OR REPLACE MACRO sim_nom(a, b) AS
  CASE
    WHEN a = '' OR b = '' THEN 0.0
    WHEN a = b THEN 1.0
    ELSE greatest(
      -- quasi identiques (faute de frappe, accent)
      CASE WHEN jaro_winkler_similarity(a, b) >= 0.95 THEN jaro_winkler_similarity(a, b) ELSE 0.0 END,
      0.5 * jaro_winkler_similarity(a, b) + 0.5 * jaccard_mots(a, b),
      CASE WHEN length(a) <= length(b) THEN sim_inclusion(a, b) ELSE sim_inclusion(b, a) END)
  END;

CREATE OR REPLACE TABLE p AS
SELECT
  source || ':' || source_id AS cle,
  *,
  norm_txt(voie) AS voie_norm,
  CAST(floor(lat / 0.001) AS INTEGER) AS clat,
  CAST(floor(lng / 0.001) AS INTEGER) AS clng
FROM src_places;

CREATE OR REPLACE TABLE match_pairs AS
SELECT a, b, any_value(dist_m) AS dist_m, max(rayon) AS rayon
FROM (
  -- Acceslibre <-> OpenStreetMap : voisins à moins de 75 m (grille de 0,001°).
  SELECT a.cle AS a, b.cle AS b, haversine_m(a.lat, a.lng, b.lat, b.lng) AS dist_m, 75.0 AS rayon
  FROM p a
  JOIN p b
    ON a.source = 'acceslibre' AND b.source = 'osm'
   AND b.clat BETWEEN a.clat - 1 AND a.clat + 1
   AND b.clng BETWEEN a.clng - 1 AND a.clng + 1
  WHERE haversine_m(a.lat, a.lng, b.lat, b.lng) <= 75
  UNION ALL
  -- Tourisme & Handicap : 250 m, ou même code postal avec un nom très proche.
  SELECT a.cle, b.cle, haversine_m(a.lat, a.lng, b.lat, b.lng), 250.0
  FROM p a
  JOIN p b ON a.source IN ('acceslibre', 'osm') AND b.source = 'th'
  WHERE haversine_m(a.lat, a.lng, b.lat, b.lng) <= 250
     OR (a.code_postal = b.code_postal AND sim_nom(a.nom_norm, b.nom_norm) >= 0.85)
  UNION ALL
  -- Même SIRET, quelle que soit la distance.
  SELECT a.cle, b.cle, haversine_m(a.lat, a.lng, b.lat, b.lng), 250.0
  FROM p a
  JOIN p b ON a.siret = b.siret AND a.source < b.source
)
GROUP BY a, b;

CREATE OR REPLACE TABLE match_candidates AS
WITH scored AS (
  SELECT
    m.a, m.b, m.dist_m,
    a.siret IS NOT NULL AND a.siret = b.siret AS meme_siret,
    CASE
      -- Toilettes et places de stationnement : c'est l'emplacement qui fait l'identité.
      WHEN a.categorie = b.categorie AND a.categorie IN ('toilettes', 'stationnement')
        THEN CASE WHEN m.dist_m <= 30 THEN 1.0 ELSE 0.4 END
      ELSE sim_nom(a.nom_norm, b.nom_norm)
    END AS s_nom,
    CASE
      WHEN a.categorie = b.categorie THEN 1.0
      WHEN a.categorie IN ('autre', 'service') OR b.categorie IN ('autre', 'service') THEN 0.5
      ELSE 0.0
    END AS s_cat,
    CASE
      WHEN a.numero IS NULL OR b.numero IS NULL OR a.voie_norm = '' OR b.voie_norm = '' THEN 0.5
      WHEN a.numero = b.numero AND jaro_winkler_similarity(a.voie_norm, b.voie_norm) >= 0.85 THEN 1.0
      WHEN a.numero <> b.numero THEN 0.3
      ELSE 0.4
    END AS s_adr,
    CASE WHEN m.dist_m IS NULL THEN 0.5 ELSE greatest(0.0, 1 - m.dist_m / m.rayon) END AS s_dist,
    a.nom AS nom_a, b.nom AS nom_b,
    a.categorie AS cat_a, b.categorie AS cat_b,
    a.adresse AS adresse_a, b.adresse AS adresse_b,
    coalesce(a.commune, b.commune) AS commune
  FROM match_pairs m
  JOIN p a ON a.cle = m.a
  JOIN p b ON b.cle = m.b
)
SELECT
  a, b,
  -- Un SIRET commun ne suffit pas : une mairie partage le sien avec ses musées
  -- et ses plages, un office de tourisme avec ses antennes. Il vaut preuve s'il
  -- est confirmé par la distance (ou par le nom quand une fiche n'a pas de coordonnées).
  CASE
    WHEN meme_siret AND (dist_m <= 100 OR (dist_m IS NULL AND s_nom >= 0.75)) THEN 1.0
    WHEN meme_siret THEN greatest(0.70, round(base, 3))
    ELSE round(base, 3)
  END AS score,
  CASE
    WHEN meme_siret AND (dist_m <= 100 OR (dist_m IS NULL AND s_nom >= 0.75)) THEN 'siret'
    WHEN meme_siret THEN 'siret_seul'
    ELSE 'proximite'
  END AS methode,
  round(dist_m) AS dist_m,
  round(s_nom, 3) AS s_nom, s_cat, s_adr,
  nom_a, nom_b, cat_a, cat_b, adresse_a, adresse_b, commune
FROM (SELECT *, 0.60 * s_nom + 0.15 * s_cat + 0.15 * s_adr + 0.10 * s_dist AS base FROM scored)
WHERE meme_siret OR base >= 0.5
ORDER BY score DESC, a, b;
