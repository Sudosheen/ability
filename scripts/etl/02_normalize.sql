-- Étape 2 : normalisation des trois sources vers un schéma commun.
--
--   src_places   : une ligne par fiche source (nom, catégorie, adresse, coordonnées)
--   src_criteria : une ligne par critère renseigné (valeur, date, nature de la date)
--
-- Variables attendues (posées par run.ts à partir de data/raw/manifest.json) :
--   th_date : date de publication de la liste Tourisme & Handicap

-- ---------------------------------------------------------------------------
-- Macros
-- ---------------------------------------------------------------------------
CREATE OR REPLACE MACRO norm_txt(s) AS
  trim(regexp_replace(lower(strip_accents(coalesce(s, ''))), '[^a-z0-9]+', ' ', 'g'));

-- Mots génériques retirés avant de comparer deux noms.
CREATE OR REPLACE MACRO strip_generic(s) AS
  trim(regexp_replace(
    regexp_replace(s,
      '\b(hotel|restaurant|camping|cafe|bar|brasserie|pizzeria|snack|boulangerie|patisserie|pharmacie|residence|le|la|les|l|de|du|des|d|et|au|aux|a|en|chez|sarl|sas|eurl|sa)\b',
      ' ', 'g'),
    '\s+', ' ', 'g'));

CREATE OR REPLACE MACRO norm_nom(s) AS
  CASE WHEN strip_generic(norm_txt(s)) = '' THEN norm_txt(s) ELSE strip_generic(norm_txt(s)) END;

CREATE OR REPLACE MACRO norm_siret(s) AS
  CASE WHEN length(regexp_replace(regexp_replace(coalesce(s, ''), '\.0$', ''), '[^0-9]', '', 'g')) = 14
       THEN regexp_replace(regexp_replace(s, '\.0$', ''), '[^0-9]', '', 'g') END;

CREATE OR REPLACE MACRO bool_txt(s) AS
  CASE s WHEN 'True' THEN 'true' WHEN 'False' THEN 'false' END;

CREATE OR REPLACE MACRO int_txt(s) AS
  CAST(CAST(round(TRY_CAST(s AS DOUBLE)) AS INTEGER) AS VARCHAR);

-- Emprise de l'Hérault : écarte les fiches mal géocodées ou hors département.
CREATE OR REPLACE MACRO dans_herault(lat, lng) AS
  lat BETWEEN 43.15 AND 44.05 AND lng BETWEEN 2.45 AND 4.25;

-- ---------------------------------------------------------------------------
-- Acceslibre
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE acceslibre_raw AS
SELECT *
FROM read_csv('data/raw/acceslibre/acceslibre_34.csv', header = true, all_varchar = true)
WHERE postal_code LIKE '34___'
  AND dans_herault(TRY_CAST(latitude AS DOUBLE), TRY_CAST(longitude AS DOUBLE));

