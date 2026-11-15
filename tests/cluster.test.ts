import { describe, expect, it } from "vitest";
import { buildClusters, type Candidate } from "../lib/cluster";

const A1 = "acceslibre:a1";
const A2 = "acceslibre:a2";
const O1 = "osm:node/1";
const O2 = "osm:node/2";
const T1 = "th:th-1";

const cand = (a: string, b: string, score: number): Candidate => ({ a, b, score, methode: "proximite" });

describe("buildClusters", () => {
  it("fusionne une paire au-dessus du seuil", () => {
    const r = buildClusters([A1, O1], [cand(A1, O1, 0.9)]);
    expect(r.clusterOf.get(A1)).toBe(r.clusterOf.get(O1));
    expect(r.fusionsAuto).toBe(1);
    expect(r.aVerifier).toHaveLength(0);
  });

  it("laisse séparées les fiches sans paire candidate", () => {
    const r = buildClusters([A1, O1], []);
    expect(r.clusterOf.get(A1)).not.toBe(r.clusterOf.get(O1));
  });

  it("envoie en revue une paire entre les deux seuils", () => {
    const r = buildClusters([A1, O1], [cand(A1, O1, 0.7)]);
    expect(r.clusterOf.get(A1)).not.toBe(r.clusterOf.get(O1));
    expect(r.aVerifier).toMatchObject([{ a: A1, b: O1, motif: "score" }]);
  });

  it("ignore une paire sous le seuil de revue", () => {
    const r = buildClusters([A1, O1], [cand(A1, O1, 0.55)]);
    expect(r.aVerifier).toHaveLength(0);
  });

  it("réunit trois sources par transitivité", () => {
    const r = buildClusters([A1, O1, T1], [cand(A1, O1, 0.95), cand(O1, T1, 0.9)]);
    expect(new Set([A1, O1, T1].map((k) => r.clusterOf.get(k))).size).toBe(1);
  });

  it("ne met jamais deux fiches d'une même source dans un lieu", () => {
    // Deux objets OpenStreetMap prétendent à la même fiche Acceslibre : le mieux noté gagne.
    const r = buildClusters([A1, O1, O2], [cand(A1, O1, 0.95), cand(A1, O2, 0.9)]);
    expect(r.clusterOf.get(A1)).toBe(r.clusterOf.get(O1));
    expect(r.clusterOf.get(O2)).not.toBe(r.clusterOf.get(A1));
    expect(r.aVerifier).toMatchObject([{ a: A1, b: O2, motif: "conflit" }]);
  });

  it("refuse une transitivité qui réunirait deux fiches d'une même source", () => {
    const r = buildClusters(
      [A1, A2, O1],
      [cand(A1, O1, 0.95), cand(A2, O1, 0.9)],
    );
    expect(r.clusterOf.get(A1)).not.toBe(r.clusterOf.get(A2));
  });

  it("applique une fusion forcée par overrides.json", () => {
    const r = buildClusters([A1, T1], [cand(A1, T1, 0.7)], {
      fusionner: [{ a: A1, b: T1, note: "même adresse" }],
      separer: [],
    });
    expect(r.clusterOf.get(A1)).toBe(r.clusterOf.get(T1));
    expect(r.fusionsForcees).toBe(1);
    expect(r.aVerifier).toHaveLength(0);
  });

  it("applique une séparation forcée, même pour une paire très bien notée", () => {
    const r = buildClusters([A1, O1], [cand(A1, O1, 0.99)], {
      fusionner: [],
      separer: [{ a: O1, b: A1 }],
    });
    expect(r.clusterOf.get(A1)).not.toBe(r.clusterOf.get(O1));
    expect(r.aVerifier).toHaveLength(0);
  });

  it("donne le même résultat quel que soit l'ordre des paires", () => {
    const c = [cand(A1, O1, 0.95), cand(A1, O2, 0.95), cand(O1, T1, 0.9)];
    const r1 = buildClusters([A1, O1, O2, T1], c);
    const r2 = buildClusters([T1, O2, O1, A1], [...c].reverse());
    expect([...r1.clusterOf].sort()).toEqual([...r2.clusterOf].sort());
  });

  it("retire de la revue une paire déjà réunie par un autre chemin", () => {
    const r = buildClusters(
      [A1, O1, T1],
      [cand(A1, O1, 0.95), cand(O1, T1, 0.95), cand(A1, T1, 0.7)],
    );
    expect(r.aVerifier).toHaveLength(0);
  });
});
