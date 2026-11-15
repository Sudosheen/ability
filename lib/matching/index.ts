/**
 * Moteur de compatibilité : confronte un lieu à un profil de besoins.
 *
 * Règle centrale : une information inconnue ou contestée n'est jamais
 * « compatible ».
 *   - une exigence bloquante non remplie            -> incompatible
 *   - sinon, une exigence bloquante inconnue ou
 *     sur laquelle les sources divergent            -> à confirmer
 *   - sinon                                         -> compatible
 * Les exigences de confort (toilettes, stationnement) ne changent pas le
 * statut : elles deviennent des points d'attention.
 */
import { CRITERIA_BY_KEY } from "../criteria.ts";
import type { Facts } from "../facts.ts";
import { MARGE_PORTE_CM, type NeedsProfile } from "../profile.ts";

export type Compatibility = "compatible" | "a_confirmer" | "incompatible";
export type CheckResult = "ok" | "ko" | "inconnu" | "divergent";
export type CheckLevel = "bloquant" | "confort";

export type Check = {
  id: string;
  libelle: string;
  niveau: CheckLevel;
  resultat: CheckResult;
  /** Explication lisible : ce que l'on sait, et ce qu'il faudrait. */
  detail: string;
  /** Critères du catalogue sur lesquels repose la vérification. */
  criteres: string[];
};

