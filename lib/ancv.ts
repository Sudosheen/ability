/**
 * Aides aux vacances de l'ANCV : premier repérage, purement indicatif.
 *
 * Ability ne verse aucune aide et ne peut pas en demander : les aides ANCV
 * (aide aux projets vacances, programmes sociaux) passent par des structures
 * partenaires (associations, CCAS, établissements médico-sociaux). La maquette
 * dit seulement quelle piste explorer et auprès de qui. Les conditions exactes
 * changent : elles sont toujours « à vérifier ».
 */

export type AncvAnswers = {
  /** Le séjour est organisé ou accompagné par une structure (ESAT, foyer, association). */
  structure: boolean;
  /** La personne a entre 18 et 25 ans. */
  jeune: boolean;
  /** La personne a 60 ans ou plus, ou 55 ans ou plus en situation de handicap. */
  senior: boolean;
  /** Ressources modestes (quotient familial bas, minima sociaux). */
  ressourcesModestes: boolean;
  /** L'employeur ou le CSE distribue des Chèques-Vacances. */
  employeur: boolean;
};

export const EMPTY_ANSWERS: AncvAnswers = {
  structure: false,
  jeune: false,
  senior: false,
  ressourcesModestes: false,
  employeur: false,
};

export const ANCV_QUESTIONS: { key: keyof AncvAnswers; label: string }[] = [
  { key: "structure", label: "Le séjour se fait avec une structure (ESAT, foyer, association, service d'accompagnement)" },
  { key: "ressourcesModestes", label: "Les ressources sont modestes (quotient familial bas, AAH ou autres minima sociaux)" },
  { key: "jeune", label: "La personne a entre 18 et 25 ans" },
  { key: "senior", label: "La personne a 60 ans ou plus (ou 55 ans et plus, en situation de handicap)" },
  { key: "employeur", label: "L'employeur ou le CSE de la personne (ou d'un proche) propose des Chèques-Vacances" },
];

export type AncvPiste = {
  id: string;
  titre: string;
  pourquoi: string;
  aupresDe: string;
};

/** Pistes d'aides à explorer d'après les réponses. Rien n'est garanti : tout est à vérifier. */
export function ancvPistes(a: AncvAnswers): AncvPiste[] {
  const pistes: AncvPiste[] = [];
  if (a.employeur) {
    pistes.push({
      id: "cheques-employeur",
      titre: "Chèques-Vacances par l'employeur ou le CSE",
      pourquoi: "Ils se dépensent chez les prestataires conventionnés : le filtre « Chèques-Vacances » de l'itinéraire sert à ça.",
      aupresDe: "Le service RH ou le CSE",
    });
  }
  if (a.structure && a.ressourcesModestes) {
    pistes.push({
      id: "apv",
      titre: "Aide aux projets vacances (APV)",
      pourquoi: "Elle finance une partie du séjour de personnes aux ressources modestes, quand le projet est porté par une structure partenaire de l'ANCV.",
      aupresDe: "La structure qui accompagne le séjour, si elle est partenaire de l'ANCV",
    });
  } else if (a.ressourcesModestes) {
    pistes.push({
      id: "apv-relais",
      titre: "Aide aux projets vacances, par une structure relais",
      pourquoi: "Un particulier ne la demande pas seul : il faut passer par une structure partenaire de l'ANCV.",
      aupresDe: "Le CCAS de la commune, la CAF ou une association (APF France handicap, Unapei…)",
    });
  }
  if (a.jeune) {
    pistes.push({
      id: "depart-18-25",
      titre: "Programme Départ 18:25",
      pourquoi: "Il aide les jeunes de 18 à 25 ans à partir, sous conditions de situation ou de ressources.",
      aupresDe: "Le site de l'ANCV ou la mission locale",
    });
  }
  if (a.senior) {
    pistes.push({
      id: "seniors-en-vacances",
      titre: "Programme Seniors en vacances",
      pourquoi: "Des séjours à prix réduit, avec une aide supplémentaire selon les ressources, aidants compris.",
      aupresDe: "Le site de l'ANCV ou le CCAS",
    });
  }
  return pistes;
}