CREATE OR REPLACE MACRO categorie_acceslibre(a) AS
  CASE
    WHEN a IS NULL THEN 'autre'
    WHEN regexp_matches(a, 'toilettes publiques') THEN 'toilettes'
    WHEN regexp_matches(a, '^plage') THEN 'plage'
    WHEN regexp_matches(a, 'office de tourisme|information touristique') THEN 'info'
    WHEN regexp_matches(a, '^hotel|chambre d hotes|^camping|location saisonniere|residence de tourisme|village de vacances|hebergement insolite|auberge de jeunesse') THEN 'hebergement'
    WHEN regexp_matches(a, '^restaurant|restauration rapide|^cafe bar|^glacier|salon de the|^bar tabac') THEN 'restauration'
    WHEN regexp_matches(a, 'pharmacie|dentiste|laboratoire d analyse|infirmier|medecin|kinesitherapeute|^hopital|osteopathie|orthophonie|sage femme|centre medical|materiel medical|appareils auditifs|etablissement de sante|maison de sante|pedicure|vaccination|orthoptie|^clinique|pediatrie|orthopedie|ergotherapeute|cardiologie|dermatologie|pneumologie|hematologie|chirurgie|rhumatologie|gastro|neurologie|nephrologue|endocrinologue|gynecologie|psychologie') THEN 'sante'
    WHEN regexp_matches(a, '^musee|^theatre|^cinema|oenotourisme|centre d art|centre culturel|salle de spectacle|^bowling|galerie d art|lieu de visite|jardin botanique|salle de concert|^casino|^aquarium|^opera|^chateau|monument historique|activites nautiques|etablissement thermal|^spa$|randonnees|evenement culturel|espace vert|^port$|viticulteur|auditorium') THEN 'activite'
    WHEN regexp_matches(a, '^parking') THEN 'stationnement'
    WHEN regexp_matches(a, 'coiffure|boucherie|soins de beaute|boulangerie|opticien|fleuriste|bijouterie|supermarche|vetements|droguerie|librairie|chocolatier|superette|fromagerie|^commerce|bricolage|chaussures|caviste|surgeles|meubles|parfumerie|telephonie|^bazar|vente d articles|jeux jouets|lingerie|epicerie|^accessoires|traiteur|poissonnerie|maroquinerie|electromenager|cigarette|vente de cafes|animalerie|^tabac|jardinerie|^magasin|cordonnerie|produits de terroir|literie|hypermarche|equipements du foyer|luminaire|papeterie|confiserie|^marche|disquaire|centre commercial|achat or|instruments|brocante|puericulture|fruits et legumes|sex shop|cycle vente|horlogerie|antiquaire|poterie|loisirs creatifs|mercerie|biscuiterie|jeux video|pepiniere|armurerie|barbier|primeur|decoration|amenagement interieur|photographie|pressing|massages|bien etre|tatouage') THEN 'commerce'
    ELSE 'service'
  END;

CREATE OR REPLACE TABLE src_places AS
SELECT
  'acceslibre' AS source,
  id AS source_id,
  CASE WHEN length(norm_txt(name)) < 2 THEN NULL ELSE trim(regexp_replace(name, '\s+', ' ', 'g')) END AS nom,
  CASE WHEN length(norm_txt(name)) < 2 THEN '' ELSE norm_nom(name) END AS nom_norm,
  categorie_acceslibre(norm_txt(activite)) AS categorie,
  activite,
  nullif(trim(numero), '') AS numero,
  nullif(trim(voie), '') AS voie,
  nullif(trim(concat_ws(' ', numero, voie, lieu_dit)), '') AS adresse,
  postal_code AS code_postal,
  commune,
  CAST(latitude AS DOUBLE) AS lat,
  CAST(longitude AS DOUBLE) AS lng,
  false AS coord_approx,
  norm_siret(siret) AS siret,
  nullif(trim(site_internet), '') AS site_web,
  CAST(NULL AS VARCHAR) AS note,
  'https://acceslibre.beta.gouv.fr/uuid/' || id || '/' AS url
FROM acceslibre_raw;

