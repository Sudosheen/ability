import { describe, expect, it } from "vitest";
import { ancvPistes, EMPTY_ANSWERS } from "../lib/ancv";
import {
  DEFAULT_BUDGET,
  acceptsChequesVacances,
  activityAllowance,
  activityCost,
  envelope,
  estimateTrip,
  sanitizeBudget,
  simulatedOffer,
  type Offer,
} from "../lib/budget";
import { emptyTrip, sanitizeTrip, type TripStop } from "../lib/trip";

const offer = (o: Partial<Offer>): Offer => ({ prix: null, tarifAccompagnant: null, nuitEstimee: null, chequesVacances: "oui", simule: true, ...o });
const stop = (id: string, c: TripStop["c"] = "activite"): TripStop => ({ id, nom: id, c, lat: 43.4, lng: 3.69, co: null, creneau: "matin" });

describe("budget de l'itinéraire", () => {
  const settings = { ...DEFAULT_BUDGET, voyageurs: 1, accompagnants: 1 };

  it("compte le tarif accompagnant", () => {
    expect(activityCost(offer({ prix: 10, tarifAccompagnant: "gratuit" }), settings)).toBe(10);
    expect(activityCost(offer({ prix: 10, tarifAccompagnant: "reduit" }), settings)).toBe(15);
    expect(activityCost(offer({ prix: 10, tarifAccompagnant: "plein" }), settings)).toBe(20);
  });

  it("convertit un budget par personne en enveloppe totale", () => {
    expect(envelope({ ...settings, montant: 300, portee: "personne" })).toBe(600);
    expect(envelope({ ...settings, montant: 300, portee: "sejour" })).toBe(300);
    expect(envelope(settings)).toBeNull();
  });

  it("sépare les prix réels des estimations", () => {
    const trip = { ...emptyTrip(2), programme: [[stop("musee")], []] };
    const offerOf = (id: string) => (id === "musee" ? offer({ prix: 12, tarifAccompagnant: "gratuit" }) : offer({ nuitEstimee: 100 }));
    const e = estimateTrip(trip, settings, { offerOf });
    expect(e.reel).toBe(12);
    // 1 nuit × 1 chambre × 85 € (pas d'hébergement choisi) + 2 jours × 2 personnes × 35 €
    expect(e.estime).toBe(85 + 140);
    expect(e.lignes.find((l) => l.poste === "activites")?.nature).toBe("reel");
    expect(e.lignes.find((l) => l.poste === "hebergement")?.nature).toBe("estime");
    expect(e.bas).toBeLessThan(e.total);
    expect(e.haut).toBeGreaterThan(e.total);
    expect(e.statut).toBe("sans_plafond");
  });

  it("dit si l'itinéraire tient dans l'enveloppe", () => {
    const trip = emptyTrip(2);
    const offerOf = () => offer({});
    expect(estimateTrip(trip, { ...settings, montant: 1000 }, { offerOf }).statut).toBe("dans_budget");
    expect(estimateTrip(trip, { ...settings, montant: 100 }, { offerOf }).statut).toBe("depasse");
  });

  it("laisse aux activités ce qui reste après l'hébergement et les repas", () => {
    const trip = emptyTrip(2);
    expect(activityAllowance(trip, { ...settings, montant: 300 }, { offerOf: () => offer({}) })).toBe(300 - 225);
    expect(activityAllowance(trip, { ...settings, montant: 100 }, { offerOf: () => offer({}) })).toBe(0);
    expect(activityAllowance(trip, settings, { offerOf: () => offer({}) })).toBeNull();
  });

  it("compte la location de lève-personne comme un prix réel", () => {
    const e = estimateTrip(emptyTrip(3), settings, { offerOf: () => offer({}), levePersonne: true });
    expect(e.lignes.find((l) => l.poste === "materiel")).toMatchObject({ nature: "reel", montant: 36 });
  });
});

describe("Chèques-Vacances", () => {
  it("n'accepte pas un prestataire dont on ne sait rien", () => {
    expect(acceptsChequesVacances(offer({ chequesVacances: "oui" }))).toBe(true);
    expect(acceptsChequesVacances(offer({ chequesVacances: "sans_objet" }))).toBe(true);
    expect(acceptsChequesVacances(offer({ chequesVacances: "inconnu" }))).toBe(false);
    expect(acceptsChequesVacances(offer({ chequesVacances: "non" }))).toBe(false);
  });

  it("simule toujours la même offre pour un même lieu, et gratuite pour une plage", () => {
    expect(simulatedOffer("abc", "activite")).toEqual(simulatedOffer("abc", "activite"));
    expect(simulatedOffer("abc", "plage")).toMatchObject({ prix: 0, chequesVacances: "sans_objet" });
  });

  it("oriente vers une structure partenaire pour les aides ANCV", () => {
    expect(ancvPistes(EMPTY_ANSWERS)).toEqual([]);
    expect(ancvPistes({ ...EMPTY_ANSWERS, ressourcesModestes: true }).map((p) => p.id)).toEqual(["apv-relais"]);
    expect(ancvPistes({ ...EMPTY_ANSWERS, ressourcesModestes: true, structure: true }).map((p) => p.id)).toEqual(["apv"]);
  });
});

describe("réglages de budget enregistrés", () => {
  it("se relisent depuis le navigateur", () => {
    expect(sanitizeBudget({ montant: "800", portee: "personne", voyageurs: 2, accompagnants: 99, chequesVacances: true })).toEqual({
      montant: 800,
      portee: "personne",
      voyageurs: 2,
      accompagnants: 20,
      chequesVacances: true,
    });
    expect(sanitizeTrip({ version: 1, programme: [[]] })?.budget).toBeNull();
  });
});
