import { describe, expect, it } from "vitest";
import { CRITERIA_BY_KEY } from "../lib/criteria";
import { isStale, parseValue, resolveAccess, resolveCriterion, valuesConflict } from "../lib/merge";
import type { SourcedValue } from "../lib/types";

const NOW = new Date("2026-11-14T00:00:00Z");
const acces = CRITERIA_BY_KEY.acces_fauteuil;
const wc = CRITERIA_BY_KEY.wc_adaptes;
const largeur = CRITERIA_BY_KEY.entree_largeur;

const osm = (valeur: SourcedValue["valeur"], date = "2025-06-01"): SourcedValue => ({
  source: "osm",
  valeur,
  date,
  dateType: "modification",
});
const acceslibre = (valeur: SourcedValue["valeur"]): SourcedValue => ({
  source: "acceslibre",
  valeur,
  date: null,
  dateType: "export",
});
const th = (valeur: SourcedValue["valeur"]): SourcedValue => ({
  source: "th",
  valeur,
  date: "2020-12-15",
  dateType: "liste",
});

describe("parseValue", () => {
  it("convertit selon le type du critère", () => {
    expect(parseValue(wc, "true")).toBe(true);
    expect(parseValue(wc, "false")).toBe(false);
    expect(parseValue(largeur, "80")).toBe(80);
    expect(parseValue(acces, "partiel")).toBe("partiel");
  });

  it("rend null pour une valeur vide ou illisible", () => {
    expect(parseValue(wc, "")).toBeNull();
    expect(parseValue(wc, "peut-être")).toBeNull();
    expect(parseValue(largeur, "large")).toBeNull();
  });
});

describe("valuesConflict", () => {
  it("oppose oui et non, mais pas partiel", () => {
    expect(valuesConflict(acces, "oui", "non")).toBe(true);
    expect(valuesConflict(acces, "non", "oui")).toBe(true);
    expect(valuesConflict(acces, "oui", "partiel")).toBe(false);
    expect(valuesConflict(acces, "partiel", "non")).toBe(false);
  });

  it("tolère un petit écart de mesure", () => {
    expect(valuesConflict(largeur, 80, 83)).toBe(false);
    expect(valuesConflict(largeur, 80, 90)).toBe(true);
  });

  it("oppose deux booléens différents", () => {
    expect(valuesConflict(wc, true, false)).toBe(true);
    expect(valuesConflict(wc, true, true)).toBe(false);
  });
});

describe("isStale", () => {
  it("signale une information de plus de 24 mois", () => {
    expect(isStale("2024-11-01", "modification", NOW)).toBe(true);
    expect(isStale("2025-01-01", "verification", NOW)).toBe(false);
  });

  it("ne tient pas compte de la date d'un simple export", () => {
    expect(isStale("2019-01-01", "export", NOW)).toBe(false);
    expect(isStale(null, null, NOW)).toBe(false);
  });
});

describe("resolveCriterion", () => {
  it("rend « inconnu » sans aucune source", () => {
    const c = resolveCriterion(acces, [], NOW);
    expect(c.valeur).toBeNull();
    expect(c.preuve).toBe("inconnu");
  });

  it("affiche la valeur de la source la plus fiable et garde toutes les sources", () => {
    const c = resolveCriterion(acces, [osm("partiel"), acceslibre("oui")], NOW);
    expect(c.valeur).toBe("oui");
    expect(c.source).toBe("acceslibre");
    expect(c.preuve).toBe("declare");
    expect(c.sources.map((s) => s.source)).toEqual(["acceslibre", "osm"]);
  });

  it("donne le niveau « indicatif » à OpenStreetMap seul", () => {
    expect(resolveCriterion(acces, [osm("oui")], NOW).preuve).toBe("indicatif");
  });

  it("donne le niveau « label » à Tourisme & Handicap, à reconfirmer après 24 mois", () => {
    const c = resolveCriterion(acces, [osm("oui"), th("oui")], NOW);
    expect(c.preuve).toBe("label");
    expect(c.source).toBe("th");
    expect(c.aReconfirmer).toBe(true);
  });

  it("marque le critère « divergent » quand deux sources se contredisent", () => {
    const c = resolveCriterion(acces, [osm("non"), acceslibre("oui")], NOW);
    expect(c.preuve).toBe("divergent");
    expect(c.valeur).toBe("oui");
    expect(c.sources).toHaveLength(2);
  });

  it("détecte une divergence entre deux sources moins prioritaires", () => {
    const c = resolveCriterion(acces, [th("oui"), acceslibre("oui"), osm("non")], NOW);
    expect(c.preuve).toBe("divergent");
  });

  it("ne date pas une valeur Acceslibre (export non daté)", () => {
    const c = resolveCriterion(wc, [acceslibre(true)], NOW);
    expect(c.date).toBeNull();
    expect(c.aReconfirmer).toBe(false);
  });
});

describe("resolveAccess", () => {
  it("rend « inconnu » sans critère d'accès", () => {
    expect(resolveAccess(undefined)).toEqual({ acces: "inconnu", preuve: "inconnu" });
  });

  it("ne rend jamais « oui » quand les sources divergent", () => {
    const c = resolveCriterion(acces, [osm("non"), acceslibre("oui")], NOW);
    expect(resolveAccess(c)).toEqual({ acces: "divergent", preuve: "divergent" });
  });

  it("reprend la valeur et le niveau de preuve du critère", () => {
    const c = resolveCriterion(acces, [osm("partiel")], NOW);
    expect(resolveAccess(c)).toEqual({ acces: "partiel", preuve: "indicatif" });
  });
});
