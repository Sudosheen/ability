import { describe, expect, it } from "vitest";
import { aggregateProfile, roomsNeeded, sanitizeGroup, type Group } from "../lib/group";
import { DEFAULT_OPTIONS, generateItinerary, type Candidate } from "../lib/itinerary";
import { evaluate } from "../lib/matching";
import { PRESETS } from "../lib/profile";
import { dayLegs, estimateLeg, haversineKm } from "../lib/routing";
import { addStop, daysBetween, emptyTrip, moveStop, moveStopToDay, removeStop, sanitizeTrip, setDayCount, type TripStop } from "../lib/trip";
import type { Facts } from "../lib/facts";

const BASE = { lat: 43.4, lng: 3.69 }; // Sète
const near = (dLat: number, dLng = 0) => ({ lat: BASE.lat + dLat, lng: BASE.lng + dLng });

function cand(id: string, c: Candidate["c"], pos: { lat: number; lng: number }, statut: Candidate["statut"] = "compatible", aConfirmer = 0): Candidate {
  return { id, nom: id, c, co: null, statut, aConfirmer, ...pos };
}

describe("estimations de trajet", () => {
  it("calcule une distance à vol d'oiseau plausible", () => {
    // Sète - Montpellier : environ 29 km à vol d'oiseau
    expect(haversineKm({ lat: 43.404, lng: 3.697 }, { lat: 43.611, lng: 3.877 })).toBeGreaterThan(25);
    expect(haversineKm({ lat: 43.404, lng: 3.697 }, { lat: 43.611, lng: 3.877 })).toBeLessThan(32);
  });

  it("choisit le fauteuil sous 2 km et le véhicule au-delà", () => {
    expect(estimateLeg(BASE, near(0.005)).mode).toBe("fauteuil");
    expect(estimateLeg(BASE, near(0.2)).mode).toBe("vehicule");
  });

  it("compte l'aller depuis l'hébergement et le retour", () => {
    expect(dayLegs(BASE, [near(0.01), near(0.02)])).toHaveLength(3);
    expect(dayLegs(null, [near(0.01), near(0.02)])).toHaveLength(1);
  });
});

