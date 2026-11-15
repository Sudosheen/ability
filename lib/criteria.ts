/**
 * Catalogue des critères d'accessibilité d'Ability.
 *
 * Les critères « bloquant » peuvent rendre un séjour impossible pour une
 * personne en fauteuil ou transférée au lève-personne. Quand un critère
 * bloquant est inconnu, le lieu passe en « À confirmer » et la question
 * correspondante est proposée pour l'établissement.
 */

export type CriterionSection =
  | "global"
  | "arrivee"
  | "entree"
  | "circulation"
  | "sanitaires"
  | "chambre"
  | "salle_de_bain"
  | "equipements";

export type CriterionType = "bool" | "nombre" | "enum";

export type CriterionDef = {
  cle: string;
  libelle: string;
  section: CriterionSection;
  type: CriterionType;
  unite?: string;
  /** Libellés des valeurs d'un critère de type enum. */
  valeurs?: Record<string, string>;
  bloquant: boolean;
  /** Critère propre aux hébergements. */
  hebergement?: boolean;
  /** Question à poser à l'établissement quand l'information manque. */
  question: string;
  /** Écart toléré entre deux sources avant de parler de divergence (nombres). */
  tolerance?: number;
};

export const SECTION_LABELS: Record<CriterionSection, string> = {
  global: "Vue d'ensemble",
  arrivee: "Arrivée et stationnement",
  entree: "Entrée",
  circulation: "Circulation intérieure",
  sanitaires: "Sanitaires",
  chambre: "Chambre",
  salle_de_bain: "Salle de bain",
  equipements: "Équipements et aides techniques",
};

