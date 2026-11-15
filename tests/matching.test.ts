import { describe, expect, it } from "vitest";
import { encodeFacts, factsFromFeature, factsFromPlace, type Facts } from "../lib/facts";
import { compareEvaluations, evaluate, summarize } from "../lib/matching";
import { PRESETS, sanitizeProfile } from "../lib/profile";
import type { AccessStatus, Category, CriterionScalar, CriterionValue, Place } from "../lib/types";

function facts(
  values: Record<string, CriterionScalar>,
  options: { categorie?: Category; acces?: AccessStatus; divergents?: string[] } = {},
): Facts {
  return {
    categorie: options.categorie ?? "restauration",
    acces: options.acces ?? "inconnu",
    value: (cle) => values[cle],
    divergent: (cle) => options.divergents?.includes(cle) ?? false,
  };
}

const electrique = PRESETS.electrique; // 68 cm, aucune marche : il faut 75 cm de passage
const manuel = PRESETS.manuel; // 65 cm, une marche possible avec aide
const levePersonne = PRESETS["leve-personne"];

const RESTAURANT_OK = { entree_plain_pied: true, entree_largeur: 90, accueil_plain_pied: true };

const CHAMBRE_OK = {
  ...RESTAURANT_OK,
  chambres_accessibles: 2,
  chambre_largeur_porte: 90,
  chambre_aire_rotation: true,
  douche_plain_pied: true,
  wc_espace_transfert: true,
  lit_espace_dessous: true,
};

describe("lieux hors hébergement", () => {
  it("est compatible quand entrée, largeur et circulation sont connues et suffisantes", () => {
    const e = evaluate(facts(RESTAURANT_OK), electrique);
    expect(e.statut).toBe("compatible");
    expect(e.bloquants).toHaveLength(0);
    expect(e.aConfirmer).toHaveLength(0);
  });

  it("n'est jamais compatible sans aucune information", () => {
    const e = evaluate(facts({}), electrique);
    expect(e.statut).toBe("a_confirmer");
    expect(e.aConfirmer.map((c) => c.id)).toEqual(["entree", "largeur"]);
    expect(e.questions.length).toBeGreaterThan(0);
  });

  it("reste à confirmer quand seul l'avis global dit oui : la largeur de porte manque", () => {
    const e = evaluate(facts({}, { acces: "oui" }), electrique);
    expect(e.statut).toBe("a_confirmer");
    expect(e.aConfirmer.map((c) => c.id)).toEqual(["largeur"]);
  });

  it("est incompatible quand l'avis global dit non", () => {
    expect(evaluate(facts({}, { acces: "non" }), electrique).statut).toBe("incompatible");
  });

  it("est incompatible avec des marches sans rampe", () => {
    const e = evaluate(
      facts({ entree_plain_pied: false, entree_marches: 3, entree_rampe: "aucune", entree_largeur: 90 }),
      electrique,
    );
    expect(e.statut).toBe("incompatible");
    expect(e.bloquants[0].detail).toContain("3 marches");
  });

  it("accepte une rampe fixe ou amovible", () => {
    for (const rampe of ["fixe", "amovible"]) {
      const e = evaluate(
        facts({ entree_plain_pied: false, entree_marches: 2, entree_rampe: rampe, entree_largeur: 90 }),
        electrique,
      );
      expect(e.exigences.find((c) => c.id === "entree")?.resultat).toBe("ok");
    }
  });

  it("accepte une marche seulement si le profil le permet", () => {
    const f = facts({ entree_plain_pied: false, entree_marches: 1, entree_largeur: 90, accueil_plain_pied: true });
    expect(evaluate(f, manuel).statut).toBe("compatible");
    expect(evaluate(f, electrique).statut).toBe("incompatible");
  });

  it("compare la porte à la largeur du fauteuil plus la marge", () => {
    const porte = (largeur: number) => facts({ ...RESTAURANT_OK, entree_largeur: largeur });
    expect(evaluate(porte(75), electrique).statut).toBe("compatible");
    expect(evaluate(porte(74), electrique).statut).toBe("incompatible");
    expect(evaluate(porte(74), manuel).statut).toBe("compatible");
  });

  it("passe en « à confirmer » quand les sources divergent sur l'accès", () => {
    const e = evaluate(facts(RESTAURANT_OK, { acces: "divergent" }), electrique);
    expect(e.statut).toBe("a_confirmer");
    expect(e.aConfirmer[0].resultat).toBe("divergent");
  });

  it("bloque sur des marches à l'intérieur, mais pas sur une circulation inconnue", () => {
    const base = { entree_plain_pied: true, entree_largeur: 90 };
    expect(evaluate(facts({ ...base, accueil_plain_pied: false }), electrique).statut).toBe("incompatible");
    expect(evaluate(facts({ ...base, accueil_plain_pied: false, accueil_ascenseur: true }), electrique).statut).toBe("compatible");
    const inconnu = evaluate(facts(base), electrique);
    expect(inconnu.statut).toBe("compatible");
    expect(inconnu.attention.map((c) => c.id)).toContain("interieur");
  });

  it("traite toilettes et stationnement comme des points d'attention", () => {
    const e = evaluate(facts({ ...RESTAURANT_OK, wc_adaptes: false, stationnement_pmr: false }), electrique);
    expect(e.statut).toBe("compatible");
    expect(e.attention.map((c) => c.id)).toEqual(["wc", "stationnement"]);
    expect(evaluate(facts({ ...RESTAURANT_OK, stationnement_pmr: false }), manuel).attention.map((c) => c.id)).toEqual(["wc"]);
  });
});