export type Evaluation = {
  statut: Compatibility;
  exigences: Check[];
  /** Exigences bloquantes non remplies. */
  bloquants: Check[];
  /** Exigences bloquantes inconnues ou contestées. */
  aConfirmer: Check[];
  /** Exigences de confort non remplies ou inconnues. */
  attention: Check[];
  /** Questions à poser à l'établissement pour lever les inconnues bloquantes. */
  questions: string[];
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

function make(
  id: string,
  libelle: string,
  niveau: CheckLevel,
  criteres: string[],
  resultat: CheckResult,
  detail: string,
): Check {
  return { id, libelle, niveau, resultat, detail, criteres };
}

/** Exigence portée par un seul critère booléen. */
function boolCheck(
  facts: Facts,
  id: string,
  libelle: string,
  niveau: CheckLevel,
  cle: string,
  textes: { ok: string; ko: string; inconnu: string },
): Check {
  if (facts.divergent(cle)) {
    return make(id, libelle, niveau, [cle], "divergent", "Les sources se contredisent.");
  }
  const v = facts.value(cle);
  if (v === undefined) return make(id, libelle, niveau, [cle], "inconnu", textes.inconnu);
  return v === true
    ? make(id, libelle, niveau, [cle], "ok", textes.ok)
    : make(id, libelle, niveau, [cle], "ko", textes.ko);
}

const ENTREE = ["entree_plain_pied", "entree_marches", "entree_rampe", "entree_ascenseur", "entree_pmr"];

function checkEntree(facts: Facts, profile: NeedsProfile): Check {
  const c = (resultat: CheckResult, detail: string) =>
    make("entree", "Entrer dans le lieu", "bloquant", ["acces_fauteuil", ...ENTREE], resultat, detail);

  if (facts.acces === "divergent" || ENTREE.some((cle) => facts.divergent(cle))) {
    return c("divergent", "Les sources se contredisent sur l'accès en fauteuil.");
  }
  const plainPied = facts.value("entree_plain_pied");
  const marches = facts.value("entree_marches") as number | undefined;
  const rampe = facts.value("entree_rampe");

  if (plainPied === true) return c("ok", "Entrée de plain-pied.");
  if (facts.value("entree_pmr") === true) return c("ok", "Entrée secondaire adaptée.");
  if (rampe === "fixe") return c("ok", "Rampe fixe à l'entrée.");
  if (facts.value("entree_ascenseur") === true) return c("ok", "Ascenseur ou élévateur à l'entrée.");
  if (rampe === "amovible") return c("ok", "Rampe amovible : prévenir l'établissement de votre arrivée.");
  if (plainPied === false) {
    if (marches === 1 && profile.marche === "une_avec_aide") {
      return c("ok", "Une marche à l'entrée, franchissable avec aide.");
    }
    return c(
      "ko",
      marches ? `${pluriel(marches, "marche")} à l'entrée, sans rampe déclarée.` : "Marche à l'entrée, sans rampe déclarée.",
    );
  }
  // Pas de critère détaillé : on se rabat sur l'avis global des sources.
  if (facts.acces === "oui") return c("ok", "Accessible en fauteuil d'après les sources, sans détail sur l'entrée.");
  if (facts.acces === "non") return c("ko", "Non accessible en fauteuil d'après les sources.");
  if (facts.acces === "partiel") return c("inconnu", "Accès partiel d'après les sources : à préciser.");
  return c("inconnu", "Aucune information sur l'entrée.");
}

function checkLargeur(
  facts: Facts,
  profile: NeedsProfile,
  id: string,
  libelle: string,
  cle: string,
  nom: string,
): Check {
  const besoin = profile.largeurFauteuil + MARGE_PORTE_CM;
  const c = (resultat: CheckResult, detail: string) => make(id, libelle, "bloquant", [cle], resultat, detail);
  if (facts.divergent(cle)) return c("divergent", "Les sources donnent des largeurs différentes.");
  const largeur = facts.value(cle) as number | undefined;
  if (largeur === undefined) return c("inconnu", `Largeur de ${nom} inconnue : il faut ${besoin} cm.`);
  return largeur >= besoin
    ? c("ok", `${largeur} cm de passage, pour ${besoin} cm nécessaires.`)
    : c("ko", `${largeur} cm de passage : il en faut ${besoin}.`);
}

function checkInterieur(facts: Facts): Check {
  const cles = ["accueil_plain_pied", "accueil_ascenseur"];
  const c = (niveau: CheckLevel, resultat: CheckResult, detail: string) =>
    make("interieur", "Circuler à l'intérieur", niveau, cles, resultat, detail);
  if (cles.some((cle) => facts.divergent(cle))) return c("confort", "divergent", "Les sources se contredisent.");
  const plainPied = facts.value("accueil_plain_pied");
  if (plainPied === true) return c("bloquant", "ok", "Circulation intérieure de plain-pied.");
  if (facts.value("accueil_ascenseur") === true) return c("bloquant", "ok", "Ascenseur à l'intérieur.");
  if (plainPied === false) return c("bloquant", "ko", "Marches à l'intérieur, sans ascenseur déclaré.");
  // Inconnu : l'avis global couvre déjà l'accès, on le signale sans bloquer.
  return c("confort", "inconnu", "Circulation intérieure non décrite.");
}

function checkEquipement(facts: Facts): Check[] {
  const [cle, libelle] =
    facts.categorie === "toilettes"
      ? ["wc_adaptes", "Toilettes adaptées"]
      : ["stationnement_pmr", "Place de stationnement adaptée"];
  if (facts.value(cle) === undefined && !facts.divergent(cle)) {
    const resultat: CheckResult =
      facts.acces === "oui" ? "ok" : facts.acces === "non" ? "ko" : facts.acces === "divergent" ? "divergent" : "inconnu";
    return [make("equipement", libelle, "bloquant", [cle, "acces_fauteuil"], resultat, "D'après l'avis global des sources.")];
  }
  return [
    boolCheck(facts, "equipement", libelle, "bloquant", cle, {
      ok: "Adapté d'après les sources.",
      ko: "Non adapté d'après les sources.",
      inconnu: "Aucune information.",
    }),
  ];
}

function checkHebergement(facts: Facts, profile: NeedsProfile, chambresNecessaires: number): Check[] {
  const checks: Check[] = [];

  const chambres = facts.value("chambres_accessibles") as number | undefined;
  const c = (resultat: CheckResult, detail: string) =>
    make("chambre", chambresNecessaires > 1 ? `${chambresNecessaires} chambres accessibles` : "Chambre accessible", "bloquant", ["chambres_accessibles"], resultat, detail);
  checks.push(
    facts.divergent("chambres_accessibles")
      ? c("divergent", "Les sources se contredisent.")
      : chambres === undefined
        ? c("inconnu", "Nombre de chambres accessibles inconnu.")
        : chambres >= chambresNecessaires
          ? c("ok", `${pluriel(chambres, "chambre")} accessible${chambres > 1 ? "s" : ""}.`)
          : chambres === 0
            ? c("ko", "Aucune chambre accessible.")
            : c("ko", `${pluriel(chambres, "chambre")} accessible${chambres > 1 ? "s" : ""}, pour ${chambresNecessaires} nécessaires.`),
  );
  checks.push(
    checkLargeur(facts, profile, "chambre_porte", "Porte de la chambre", "chambre_largeur_porte", "la porte de la chambre"),
    boolCheck(facts, "rotation", "Faire demi-tour dans la chambre", "bloquant", "chambre_aire_rotation", {
      ok: "Aire de rotation de 150 cm dans la chambre.",
      ko: "Pas d'aire de rotation de 150 cm dans la chambre.",
      inconnu: "Espace de manœuvre dans la chambre inconnu.",
    }),
  );
  if (profile.douchePlainPied) {
    checks.push(
      boolCheck(facts, "douche", "Douche de plain-pied", "bloquant", "douche_plain_pied", {
        ok: "Douche de plain-pied.",
        ko: "La douche n'est pas de plain-pied.",
        inconnu: "Type de douche inconnu.",
      }),
    );
  }
  if (profile.wcTransfert) {
    checks.push(
      boolCheck(facts, "wc_transfert", "Espace de transfert aux toilettes", "bloquant", "wc_espace_transfert", {
        ok: "Espace de transfert à côté de la cuvette.",
        ko: "Pas d'espace de transfert à côté de la cuvette.",
        inconnu: "Espace de transfert aux toilettes inconnu.",
      }),
    );
  }
  if (profile.transfert === "leve_personne") {
    checks.push(
      boolCheck(facts, "lit", "Lit compatible avec un lève-personne", "bloquant", "lit_espace_dessous", {
        ok: "Espace libre sous le lit pour le piétement du lève-personne.",
        ko: "Pas d'espace sous le lit pour le piétement du lève-personne.",
        inconnu: "Espace sous le lit inconnu.",
      }),
    );
    if (profile.levePersonne === "sur_place") {
      const dispo = facts.value("leve_personne");
      const c = (resultat: CheckResult, detail: string) =>
        make("leve_personne", "Lève-personne sur place", "bloquant", ["leve_personne"], resultat, detail);
      checks.push(
        facts.divergent("leve_personne")
          ? c("divergent", "Les sources se contredisent.")
          : dispo === undefined
            ? c("inconnu", "Disponibilité d'un lève-personne inconnue.")
            : dispo === "sur_place"
              ? c("ok", "Lève-personne disponible sur place.")
              : dispo === "location"
                ? c("ok", "Lève-personne en location à proximité : à réserver.")
                : c("ko", "Pas de lève-personne sur place ni en location."),
      );
    }
  }
  return checks;
}

/** Besoins propres à un séjour : nombre de chambres accessibles (une par personne en fauteuil). */
export type TripNeeds = { chambres: number };

export function evaluate(facts: Facts, profile: NeedsProfile, needs: TripNeeds = { chambres: 1 }): Evaluation {
  let exigences: Check[];
  if (facts.categorie === "toilettes" || facts.categorie === "stationnement") {
    exigences = checkEquipement(facts);
  } else {
    exigences = [
      checkEntree(facts, profile),
      checkLargeur(facts, profile, "largeur", "Porte d'entrée", "entree_largeur", "la porte d'entrée"),
      checkInterieur(facts),
      ...(facts.categorie === "hebergement" ? checkHebergement(facts, profile, Math.max(1, needs.chambres)) : []),
      boolCheck(facts, "wc", "Toilettes adaptées", "confort", "wc_adaptes", {
        ok: "Toilettes adaptées.",
        ko: "Pas de toilettes adaptées.",
        inconnu: "Présence de toilettes adaptées inconnue.",
      }),
    ];
    if (profile.stationnement) {
      exigences.push(
        boolCheck(facts, "stationnement", "Place de stationnement adaptée", "confort", "stationnement_pmr", {
          ok: "Place de stationnement adaptée.",
          ko: "Pas de place de stationnement adaptée.",
          inconnu: "Stationnement adapté inconnu.",
        }),
      );
    }
  }

  const bloquant = exigences.filter((c) => c.niveau === "bloquant");
  const bloquants = bloquant.filter((c) => c.resultat === "ko");
  const aConfirmer = bloquant.filter((c) => c.resultat === "inconnu" || c.resultat === "divergent");
  const attention = exigences.filter((c) => c.niveau === "confort" && c.resultat !== "ok");
  const statut: Compatibility = bloquants.length
    ? "incompatible"
    : aConfirmer.length
      ? "a_confirmer"
      : "compatible";

  // Une question par critère principal encore inconnu, sans doublon.
  const questions = [
    ...new Set(
      aConfirmer
        .map((c) => CRITERIA_BY_KEY[c.criteres.find((cle) => cle !== "acces_fauteuil") ?? c.criteres[0]]?.question)
        .filter((q): q is string => Boolean(q)),
    ),
  ];

  return { statut, exigences, bloquants, aConfirmer, attention, questions };
}

const RANG: Record<Compatibility, number> = { compatible: 0, a_confirmer: 1, incompatible: 2 };

/** Tri « le plus compatible d'abord » : statut, puis nombre d'inconnues, puis nombre de blocages. */
export function compareEvaluations(a: Evaluation, b: Evaluation): number {
  return (
    RANG[a.statut] - RANG[b.statut] ||
    a.aConfirmer.length - b.aConfirmer.length ||
    a.bloquants.length - b.bloquants.length ||
    a.attention.length - b.attention.length
  );
}

/** Phrase courte qui résume une évaluation, pour les listes. */
export function summarize(e: Evaluation): string {
  if (e.statut === "incompatible") return e.bloquants[0].detail;
  if (e.statut === "a_confirmer") {
    return e.aConfirmer.length === 1
      ? e.aConfirmer[0].detail
      : `${e.aConfirmer.length} informations à confirmer, dont : ${e.aConfirmer[0].libelle.toLowerCase()}.`;
  }
  return e.attention.length
    ? `Toutes les exigences sont remplies. ${pluriel(e.attention.length, "point")} d'attention.`
    : "Toutes les exigences sont remplies.";
}
