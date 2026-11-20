import { describe, expect, it } from "vitest";
import type { PlaceFeature } from "../lib/data";
import { evaluate } from "../lib/matching";
import { PRESETS } from "../lib/profile";
import { factsFromFeature } from "../lib/facts";
import {
  boundsRadiusKm,
  countAccess,
  countCompat,
  formatDistance,
  inBounds,
  matchesFilters,
  nearestPoint,
  resultsAround,
  sortResults,
  sourceCount,
  type Result,
} from "../lib/search";
import type { AccessStatus, PlaceFeatureProps, ProofLevel } from "../lib/types";

const SETE = { lat: 43.4, lng: 3.69 };

function feature(id: string, dLat: number, props: Partial<PlaceFeatureProps> = {}): PlaceFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [SETE.lng, SETE.lat + dLat] },
    properties: { id, n: id, c: "hebergement", a: "inconnu", p: "inconnu", s: 1, co: "Sète", ...props },
  };
}

const access = (a: AccessStatus, p: ProofLevel) => ({ a, p });

describe("resultsAround", () => {
  it("garde les lieux dans le rayon, avec leur distance", () => {
    const list = [feature("pres", 0.01), feature("loin", 0.5)];
    const r = resultsAround(list, SETE, 5, null);
    expect(r.map((x) => x.feature.properties.id)).toEqual(["pres"]);
    expect(r[0].km).toBeGreaterThan(1);
    expect(r[0].km).toBeLessThan(1.2);
    expect(r[0].evaluation).toBeNull();
  });
});

describe("sortResults", () => {
  const withEval = (f: PlaceFeature, km: number): Result => ({
    feature: f,
    evaluation: evaluate(factsFromFeature(f.properties), PRESETS.electrique),
    km,
  });

  it("classe par compatibilité, puis par distance", () => {
    const compatible = feature("compatible", 0, {
      ...access("oui", "verifie"),
      f: { ep: 1, el: 90, ap: 1, ca: 1, cl: 90, cr: 1, dp: 1, wt: 1 },
    });
    const flou = feature("flou", 0);
    const non = feature("non", 0, access("non", "declare"));
    const sorted = sortResults([withEval(non, 1), withEval(flou, 2), withEval(compatible, 3)], "compatible");
    expect(sorted.map((r) => r.feature.properties.id)).toEqual(["compatible", "flou", "non"]);
  });

  it("classe par niveau de preuve, puis par nombre de sources", () => {
    const r = (id: string, a: AccessStatus, p: ProofLevel, s: number, km: number): Result => ({
      feature: feature(id, 0, { a, p, s }),
      evaluation: null,
      km,
    });
    const sorted = sortResults(
      [r("osm", "oui", "indicatif", 2, 1), r("label", "oui", "label", 4, 5), r("deux", "oui", "declare", 3, 9), r("un", "oui", "declare", 1, 2), r("inconnu", "inconnu", "inconnu", 1, 0)],
      "verifie",
    );
    expect(sorted.map((x) => x.feature.properties.id)).toEqual(["label", "deux", "un", "osm", "inconnu"]);
  });

  it("classe du plus proche au plus loin", () => {
    const r = (id: string, km: number): Result => ({ feature: feature(id, 0), evaluation: null, km });
    expect(sortResults([r("b", 3), r("a", 1), r("c", 2)], "proche").map((x) => x.feature.properties.id)).toEqual(["a", "c", "b"]);
  });
});

describe("filtres et comptes", () => {
  const r = (a: AccessStatus): Result => ({ feature: feature(a, 0, { a }), evaluation: null, km: 0 });

  it("filtre sur l'accessibilité selon les sources sans profil", () => {
    const filters = { compat: null, access: new Set<AccessStatus>(["oui"]) };
    expect(matchesFilters(r("oui"), filters)).toBe(true);
    expect(matchesFilters(r("non"), filters)).toBe(false);
  });

  it("compte par statut", () => {
    expect(countAccess([r("oui"), r("oui"), r("non")])).toMatchObject({ oui: 2, non: 1, inconnu: 0 });
    expect(countCompat([r("oui")])).toEqual({ compatible: 0, a_confirmer: 0, incompatible: 0 });
  });
});

describe("outils", () => {
  it("compte les sources", () => {
    expect(sourceCount(0)).toBe(0);
    expect(sourceCount(7)).toBe(3);
    expect(sourceCount(8)).toBe(1);
  });

  it("teste l'appartenance à une emprise et calcule son rayon", () => {
    const b: [number, number, number, number] = [3.6, 43.35, 3.8, 43.45];
    expect(inBounds(feature("x", 0), b)).toBe(true);
    expect(inBounds(feature("y", 0.2), b)).toBe(false);
    expect(boundsRadiusKm(b)).toBeGreaterThan(5);
    expect(boundsRadiusKm(b)).toBeLessThan(6);
  });

  it("trouve le marqueur le plus proche d'un clic, dans le rayon", () => {
    const pts = [
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 110, y: 104 },
      { id: "c", x: 300, y: 300 },
    ];
    expect(nearestPoint(pts, { x: 108, y: 103 }, 22)).toBe("b");
    expect(nearestPoint(pts, { x: 200, y: 200 }, 22)).toBeNull();
    expect(nearestPoint([], { x: 0, y: 0 }, 22)).toBeNull();
  });

  it("formate les distances", () => {
    expect(formatDistance(0.32)).toBe("300 m");
    expect(formatDistance(2.44)).toBe("2,4 km");
    expect(formatDistance(12.6)).toBe("13 km");
  });
});
