import { describe, expect, it } from "vitest";
import { blocVerdict, blocsFor, sanitizeCommunity, summarizePlaces, verdictProof, type Retour } from "../lib/community";

const TODAY = "2026-11-19";

function retour(auteur: string, blocs: Retour["blocs"], date = "2026-10-01", lieuId = "a"): Retour {
  return { id: `${auteur}-${date}`, lieuId, lieuNom: lieuId, categorie: "hebergement", commune: null, date, auteur, blocs, photo: false, commentaire: "" };
}

describe("verdicts de la communauté", () => {
  it("demande deux voyageurs différents pour confirmer", () => {
    expect(blocVerdict([retour("a", { chambre: "conforme" })], "chambre", TODAY).verdict).toBe("en_attente");
    expect(blocVerdict([retour("a", { chambre: "conforme" }), retour("b", { chambre: "conforme" })], "chambre", TODAY).verdict).toBe("confirme");
  });

  it("ne compte qu'une fois la même personne", () => {
    const list = [retour("a", { chambre: "conforme" }, "2026-09-01"), retour("a", { chambre: "conforme" }, "2026-10-01")];
    expect(blocVerdict(list, "chambre", TODAY).verdict).toBe("en_attente");
  });

  it("signale les avis contraires et les infirmations", () => {
    const contraire = [retour("a", { sanitaires: "conforme" }), retour("b", { sanitaires: "non_conforme" })];
    expect(blocVerdict(contraire, "sanitaires", TODAY).verdict).toBe("contraire");
    const infirme = [retour("a", { sanitaires: "non_conforme" }), retour("b", { sanitaires: "non_conforme" })];
    expect(blocVerdict(infirme, "sanitaires", TODAY).verdict).toBe("infirme");
  });

  it("ignore « pas vu » et les retours de plus de 24 mois", () => {
    const list = [retour("a", { chambre: "conforme" }, "2024-06-01"), retour("b", { chambre: "pas_vu" })];
    expect(blocVerdict(list, "chambre", TODAY).verdict).toBe("aucun");
  });

  it("traduit le verdict en niveau de preuve", () => {
    expect(verdictProof("confirme")).toBe("communaute");
    expect(verdictProof("contraire")).toBe("divergent");
    expect(verdictProof("en_attente")).toBeNull();
  });

  it("ne propose la chambre que pour les hébergements, jamais les métadonnées", () => {
    expect(blocsFor("hebergement").map((b) => b.id)).toContain("chambre");
    expect(blocsFor("restauration").map((b) => b.id)).not.toContain("chambre");
    expect(blocsFor("hebergement").map((b) => b.id)).not.toContain("metadonnees");
  });

  it("résume chaque lieu avec ses métadonnées", () => {
    const [s] = summarizePlaces([retour("a", { chambre: "conforme" }), retour("b", { chambre: "conforme" })], TODAY);
    expect(s.meta.verificateurs).toBe(2);
    expect(s.meta.confirmes).toBe(1);
    expect(s.meta.derniere).toBe("2026-10-01");
  });

  it("nettoie les retours lus depuis le navigateur", () => {
    const data = sanitizeCommunity({ retours: [{ id: "x", lieuId: "a", date: "2026-10-01", blocs: { chambre: "conforme", faux: "oui" }, demo: true }, { id: "y" }] });
    expect(data?.retours).toHaveLength(1);
    expect(data?.retours[0].blocs).toEqual({ chambre: "conforme" });
    expect(data?.retours[0].demo).toBeUndefined();
  });
});