export const CRITERIA: CriterionDef[] = [
  {
    cle: "acces_fauteuil",
    libelle: "Accès en fauteuil roulant",
    section: "global",
    type: "enum",
    valeurs: { oui: "Accessible", partiel: "Partiellement accessible", non: "Non accessible" },
    bloquant: true,
    question: "Peut-on entrer et circuler dans l'établissement en fauteuil roulant, sans aide ?",
  },
  {
    cle: "label_th_moteur",
    libelle: "Label Tourisme & Handicap, handicap moteur",
    section: "global",
    type: "bool",
    bloquant: false,
    question: "L'établissement a-t-il le label Tourisme & Handicap pour le handicap moteur, et jusqu'à quand ?",
  },

  // Arrivée
  {
    cle: "stationnement_pmr",
    libelle: "Place de stationnement adaptée",
    section: "arrivee",
    type: "bool",
    bloquant: false,
    question: "Y a-t-il une place de stationnement adaptée, et à quelle distance de l'entrée ?",
  },
  {
    cle: "cheminement_plain_pied",
    libelle: "Cheminement extérieur de plain-pied",
    section: "arrivee",
    type: "bool",
    bloquant: false,
    question: "Le chemin entre le stationnement et l'entrée est-il de plain-pied ?",
  },
  {
    cle: "cheminement_terrain_stable",
    libelle: "Revêtement extérieur stable et roulant",
    section: "arrivee",
    type: "bool",
    bloquant: false,
    question: "Le revêtement extérieur est-il stable et roulant (pas de gravier ni de sable) ?",
  },
  {
    cle: "cheminement_pente",
    libelle: "Pente sur le cheminement extérieur",
    section: "arrivee",
    type: "enum",
    valeurs: { aucune: "Aucune pente", legere: "Pente légère", importante: "Pente importante" },
    bloquant: false,
    question: "Y a-t-il une pente avant l'entrée, et de quel pourcentage ?",
  },

  // Entrée
  {
    cle: "entree_plain_pied",
    libelle: "Entrée de plain-pied",
    section: "entree",
    type: "bool",
    bloquant: true,
    question: "L'entrée est-elle de plain-pied, sans marche ni ressaut de plus de 2 cm ?",
  },
  {
    cle: "entree_marches",
    libelle: "Marches à l'entrée",
    section: "entree",
    type: "nombre",
    unite: "marche(s)",
    bloquant: false,
    question: "Combien y a-t-il de marches à l'entrée ?",
  },
  {
    cle: "entree_rampe",
    libelle: "Rampe d'accès à l'entrée",
    section: "entree",
    type: "enum",
    valeurs: { aucune: "Aucune rampe", fixe: "Rampe fixe", amovible: "Rampe amovible" },
    bloquant: false,
    question: "Y a-t-il une rampe à l'entrée (fixe ou amovible), et quelle est sa pente ?",
  },
  {
    cle: "entree_ascenseur",
    libelle: "Ascenseur ou élévateur à l'entrée",
    section: "entree",
    type: "bool",
    bloquant: false,
    question: "Y a-t-il un ascenseur ou un élévateur pour franchir les marches de l'entrée ?",
  },
  {
    cle: "entree_largeur",
    libelle: "Largeur de la porte d'entrée",
    section: "entree",
    type: "nombre",
    unite: "cm",
    bloquant: true,
    tolerance: 5,
    question: "Quelle est la largeur de passage de la porte d'entrée, en centimètres ?",
  },
  {
    cle: "entree_pmr",
    libelle: "Entrée secondaire adaptée",
    section: "entree",
    type: "bool",
    bloquant: false,
    question: "Existe-t-il une entrée secondaire adaptée aux fauteuils ?",
  },
  {
    cle: "entree_aide_humaine",
    libelle: "Aide humaine possible à l'entrée",
    section: "entree",
    type: "bool",
    bloquant: false,
    question: "Quelqu'un peut-il aider à l'entrée si besoin ?",
  },

  // Circulation
  {
    cle: "accueil_plain_pied",
    libelle: "Circulation intérieure de plain-pied",
    section: "circulation",
    type: "bool",
    bloquant: true,
    question: "Peut-on circuler à l'intérieur sans marche jusqu'aux espaces utiles ?",
  },
  {
    cle: "accueil_ascenseur",
    libelle: "Ascenseur intérieur",
    section: "circulation",
    type: "bool",
    bloquant: false,
    question: "Y a-t-il un ascenseur, et quelles sont les dimensions de la cabine ?",
  },
  {
    cle: "accueil_retrecissement",
    libelle: "Passage rétréci (moins de 90 cm)",
    section: "circulation",
    type: "bool",
    bloquant: false,
    question: "Y a-t-il des passages de moins de 90 cm de large à l'intérieur ?",
  },

  // Sanitaires
  {
    cle: "wc_adaptes",
    libelle: "Toilettes adaptées",
    section: "sanitaires",
    type: "bool",
    bloquant: true,
    question: "Y a-t-il des toilettes adaptées, avec un espace de transfert ?",
  },

  // Chambre (hébergements)
  {
    cle: "chambres_accessibles",
    libelle: "Nombre de chambres accessibles",
    section: "chambre",
    type: "nombre",
    unite: "chambre(s)",
    bloquant: true,
    hebergement: true,
    question: "Combien de chambres sont accessibles en fauteuil ?",
  },
  {
    cle: "chambre_largeur_porte",
    libelle: "Largeur de la porte de la chambre",
    section: "chambre",
    type: "nombre",
    unite: "cm",
    bloquant: true,
    hebergement: true,
    tolerance: 5,
    question: "Quelle est la largeur de passage de la porte de la chambre, en centimètres ?",
  },
  {
    cle: "lit_hauteur",
    libelle: "Hauteur du lit",
    section: "chambre",
    type: "nombre",
    unite: "cm",
    bloquant: true,
    hebergement: true,
    tolerance: 3,
    question: "Quelle est la hauteur du lit, matelas compris, en centimètres ?",
  },
  {
    cle: "lit_espace_dessous",
    libelle: "Espace libre sous le lit pour un lève-personne",
    section: "chambre",
    type: "bool",
    bloquant: true,
    hebergement: true,
    question: "Y a-t-il au moins 15 cm de vide sous le lit pour glisser le piétement d'un lève-personne ?",
  },
  {
    cle: "chambre_aire_rotation",
    libelle: "Aire de rotation de 150 cm dans la chambre",
    section: "chambre",
    type: "bool",
    bloquant: true,
    hebergement: true,
    question: "Peut-on faire demi-tour en fauteuil dans la chambre (cercle de 150 cm) ?",
  },

  // Salle de bain (hébergements)
  {
    cle: "douche_plain_pied",
    libelle: "Douche de plain-pied",
    section: "salle_de_bain",
    type: "bool",
    bloquant: true,
    hebergement: true,
    question: "La douche est-elle de plain-pied (à l'italienne, sans ressaut) ?",
  },
  {
    cle: "douche_siege",
    libelle: "Siège de douche",
    section: "salle_de_bain",
    type: "bool",
    bloquant: false,
    hebergement: true,
    question: "Y a-t-il un siège de douche (fixe ou mobile) ?",
  },
  {
    cle: "douche_barre_appui",
    libelle: "Barre d'appui dans la douche",
    section: "salle_de_bain",
    type: "bool",
    bloquant: false,
    hebergement: true,
    question: "Y a-t-il une barre d'appui dans la douche ?",
  },
  {
    cle: "wc_barre_appui",
    libelle: "Barre d'appui aux toilettes de la chambre",
    section: "salle_de_bain",
    type: "bool",
    bloquant: false,
    hebergement: true,
    question: "Y a-t-il une barre d'appui aux toilettes de la chambre ?",
  },
  {
    cle: "wc_espace_transfert",
    libelle: "Espace de transfert aux toilettes de la chambre",
    section: "salle_de_bain",
    type: "bool",
    bloquant: true,
    hebergement: true,
    question: "Y a-t-il un espace libre à côté de la cuvette pour un transfert, et de quel côté ?",
  },
  {
    cle: "wc_cote_transfert",
    libelle: "Côté de transfert aux toilettes",
    section: "salle_de_bain",
    type: "enum",
    valeurs: { gauche: "À gauche", droite: "À droite", deux: "Des deux côtés" },
    bloquant: false,
    hebergement: true,
    question: "De quel côté de la cuvette se trouve l'espace de transfert ?",
  },

  // Équipements
  {
    cle: "leve_personne",
    libelle: "Lève-personne disponible",
    section: "equipements",
    type: "enum",
    valeurs: { sur_place: "Sur place", location: "En location à proximité", non: "Non disponible" },
    bloquant: false,
    hebergement: true,
    question: "Un lève-personne est-il disponible sur place, ou peut-on en faire livrer un ?",
  },
  {
    cle: "lit_medicalise",
    libelle: "Lit médicalisé possible",
    section: "equipements",
    type: "bool",
    bloquant: false,
    hebergement: true,
    question: "Peut-on installer un lit médicalisé dans la chambre ?",
  },
];

export const CRITERIA_BY_KEY: Record<string, CriterionDef> = Object.fromEntries(
  CRITERIA.map((c) => [c.cle, c]),
);