-- Critères Acceslibre, en texte. La valeur « acces_fauteuil » est déduite :
--   non     : marches à l'entrée, sans rampe, ascenseur ni entrée adaptée déclarés,
--             ou porte d'entrée de moins de 77 cm ;
--   partiel : rampe amovible, porte de 77 à 79 cm, ou marches à l'intérieur
--             sans rampe ni ascenseur ;
--   oui     : entrée de plain-pied, rampe fixe, ascenseur ou entrée adaptée ;
--   (vide)  : aucune information sur l'entrée.
CREATE OR REPLACE TABLE acceslibre_crit AS
WITH base AS (
  SELECT *,
    TRY_CAST(entree_largeur_mini AS DOUBLE) AS largeur,
    TRY_CAST(entree_marches AS DOUBLE) AS marches,
    (entree_plain_pied = 'True' OR entree_pmr = 'True' OR entree_marches_rampe = 'fixe'
       OR entree_ascenseur = 'True') AS entree_ok,
    (entree_marches_rampe = 'amovible') AS entree_partielle,
    (accueil_cheminement_plain_pied = 'False'
       AND coalesce(accueil_cheminement_ascenseur, 'False') <> 'True'
       AND coalesce(accueil_cheminement_rampe, 'aucune') = 'aucune') AS interieur_ko
  FROM acceslibre_raw
)
SELECT
  id AS source_id,
  CASE
    WHEN largeur < 77 THEN 'non'
    WHEN entree_plain_pied = 'False' AND NOT coalesce(entree_ok, false)
         AND NOT coalesce(entree_partielle, false) AND coalesce(marches, 1) >= 1 THEN 'non'
    WHEN coalesce(entree_partielle, false)
         AND NOT coalesce(entree_plain_pied = 'True' OR entree_pmr = 'True', false) THEN 'partiel'
    WHEN largeur < 80 OR coalesce(interieur_ko, false) THEN
      CASE WHEN coalesce(entree_ok, false) THEN 'partiel' END
    WHEN coalesce(entree_ok, false) THEN 'oui'
  END AS acces_fauteuil,
  CASE
    WHEN labels LIKE '%"th"%' AND labels_familles_handicap LIKE '%moteur%' THEN 'true'
    WHEN labels LIKE '%"th"%' AND labels_familles_handicap IS NOT NULL THEN 'false'
  END AS label_th_moteur,
  CASE
    WHEN stationnement_pmr = 'True' OR stationnement_ext_pmr = 'True' THEN 'true'
    WHEN stationnement_pmr = 'False' OR stationnement_ext_pmr = 'False'
         OR (stationnement_presence = 'False' AND stationnement_ext_presence = 'False') THEN 'false'
  END AS stationnement_pmr,
  bool_txt(cheminement_ext_plain_pied) AS cheminement_plain_pied,
  bool_txt(cheminement_ext_terrain_stable) AS cheminement_terrain_stable,
  CASE
    WHEN cheminement_ext_pente_presence = 'False' THEN 'aucune'
    WHEN cheminement_ext_pente_degre_difficulte = 'légère' THEN 'legere'
    WHEN cheminement_ext_pente_degre_difficulte = 'importante' THEN 'importante'
  END AS cheminement_pente,
  bool_txt(entree_plain_pied) AS entree_plain_pied,
  int_txt(entree_marches) AS entree_marches,
  entree_marches_rampe AS entree_rampe,
  bool_txt(entree_ascenseur) AS entree_ascenseur,
  int_txt(entree_largeur_mini) AS entree_largeur,
  bool_txt(entree_pmr) AS entree_pmr,
  bool_txt(entree_aide_humaine) AS entree_aide_humaine,
  bool_txt(accueil_cheminement_plain_pied) AS accueil_plain_pied,
  bool_txt(accueil_cheminement_ascenseur) AS accueil_ascenseur,
  bool_txt(accueil_retrecissement) AS accueil_retrecissement,
  CASE
    WHEN sanitaires_adaptes = 'True' THEN 'true'
    WHEN sanitaires_adaptes = 'False' OR sanitaires_presence = 'False' THEN 'false'
  END AS wc_adaptes,
  int_txt(accueil_chambre_nombre_accessibles) AS chambres_accessibles,
  bool_txt(accueil_chambre_douche_plain_pied) AS douche_plain_pied,
  bool_txt(accueil_chambre_douche_siege) AS douche_siege,
  bool_txt(accueil_chambre_douche_barre_appui) AS douche_barre_appui,
  bool_txt(accueil_chambre_sanitaires_barre_appui) AS wc_barre_appui,
  bool_txt(accueil_chambre_sanitaires_espace_usage) AS wc_espace_transfert
FROM base;

CREATE OR REPLACE TABLE src_criteria AS
SELECT
  'acceslibre' AS source,
  source_id,
  critere,
  valeur,
  CAST(NULL AS VARCHAR) AS date,
  'export' AS date_type,
  critere = 'acces_fauteuil' AS derive
FROM (
  UNPIVOT acceslibre_crit ON COLUMNS(* EXCLUDE (source_id)) INTO NAME critere VALUE valeur
);

