"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { PlaceCard } from "@/components/ability/place-card";
import { Button } from "@/components/ui/button";
import { findCommune, type Commune } from "@/lib/data";
import { DEFAULT_OPTIONS, generateItinerary } from "@/lib/itinerary";
import { compareEvaluations } from "@/lib/matching";
import { haversineKm } from "@/lib/routing";
import { JOURS_MAX, JOURS_MIN, daysBetween, setDayCount, type Trip } from "@/lib/trip";
import { DayPlanner } from "./day-planner";
import { RouteMap } from "./route-map";
import { featureToStop, toCandidate, type Evaluated } from "./use-candidates";

const input = "min-h-11 w-full rounded-full border border-input bg-white px-4 font-bold";
const labelText = "text-sm font-bold text-ink-600";

/** Centre du séjour : l'hébergement s'il est choisi, sinon le centre de la commune. */
export function tripCenter(trip: Trip, communes: Commune[]) {
  if (trip.hebergement) return trip.hebergement;
  const c = trip.commune ? findCommune(communes, trip.commune) : null;
  return c ? { lat: c.lat, lng: c.lng } : null;
}

export function TripSettings({ trip, onChange, communes }: { trip: Trip; onChange: (t: Trip) => void; communes: Commune[] }) {
  const fromDates = daysBetween(trip.du, trip.au);
  const commune = trip.commune ? findCommune(communes, trip.commune) : null;
  const setDates = (du: string | null, au: string | null) => {
    const n = daysBetween(du, au);
    onChange(n ? setDayCount({ ...trip, du, au }, n) : { ...trip, du, au });
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className={labelText}>Destination (commune de l&apos;Hérault)</span>
        <input
          value={trip.commune ?? ""}
          onChange={(e) => onChange({ ...trip, commune: e.target.value || null })}
          list="communes-sejour"
          placeholder="Sète, Montpellier, Agde…"
          autoComplete="off"
          className={input}
        />
        <datalist id="communes-sejour">
          {communes.map((c) => (
            <option key={c.nom} value={c.nom} />
          ))}
        </datalist>
        <span className="text-sm text-ink-600" aria-live="polite">
          {trip.commune && !commune ? "Commune introuvable dans l'Hérault." : ""}
        </span>
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Arrivée</span>
        <input type="date" value={trip.du ?? ""} onChange={(e) => setDates(e.target.value || null, trip.au)} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Départ</span>
        <input type="date" value={trip.au ?? ""} min={trip.du ?? undefined} onChange={(e) => setDates(trip.du, e.target.value || null)} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Nombre de jours</span>
        <select
          value={trip.programme.length}
          disabled={fromDates !== null}
          onChange={(e) => onChange(setDayCount(trip, Number(e.target.value)))}
          className={`${input} cursor-pointer disabled:cursor-default disabled:opacity-70`}
          aria-describedby="jours-aide"
        >
          {Array.from({ length: JOURS_MAX - JOURS_MIN + 1 }, (_, i) => i + JOURS_MIN).map((n) => (
            <option key={n} value={n}>
              {n} jour{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <span id="jours-aide" className="text-sm text-ink-600">
          {fromDates !== null ? "Calculé d'après les dates." : `De ${JOURS_MIN} à ${JOURS_MAX} jours.`}
        </span>
      </label>
    </div>
  );
}

const RAYON_HEBERGEMENT_KM = 20;

export function LodgingPicker({
  trip,
  onChange,
  communes,
  evaluated,
  lieuSuffix = "",
  rooms = 1,
}: {
  trip: Trip;
  onChange: (t: Trip) => void;
  communes: Commune[];
  evaluated: Evaluated[] | null;
  lieuSuffix?: string;
  rooms?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const commune = trip.commune ? findCommune(communes, trip.commune) : null;

  if (!commune) {
    return <p className="text-ink-700">Indiquez d&apos;abord une destination pour voir les hébergements autour.</p>;
  }
  if (!evaluated) return <p role="status" className="text-ink-600">Chargement des hébergements…</p>;

  const around = evaluated
    .filter((e) => e.feature.properties.c === "hebergement")
    .map((e) => ({ ...e, km: haversineKm(commune, { lat: e.feature.geometry.coordinates[1], lng: e.feature.geometry.coordinates[0] }) }))
    .filter((e) => e.km <= RAYON_HEBERGEMENT_KM)
    .sort((a, b) => compareEvaluations(a.evaluation, b.evaluation) || a.km - b.km);
  const hidden = around.filter((e) => e.evaluation.statut === "incompatible").length;
  const shown = (showAll ? around : around.filter((e) => e.evaluation.statut !== "incompatible")).slice(0, 12);
  const compatibles = around.filter((e) => e.evaluation.statut === "compatible").length;

  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-ink-700">
        {around.length} hébergements à moins de {RAYON_HEBERGEMENT_KM} km de {commune.nom}
        {rooms > 1 ? `, pour ${rooms} chambres accessibles` : ""} : {compatibles} compatible{compatibles > 1 ? "s" : ""},{" "}
        {around.length - compatibles - hidden} à confirmer, {hidden} incompatible{hidden > 1 ? "s" : ""}.
      </p>
      {trip.hebergement && (
        <p className="flex items-center gap-2 rounded-2xl bg-ok-100 p-3 font-bold text-ok-700">
          <Check aria-hidden="true" className="size-5 shrink-0" />
          Hébergement choisi : {trip.hebergement.nom}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {shown.map(({ feature, evaluation }) => {
          const chosen = trip.hebergement?.id === feature.properties.id;
          return (
            <li key={feature.properties.id} className="flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-2">
              <PlaceCard place={feature.properties} evaluation={evaluation} className="border-0 p-1" />
              <div className="flex flex-wrap gap-2 px-1 pb-1">
                <Button
                  type="button"
                  size="sm"
                  variant={chosen ? "dark" : "default"}
                  aria-pressed={chosen}
                  onClick={() => onChange({ ...trip, hebergement: chosen ? null : featureToStop(feature, "matin") })}
                >
                  {chosen && <Check aria-hidden="true" />}
                  {chosen ? "Choisi" : "Choisir cet hébergement"}
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/lieu/?id=${feature.properties.id}${lieuSuffix}`}>Voir la fiche</Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <Button type="button" variant="link" className="self-start" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Masquer les hébergements incompatibles" : `Afficher aussi les ${hidden} hébergements incompatibles`}
        </Button>
      )}
    </div>
  );
}

export function ProgramEditor({
  trip,
  onChange,
  communes,
  evaluated,
  lieuSuffix = "",
}: {
  trip: Trip;
  onChange: (t: Trip) => void;
  communes: Commune[];
  evaluated: Evaluated[] | null;
  lieuSuffix?: string;
}) {
  const [rythme, setRythme] = useState<1 | 2>(DEFAULT_OPTIONS.activitesParJour);
  const [rayon, setRayon] = useState(DEFAULT_OPTIONS.rayonActiviteKm);
  const [message, setMessage] = useState("");
  const center = tripCenter(trip, communes);
  const filled = trip.programme.some((d) => d.length > 0);

  const generate = () => {
    if (!center || !evaluated) return;
    const plan = generateItinerary(center, evaluated.map(toCandidate), {
      ...DEFAULT_OPTIONS,
      jours: trip.programme.length,
      activitesParJour: rythme,
      rayonActiviteKm: rayon,
    });
    const byId = new Map(evaluated.map((e) => [e.feature.properties.id, e.feature]));
    const programme = plan.map((day) =>
      day.flatMap((s) => (s.lieu ? [featureToStop(byId.get(s.lieu.id)!, s.creneau)] : [])),
    );
    const manques = plan.flat().filter((s) => !s.lieu).length;
    onChange({ ...trip, programme });
    setMessage(
      `Programme proposé sur ${programme.length} jour${programme.length > 1 ? "s" : ""}.` +
        (manques ? ` ${manques} créneau${manques > 1 ? "x restent" : " reste"} libre${manques > 1 ? "s" : ""}, faute de lieu compatible ou à confirmer.` : "") +
        " Vérifiez les lieux « à confirmer » avant de réserver.",
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-butter-100 p-4">
        <h3 className="text-lg">Proposer un programme</h3>
        <p className="text-sm text-ink-700">
          Une activité le matin, un déjeuner tout près, une activité l&apos;après-midi. Jamais de lieu
          incompatible ; les lieux compatibles d&apos;abord.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelText}>Rythme</span>
            <select value={rythme} onChange={(e) => setRythme(Number(e.target.value) as 1 | 2)} className={`${input} cursor-pointer`}>
              <option value={2}>Deux activités par jour</option>
              <option value={1}>Une activité par jour (calme)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelText}>Distance maximale des activités</span>
            <select value={rayon} onChange={(e) => setRayon(Number(e.target.value))} className={`${input} cursor-pointer`}>
              {[5, 10, 25, 40].map((km) => (
                <option key={km} value={km}>
                  {km} km autour
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button type="button" className="self-start" disabled={!center || !evaluated} onClick={generate}>
          <Sparkles aria-hidden="true" />
          {filled ? "Proposer un nouveau programme" : "Proposer un programme"}
        </Button>
        {!center && <p className="text-sm text-ink-700">Indiquez une destination ou choisissez un hébergement.</p>}
        {filled && <p className="text-sm text-ink-600">Un nouveau programme remplace l&apos;actuel.</p>}
        <p role="status" className="text-sm font-bold text-ink-900 empty:hidden">
          {message}
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <DayPlanner trip={trip} onChange={onChange} lieuSuffix={lieuSuffix} />
        <RouteMap trip={trip} className="xl:sticky xl:top-4 xl:self-start" />
      </div>
    </div>
  );
}