describe("generateItinerary", () => {
  const options = { ...DEFAULT_OPTIONS, jours: 2 };

  it("propose matin, déjeuner et après-midi, sans répéter un lieu", () => {
    const list = [
      cand("musee", "activite", near(0.01)),
      cand("plage", "plage", near(0.02)),
      cand("parc", "activite", near(0.03)),
      cand("jardin", "activite", near(0.04)),
      cand("resto1", "restauration", near(0.011)),
      cand("resto2", "restauration", near(0.031)),
    ];
    const days = generateItinerary(BASE, list, options);
    expect(days).toHaveLength(2);
    expect(days[0].map((s) => s.creneau)).toEqual(["matin", "midi", "apres-midi"]);
    const ids = days.flat().map((s) => s.lieu?.id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("n'utilise jamais un lieu incompatible", () => {
    const days = generateItinerary(BASE, [cand("non", "activite", near(0.01), "incompatible")], options);
    expect(days.flat().every((s) => s.lieu === null)).toBe(true);
    expect(days[0][0].raison).toContain("Aucune activité");
  });

  it("préfère un lieu compatible à un lieu plus proche à confirmer", () => {
    const days = generateItinerary(
      BASE,
      [cand("proche", "activite", near(0.001), "a_confirmer", 1), cand("loin", "activite", near(0.05))],
      { ...options, jours: 1, activitesParJour: 1 },
    );
    expect(days[0][0].lieu?.id).toBe("loin");
  });

  it("cherche le déjeuner près de l'activité du matin, dans le rayon choisi", () => {
    const days = generateItinerary(
      BASE,
      [cand("musee", "activite", near(0.1)), cand("resto-hebergement", "restauration", near(0.001)), cand("resto-musee", "restauration", near(0.101))],
      { ...options, jours: 1, activitesParJour: 1 },
    );
    expect(days[0][1].lieu?.id).toBe("resto-musee");
  });

  it("respecte le rythme d'une activité par jour", () => {
    const days = generateItinerary(BASE, [cand("a", "activite", near(0.01)), cand("b", "activite", near(0.02))], { ...options, activitesParJour: 1 });
    expect(days[0]).toHaveLength(2);
    expect(days[1][0].lieu?.id).toBe("b");
  });

  it("ignore les activités hors du rayon", () => {
    const days = generateItinerary(BASE, [cand("loin", "activite", near(1))], { ...options, jours: 1 });
    expect(days[0][0].lieu).toBeNull();
  });
});

describe("groupe", () => {
  const group: Group = {
    version: 1,
    nom: "FAM",
    residents: [
      { code: "R1", profil: PRESETS.manuel },
      { code: "R2", profil: { ...PRESETS["leve-personne"], largeurFauteuil: 72, levePersonne: "sur_place" } },
      { code: "R3", profil: PRESETS.electrique },
    ],
    accompagnants: 3,
  };

  it("retient l'exigence la plus stricte de chaque résident", () => {
    const p = aggregateProfile(group);
    expect(p.largeurFauteuil).toBe(72);
    expect(p.marche).toBe("aucune");
    expect(p.transfert).toBe("leve_personne");
    expect(p.levePersonne).toBe("sur_place");
    expect(p.stationnement).toBe(true);
  });

  it("demande une chambre accessible par résident", () => {
    expect(roomsNeeded(group)).toBe(3);
    const facts: Facts = {
      categorie: "hebergement",
      acces: "oui",
      value: (cle) => ({ chambres_accessibles: 2 } as Record<string, number>)[cle],
      divergent: () => false,
    };
    const e = evaluate(facts, PRESETS.manuel, { chambres: 3 });
    expect(e.statut).toBe("incompatible");
    expect(e.bloquants.find((c) => c.id === "chambre")?.detail).toContain("pour 3 nécessaires");
  });

  it("rejette un groupe illisible et nettoie les résidents", () => {
    expect(sanitizeGroup({ version: 2 })).toBeNull();
    const g = sanitizeGroup({ version: 1, residents: [{ code: "", profil: PRESETS.manuel }, { profil: null }], accompagnants: 99 });
    expect(g?.residents).toHaveLength(1);
    expect(g?.residents[0].code).toBe("R1");
    expect(g?.accompagnants).toBe(20);
  });
});

describe("séjour", () => {
  const stop = (id: string): TripStop => ({ id, nom: id, c: "activite", lat: 43.4, lng: 3.7, co: null, creneau: "matin" });

  it("calcule la durée d'après les dates, bornée à 7 jours", () => {
    expect(daysBetween("2027-03-01", "2027-03-03")).toBe(3);
    expect(daysBetween("2027-03-01", "2027-03-30")).toBe(7);
    expect(daysBetween("2027-03-03", "2027-03-01")).toBeNull();
    expect(daysBetween(null, "2027-03-01")).toBeNull();
  });

  it("ajoute, déplace et retire des étapes", () => {
    let t = emptyTrip(2);
    t = addStop(addStop(addStop(t, 0, stop("a")), 0, stop("b")), 0, stop("a"));
    expect(t.programme[0].map((s) => s.id)).toEqual(["a", "b"]);
    t = moveStop(t, 0, 1, -1);
    expect(t.programme[0].map((s) => s.id)).toEqual(["b", "a"]);
    t = moveStopToDay(t, 0, 0, 1);
    expect(t.programme.map((d) => d.map((s) => s.id))).toEqual([["a"], ["b"]]);
    t = removeStop(t, 1, 0);
    expect(t.programme[1]).toEqual([]);
  });

  it("garde les étapes des jours conservés quand on change la durée", () => {
    const t = setDayCount(addStop(emptyTrip(3), 0, stop("a")), 1);
    expect(t.programme).toHaveLength(1);
    expect(t.programme[0][0].id).toBe("a");
    expect(setDayCount(t, 99).programme).toHaveLength(7);
  });

  it("rejette un séjour illisible et écarte les étapes invalides", () => {
    expect(sanitizeTrip({ version: 1 })).toBeNull();
    const t = sanitizeTrip({ version: 1, du: "hier", programme: [[stop("a"), { id: "x" }]] });
    expect(t?.du).toBeNull();
    expect(t?.programme[0].map((s) => s.id)).toEqual(["a"]);
  });
});