describe("hébergements", () => {
  const heb = (values: Record<string, CriterionScalar>) => facts(values, { categorie: "hebergement" });

  it("est compatible quand la chambre et la salle de bain sont entièrement décrites", () => {
    expect(evaluate(heb(CHAMBRE_OK), levePersonne).statut).toBe("compatible");
  });

  it("reste à confirmer tant que la chambre n'est pas décrite", () => {
    const e = evaluate(heb(RESTAURANT_OK), electrique);
    expect(e.statut).toBe("a_confirmer");
    expect(e.aConfirmer.map((c) => c.id)).toEqual(["chambre", "chambre_porte", "rotation", "douche", "wc_transfert"]);
  });

  it("exige l'espace sous le lit seulement pour un transfert au lève-personne", () => {
    const sansEspace = heb({ ...CHAMBRE_OK, lit_espace_dessous: false });
    expect(evaluate(sansEspace, levePersonne).statut).toBe("incompatible");
    expect(evaluate(sansEspace, electrique).statut).toBe("compatible");
  });

  it("exige un lève-personne sur place seulement si on n'apporte pas le sien", () => {
    const surPlace = { ...levePersonne, levePersonne: "sur_place" as const };
    expect(evaluate(heb(CHAMBRE_OK), surPlace).statut).toBe("a_confirmer");
    expect(evaluate(heb({ ...CHAMBRE_OK, leve_personne: "location" }), surPlace).statut).toBe("compatible");
    expect(evaluate(heb({ ...CHAMBRE_OK, leve_personne: "non" }), surPlace).statut).toBe("incompatible");
  });

  it("est incompatible sans chambre accessible ou avec une douche à ressaut", () => {
    expect(evaluate(heb({ ...CHAMBRE_OK, chambres_accessibles: 0 }), electrique).statut).toBe("incompatible");
    expect(evaluate(heb({ ...CHAMBRE_OK, douche_plain_pied: false }), electrique).statut).toBe("incompatible");
  });

  it("n'exige pas la douche de plain-pied si le profil ne la demande pas", () => {
    const profil = { ...electrique, douchePlainPied: false };
    expect(evaluate(heb({ ...CHAMBRE_OK, douche_plain_pied: false }), profil).statut).toBe("compatible");
  });
});

describe("équipements", () => {
  it("juge des toilettes sur leur seul caractère adapté", () => {
    const wc = (values: Record<string, CriterionScalar>, acces: AccessStatus = "inconnu") =>
      evaluate(facts(values, { categorie: "toilettes", acces }), electrique).statut;
    expect(wc({ wc_adaptes: true })).toBe("compatible");
    expect(wc({ wc_adaptes: false })).toBe("incompatible");
    expect(wc({})).toBe("a_confirmer");
    expect(wc({}, "oui")).toBe("compatible");
  });
});

describe("tri et résumé", () => {
  it("classe compatible, puis à confirmer, puis incompatible", () => {
    const ok = evaluate(facts(RESTAURANT_OK), electrique);
    const flou = evaluate(facts({}), electrique);
    const non = evaluate(facts({}, { acces: "non" }), electrique);
    expect([non, flou, ok].sort(compareEvaluations).map((e) => e.statut)).toEqual([
      "compatible",
      "a_confirmer",
      "incompatible",
    ]);
  });

  it("classe d'abord le lieu qui a le moins d'inconnues", () => {
    const une = evaluate(facts({}, { acces: "oui" }), electrique);
    const deux = evaluate(facts({}), electrique);
    expect(compareEvaluations(une, deux)).toBeLessThan(0);
  });

  it("résume en donnant la première raison", () => {
    expect(summarize(evaluate(facts({}, { acces: "non" }), electrique))).toContain("Non accessible");
    expect(summarize(evaluate(facts(RESTAURANT_OK), manuel))).toContain("Toutes les exigences");
  });
});

describe("faits compacts de la couche carte", () => {
  const crit = (valeur: CriterionScalar, divergent = false): CriterionValue => ({
    valeur,
    preuve: divergent ? "divergent" : "declare",
    source: "acceslibre",
    date: null,
    dateType: "export",
    aReconfirmer: false,
    sources: [],
  });
  const place: Place = {
    id: "x",
    slug: "x",
    nom: "Test",
    categorie: "hebergement",
    activite: null,
    adresse: null,
    codePostal: null,
    commune: null,
    lat: 43.4,
    lng: 3.7,
    siteWeb: null,
    acces: "oui",
    accesPreuve: "declare",
    note: null,
    sources: [],
    criteres: {
      entree_plain_pied: crit(true),
      entree_largeur: crit(80),
      entree_rampe: crit("fixe"),
      chambres_accessibles: crit(0),
      wc_adaptes: crit(true, true),
    },
  };

  it("donne la même évaluation depuis la fiche et depuis les propriétés compactes", () => {
    const feature = { id: "x", n: "Test", c: place.categorie, a: place.acces, p: place.accesPreuve, s: 1, co: null, ...encodeFacts(place) };
    expect(feature.f).toEqual({ ep: 1, el: 80, er: "fixe", ca: 0 });
    expect(feature.dv).toEqual(["wa"]);
    for (const profil of Object.values(PRESETS)) {
      expect(evaluate(factsFromFeature(feature), profil)).toEqual(evaluate(factsFromPlace(place), profil));
    }
  });
});

describe("sanitizeProfile", () => {
  it("rejette ce qui n'est pas un profil", () => {
    expect(sanitizeProfile(null)).toBeNull();
    expect(sanitizeProfile({ version: 2 })).toBeNull();
  });

  it("borne la largeur et complète les champs manquants", () => {
    const p = sanitizeProfile({ version: 1, largeurFauteuil: 300, fauteuil: "manuel" });
    expect(p?.largeurFauteuil).toBe(90);
    expect(p?.fauteuil).toBe("manuel");
    expect(p?.nom).toBe("Mon profil");
  });
});
