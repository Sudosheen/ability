"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, RotateCcw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { featureToStop } from "@/components/trip/use-candidates";
import { getLayer, type PlaceFeature } from "@/lib/data";
import { factsFromFeature } from "@/lib/facts";
import { aggregateProfile, roomsNeeded, type Group } from "@/lib/group";
import { DEFAULT_OPTIONS, generateItinerary } from "@/lib/itinerary";
import { evaluate } from "@/lib/matching";
import { describeProfile, PRESETS, type NeedsProfile } from "@/lib/profile";
import { readSignals, resetAll, type Signal } from "@/lib/signals";
import { groupStore, groupTripStore, profileStore, tripStore } from "@/lib/storage";
import { emptyTrip, setDayCount, type Trip } from "@/lib/trip";

// Personas fictifs : aucune donnée réelle.
const SAMIA: NeedsProfile = { ...PRESETS["leve-personne"], nom: "Samia (persona fictif)", largeurFauteuil: 68, levePersonne: "apporte" };

const OLIVIERS: Group = {
  version: 1,
  nom: "FAM Les Oliviers (fictif)",
  residents: [
    { code: "R1", profil: PRESETS.electrique },
    { code: "R2", profil: { ...PRESETS["leve-personne"], largeurFauteuil: 70 } },
    { code: "R3", profil: PRESETS.manuel },
    { code: "R4", profil: PRESETS.electrique },
    { code: "R5", profil: { ...PRESETS.manuel, largeurFauteuil: 62 } },
  ],
  accompagnants: 3,
};

type Persona = {
  id: "samia" | "oliviers";
  titre: string;
  resume: string;
  tache: string;
  commune: string;
  jours: number;
  hebergement: string;
  depart: string;
};

const PERSONAS: Persona[] = [
  {
    id: "samia",
    titre: "Samia, en fauteuil électrique",
    resume: describeProfile(SAMIA),
    tache: "Préparez un séjour de 3 jours à Sète pour Samia.",
    commune: "Sète",
    jours: 3,
    hebergement: "Hôtel Les Dunes (lieu fictif)",
    depart: "/sejour/",
  },
  {
    id: "oliviers",
    titre: "FAM Les Oliviers, séjour de groupe",
    resume: `5 résidents en fauteuil (dont un transféré au lève-personne), 3 accompagnants. Besoins du groupe : ${describeProfile(aggregateProfile(OLIVIERS))}.`,
    tache: "Préparez un séjour de 4 jours au bord de la mer pour le groupe.",
    commune: "La Grande-Motte",
    jours: 4,
    hebergement: "Centre de séjour La Pinède (lieu fictif)",
    depart: "/pro/",
  },
];

const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

/**
 * Page de l'enquêteur : choisir un persona, partir de zéro ou d'un séjour déjà
 * préparé, et tout réinitialiser entre deux entretiens.
 */
export function DemoPanel() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Lecture au montage seulement : les signaux sont écrits sur les autres pages.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSignals(readSignals());
  }, []);

  const load = async (p: Persona, prepared: boolean) => {
    setBusy(true);
    resetAll();
    const profile = p.id === "samia" ? SAMIA : aggregateProfile(OLIVIERS);
    const rooms = p.id === "samia" ? 1 : roomsNeeded(OLIVIERS);
    let trip: Trip = setDayCount({ ...emptyTrip(), commune: p.commune }, p.jours);

    if (prepared) {
      try {
        const features = await getLayer("places");
        const lodging = features.find((f) => f.properties.n === p.hebergement);
        if (lodging) {
          const base = featureToStop(lodging, "matin");
          const candidates = features.map((f: PlaceFeature) => {
            const e = evaluate(factsFromFeature(f.properties), profile, { chambres: rooms });
            return { id: f.properties.id, nom: f.properties.n, c: f.properties.c, co: f.properties.co, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], statut: e.statut, aConfirmer: e.aConfirmer.length };
          });
          const byId = new Map(features.map((f) => [f.properties.id, f]));
          const plan = generateItinerary(base, candidates, { ...DEFAULT_OPTIONS, jours: p.jours });
          trip = { ...trip, hebergement: base, programme: plan.map((d) => d.flatMap((s) => (s.lieu ? [featureToStop(byId.get(s.lieu.id)!, s.creneau)] : []))) };
        }
      } catch {
        setMessage("Les lieux n'ont pas pu être chargés : le séjour part de zéro.");
      }
    }

    if (p.id === "samia") {
      profileStore.save(SAMIA);
      tripStore.save(trip);
    } else {
      groupStore.save(OLIVIERS);
      groupTripStore.save(trip);
    }
    router.push(p.depart);
  };

  const counts = signals.reduce<Record<string, number>>((acc, s) => {
    const k = `${s.type} · ${s.detail}`;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="titre-personas" className="flex flex-col gap-4">
        <h2 id="titre-personas" className="text-2xl">Choisir un persona</h2>
        <p className="text-ink-700">
          Chaque choix efface d&apos;abord les données de la démonstration précédente. Personas et lieux d&apos;hébergement
          suggérés sont fictifs.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {PERSONAS.map((p) => {
            const Icon = p.id === "samia" ? User : Building2;
            return (
              <article key={p.id} className="flex flex-col gap-3 rounded-3xl border-2 border-ink-900 bg-white p-5">
                <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-sun-400">
                  <Icon className="size-6" />
                </span>
                <h3 className="text-xl">{p.titre}</h3>
                <p className="text-ink-700">{p.resume}</p>
                <p className="rounded-xl bg-butter-100 p-3">
                  <strong>Tâche à confier :</strong> {p.tache}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button type="button" disabled={busy} onClick={() => load(p, false)}>
                    Partir de zéro
                  </Button>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => load(p, true)}>
                    Séjour déjà préparé
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        <p role="status" className="font-bold empty:hidden">
          {message}
        </p>
      </section>

      <section aria-labelledby="titre-reset" className="flex flex-col gap-3 rounded-3xl bg-butter-100 p-5">
        <h2 id="titre-reset" className="text-2xl">Entre deux entretiens</h2>
        <p className="text-ink-700">Efface le profil, le groupe, les séjours et les signaux notés dans ce navigateur.</p>
        <Button
          type="button"
          variant="dark"
          className="self-start"
          onClick={() => {
            resetAll();
            setSignals([]);
            setMessage("Tout est effacé : la démonstration repart d'un état propre.");
          }}
        >
          <RotateCcw aria-hidden="true" />
          Tout réinitialiser
        </Button>
      </section>

      <section aria-labelledby="titre-signaux" className="flex flex-col gap-3">
        <h2 id="titre-signaux" className="text-2xl">Signaux notés pendant cet entretien</h2>
        <p className="text-ink-700">
          Clics sur une offre de la page tarifs ou sur une fonction pas encore disponible. À reporter dans la grille
          d&apos;entretien avant de réinitialiser.
        </p>
        {signals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-400 p-4 text-ink-700">Aucun signal pour l&apos;instant.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1">
              {Object.entries(counts).map(([k, n]) => (
                <li key={k}>
                  <strong>{n} ×</strong> {k}
                </li>
              ))}
            </ul>
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center font-bold underline underline-offset-4">
                Détail chronologique ({signals.length})
              </summary>
              <ol className="flex flex-col gap-1 text-sm text-ink-700">
                {signals.map((s, i) => (
                  <li key={i}>
                    {fmt(s.at)} · {s.type} · {s.detail} · {s.page}
                  </li>
                ))}
              </ol>
            </details>
          </>
        )}
      </section>
    </div>
  );
}