-- ---------------------------------------------------------------------------
-- OpenStreetMap (les données qu'affiche Wheelmap)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE osm_raw AS
SELECT
  e ->> 'type' AS type,
  CAST(e ->> 'id' AS BIGINT) AS id,
  coalesce(CAST(e ->> 'lat' AS DOUBLE), CAST(e -> 'center' ->> 'lat' AS DOUBLE)) AS lat,
  coalesce(CAST(e ->> 'lon' AS DOUBLE), CAST(e -> 'center' ->> 'lon' AS DOUBLE)) AS lng,
  e ->> 'timestamp' AS ts,
  e -> 'tags' AS tags
FROM (
  SELECT unnest(from_json(json_extract(content, '$.elements'), '["JSON"]')) AS e
  FROM read_text('data/raw/osm/herault.json')
);

CREATE OR REPLACE TABLE osm_tagged AS
SELECT
  type || '/' || id AS source_id,
  type, id, lat, lng, ts,
  tags ->> 'name' AS name,
  tags ->> 'amenity' AS amenity,
  tags ->> 'tourism' AS tourism,
  tags ->> 'shop' AS shop,
  tags ->> 'leisure' AS leisure,
  tags ->> 'natural' AS "natural",
  tags ->> 'historic' AS historic,
  tags ->> 'office' AS office,
  tags ->> 'healthcare' AS healthcare,
  tags ->> 'highway' AS highway,
  tags ->> 'public_transport' AS public_transport,
  tags ->> 'railway' AS railway,
  tags ->> 'information' AS information,
  tags ->> 'parking_space' AS parking_space,
  tags ->> 'wheelchair' AS wheelchair,
  tags ->> 'toilets:wheelchair' AS toilets_wheelchair,
  tags ->> 'capacity:disabled' AS capacity_disabled,
  coalesce(tags ->> 'wheelchair:description:fr', tags ->> 'wheelchair:description') AS wheelchair_description,
  coalesce(tags ->> 'check_date:wheelchair', tags ->> 'check_date') AS check_date,
  tags ->> 'ref:FR:SIRET' AS siret,
  tags ->> 'addr:housenumber' AS housenumber,
  tags ->> 'addr:street' AS street,
  tags ->> 'addr:postcode' AS postcode,
  tags ->> 'addr:city' AS city,
  coalesce(tags ->> 'website', tags ->> 'contact:website') AS website
FROM osm_raw
WHERE dans_herault(lat, lng);

CREATE OR REPLACE TABLE osm_places AS
WITH cat AS (
  SELECT *,
    CASE
      WHEN highway IS NOT NULL OR public_transport IS NOT NULL OR railway IS NOT NULL THEN NULL
      WHEN shop = 'vacant' THEN NULL
      WHEN amenity = 'toilets' THEN 'toilettes'
      WHEN amenity IN ('parking_space', 'parking') THEN 'stationnement'
      WHEN "natural" = 'beach' OR leisure = 'beach_resort' THEN 'plage'
      WHEN tourism = 'information' THEN CASE WHEN information = 'office' THEN 'info' END
      WHEN tourism IN ('hotel', 'motel', 'guest_house', 'hostel', 'camp_site', 'chalet', 'apartment', 'caravan_site') THEN 'hebergement'
      WHEN amenity IN ('restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'ice_cream', 'food_court') THEN 'restauration'
      WHEN amenity IN ('pharmacy', 'doctors', 'dentist', 'hospital', 'clinic') OR healthcare IS NOT NULL
           OR shop = 'medical_supply' THEN 'sante'
      WHEN tourism IN ('museum', 'attraction', 'gallery', 'viewpoint', 'theme_park', 'zoo', 'aquarium', 'picnic_site')
           OR amenity IN ('theatre', 'cinema', 'arts_centre', 'casino')
           OR leisure IN ('park', 'garden', 'nature_reserve', 'marina', 'water_park', 'swimming_area', 'bird_hide', 'beach_resort')
           OR historic IS NOT NULL THEN 'activite'
      -- Équipements sportifs, bibliothèques, aires de jeux : utiles mais pas des activités de séjour.
      WHEN leisure IS NOT NULL OR amenity = 'library' THEN 'service'
      WHEN shop IS NOT NULL THEN 'commerce'
      WHEN amenity IS NOT NULL OR office IS NOT NULL THEN 'service'
      WHEN name IS NOT NULL THEN 'autre'
    END AS categorie,
    CASE
      WHEN tourism = 'hotel' THEN 'Hôtel'
      WHEN tourism = 'motel' THEN 'Motel'
      WHEN tourism = 'guest_house' THEN 'Chambre d''hôtes'
      WHEN tourism = 'hostel' THEN 'Auberge de jeunesse'
      WHEN tourism = 'camp_site' THEN 'Camping'
      WHEN tourism = 'caravan_site' THEN 'Aire de camping-cars'
      WHEN tourism = 'chalet' THEN 'Gîte ou chalet'
      WHEN tourism = 'apartment' THEN 'Meublé de tourisme'
      WHEN tourism = 'museum' THEN 'Musée'
      WHEN tourism = 'attraction' THEN 'Site touristique'
      WHEN tourism = 'gallery' THEN 'Galerie d''art'
      WHEN tourism = 'viewpoint' THEN 'Point de vue'
      WHEN tourism = 'information' THEN 'Office de tourisme'
      WHEN amenity = 'restaurant' THEN 'Restaurant'
      WHEN amenity = 'cafe' THEN 'Café'
      WHEN amenity IN ('bar', 'pub') THEN 'Bar'
      WHEN amenity = 'fast_food' THEN 'Restauration rapide'
      WHEN amenity = 'ice_cream' THEN 'Glacier'
      WHEN amenity = 'toilets' THEN 'Toilettes publiques'
      WHEN amenity = 'parking_space' THEN 'Place de stationnement adaptée'
      WHEN amenity = 'parking' THEN 'Parking'
      WHEN amenity = 'pharmacy' THEN 'Pharmacie'
      WHEN amenity = 'doctors' THEN 'Médecin'
      WHEN amenity = 'dentist' THEN 'Dentiste'
      WHEN amenity = 'hospital' THEN 'Hôpital'
      WHEN amenity = 'theatre' THEN 'Théâtre'
      WHEN amenity = 'cinema' THEN 'Cinéma'
      WHEN amenity = 'library' THEN 'Bibliothèque'
      WHEN amenity = 'townhall' THEN 'Mairie'
      WHEN amenity = 'post_office' THEN 'Bureau de poste'
      WHEN amenity = 'bank' THEN 'Banque'
      WHEN "natural" = 'beach' THEN 'Plage'
      WHEN shop = 'bakery' THEN 'Boulangerie'
      WHEN shop = 'supermarket' THEN 'Supermarché'
      WHEN shop = 'convenience' THEN 'Supérette'
      WHEN shop IS NOT NULL THEN 'Commerce'
    END AS activite
  FROM osm_tagged
)
SELECT *
FROM cat
WHERE categorie IS NOT NULL
  -- Un lieu sans nom n'est gardé que s'il porte une information d'accessibilité.
  AND (name IS NOT NULL
       OR categorie IN ('toilettes', 'plage')
       OR wheelchair IS NOT NULL OR toilets_wheelchair IS NOT NULL OR capacity_disabled IS NOT NULL
       OR parking_space = 'disabled');

INSERT INTO src_places
SELECT
  'osm' AS source,
  source_id,
  name AS nom,
  CASE WHEN name IS NULL THEN '' ELSE norm_nom(name) END AS nom_norm,
  categorie,
  activite,
  housenumber AS numero,
  street AS voie,
  nullif(trim(concat_ws(' ', housenumber, street)), '') AS adresse,
  postcode AS code_postal,
  city AS commune,
  lat,
  lng,
  false AS coord_approx,
  norm_siret(siret) AS siret,
  website AS site_web,
  wheelchair_description AS note,
  'https://www.openstreetmap.org/' || source_id AS url
FROM osm_places;

INSERT INTO src_criteria
WITH v AS (
  SELECT
    source_id,
    CASE
      WHEN wheelchair IN ('yes', 'designated', 'official') THEN 'oui'
      WHEN wheelchair = 'limited' THEN 'partiel'
      WHEN wheelchair = 'no' THEN 'non'
    END AS acces_fauteuil,
    CASE
      WHEN toilets_wheelchair = 'yes' THEN 'true'
      WHEN toilets_wheelchair = 'no' THEN 'false'
      WHEN amenity = 'toilets' AND wheelchair IN ('yes', 'designated') THEN 'true'
      WHEN amenity = 'toilets' AND wheelchair = 'no' THEN 'false'
    END AS wc_adaptes,
    CASE
      WHEN parking_space = 'disabled' THEN 'true'
      WHEN capacity_disabled = 'yes' OR TRY_CAST(capacity_disabled AS INTEGER) > 0 THEN 'true'
      WHEN capacity_disabled = 'no' OR TRY_CAST(capacity_disabled AS INTEGER) = 0 THEN 'false'
    END AS stationnement_pmr,
    -- Date de vérification si le contributeur l'a notée, sinon dernière modification de l'objet.
    CASE WHEN regexp_matches(coalesce(check_date, ''), '^\d{4}-\d{2}-\d{2}$') THEN check_date
         ELSE substr(ts, 1, 10) END AS date,
    CASE WHEN regexp_matches(coalesce(check_date, ''), '^\d{4}-\d{2}-\d{2}$') THEN 'verification'
         ELSE 'modification' END AS date_type
  FROM osm_places
)
SELECT 'osm' AS source, source_id, critere, valeur, date, date_type, false AS derive
FROM (
  UNPIVOT v ON acces_fauteuil, wc_adaptes, stationnement_pmr INTO NAME critere VALUE valeur
);

-- ---------------------------------------------------------------------------
-- Tourisme & Handicap
-- ---------------------------------------------------------------------------
-- La liste n'a pas d'identifiant : on en fabrique un, stable d'un téléchargement
-- à l'autre, à partir du nom, de l'adresse et du code postal. Les doublons exacts
-- sont écartés. `idx` (position dans le fichier) sert au géocodage.
CREATE OR REPLACE TABLE th_raw AS
SELECT *
FROM (
  SELECT
    row_number() OVER () - 1 AS idx,
    'th-' || substr(md5(concat_ws('|', norm_txt(nom_etablissement), norm_txt(adresse), cp)), 1, 8) AS th_id,
    *
  FROM read_json('data/raw/tourisme-handicap/th_34.json')
)
QUALIFY row_number() OVER (PARTITION BY th_id ORDER BY idx) = 1;

CREATE OR REPLACE TABLE th_geo AS
SELECT * FROM read_json('data/raw/tourisme-handicap/th_34_geocodage.json',
  columns = {index: 'INTEGER', lng: 'DOUBLE', lat: 'DOUBLE', score: 'DOUBLE', libelle: 'VARCHAR', type: 'VARCHAR'});

INSERT INTO src_places
SELECT
  'th' AS source,
  t.th_id AS source_id,
  trim(regexp_replace(t.nom_etablissement, '\s+', ' ', 'g')) AS nom,
  norm_nom(t.nom_etablissement) AS nom_norm,
  CASE
    WHEN t.categorie_filiere LIKE '%Hébergement%' THEN 'hebergement'
    WHEN t.categorie_filiere LIKE '%Restauration%' THEN 'restauration'
    WHEN t.categorie_filiere LIKE '%Information%' THEN 'info'
    ELSE 'activite'
  END AS categorie,
  t.activite,
  regexp_extract(t.adresse, '^\s*(\d+)', 1) AS numero,
  nullif(trim(regexp_replace(t.adresse, '^\s*\d+[ ,]*(bis|ter)?', '')), '') AS voie,
  nullif(trim(t.adresse), '') AS adresse,
  t.cp AS code_postal,
  t.commune,
  coalesce(t.geocodage.lat, g.lat) AS lat,
  coalesce(t.geocodage.lon, g.lng) AS lng,
  t.geocodage IS NULL AS coord_approx,
  norm_siret(t.siret) AS siret,
  CASE WHEN t.site_web_etablissement LIKE 'http%://_%' THEN t.site_web_etablissement END AS site_web,
  CAST(NULL AS VARCHAR) AS note,
  CAST(NULL AS VARCHAR) AS url
FROM th_raw t
LEFT JOIN th_geo g ON g.index = t.idx;

INSERT INTO src_criteria
SELECT 'th', th_id, 'label_th_moteur',
       CASE WHEN list_contains(handicaps, 'moteur') THEN 'true' ELSE 'false' END,
       getvariable('th_date'), 'liste', false
FROM th_raw
UNION ALL
-- Le label moteur vaut accessibilité en fauteuil (valeur déduite).
SELECT 'th', th_id, 'acces_fauteuil', 'oui', getvariable('th_date'), 'liste', true
FROM th_raw
WHERE list_contains(handicaps, 'moteur');

-- Les communes en capitales de la liste T&H sont remises en casse normale à l'export.
