-- Étape 4 : fusion. Une ligne par lieu, et toutes les valeurs sourcées de
-- chaque critère (concaténation). Le choix de la valeur affichée et la
-- détection des divergences sont faits par lib/merge.ts, testé avec Vitest.
--
-- Entrée : clusters(cle, cluster_id), produite par cluster.ts.

CREATE OR REPLACE TABLE place_members AS
SELECT
  c.cluster_id,
  p.*,
  -- Nom, adresse, catégorie : Acceslibre, puis Tourisme & Handicap, puis OpenStreetMap.
  CASE p.source WHEN 'acceslibre' THEN 1 WHEN 'th' THEN 2 ELSE 3 END AS prio_nom,
  -- Coordonnées : OpenStreetMap (relevé sur place), puis Acceslibre, puis T&H (géocodage).
  CASE p.source WHEN 'osm' THEN 1 WHEN 'acceslibre' THEN 2 ELSE 3 END
    + CASE WHEN p.coord_approx THEN 10 ELSE 0 END AS prio_geo
FROM clusters c
JOIN p ON p.cle = c.cle;

CREATE OR REPLACE TABLE places AS
SELECT
  cluster_id,
  arg_min(nom, prio_nom) FILTER (WHERE nom IS NOT NULL) AS nom,
  coalesce(
    arg_min(categorie, prio_nom) FILTER (WHERE categorie NOT IN ('autre', 'service')),
    arg_min(categorie, prio_nom)) AS categorie,
  arg_min(activite, prio_nom) FILTER (WHERE activite IS NOT NULL) AS activite,
  arg_min(adresse, prio_nom) FILTER (WHERE adresse IS NOT NULL) AS adresse,
  arg_min(code_postal, prio_nom) FILTER (WHERE code_postal IS NOT NULL) AS code_postal,
  arg_min(commune, prio_nom) FILTER (WHERE commune IS NOT NULL) AS commune,
  arg_min(lat, prio_geo) FILTER (WHERE lat IS NOT NULL) AS lat,
  arg_min(lng, prio_geo) FILTER (WHERE lat IS NOT NULL) AS lng,
  arg_min(site_web, prio_nom) FILTER (WHERE site_web IS NOT NULL) AS site_web,
  arg_min(note, prio_nom) FILTER (WHERE note IS NOT NULL) AS note,
  count(*) AS nb_sources
FROM place_members
GROUP BY cluster_id;

CREATE OR REPLACE TABLE place_sources AS
SELECT cluster_id, source, source_id, url
FROM place_members
ORDER BY cluster_id, prio_nom;

CREATE OR REPLACE TABLE place_values AS
SELECT c.cluster_id, s.critere, s.source, s.valeur, s.date, s.date_type, s.derive
FROM clusters c
JOIN src_criteria s ON c.cle = s.source || ':' || s.source_id
ORDER BY c.cluster_id, s.critere, s.source;
