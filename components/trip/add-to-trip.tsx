"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tripStore, useTrip } from "@/lib/storage";
import { addStop, CRENEAU_LABELS, dayLabel, emptyTrip, type Creneau, type TripStop } from "@/lib/trip";
import type { Place } from "@/lib/types";

const select = "min-h-11 cursor-pointer rounded-full border border-input bg-white px-3 font-bold";

/** Ajoute un lieu au séjour en cours (particulier), ou le choisit comme hébergement. */
export function AddToTrip({ place }: { place: Place }) {
  const trip = useTrip();
  const current = trip ?? emptyTrip();
  const [day, setDay] = useState(0);
  const [creneau, setCreneau] = useState<Creneau>(place.categorie === "restauration" ? "midi" : "matin");
  const [message, setMessage] = useState("");

  if (place.categorie === "toilettes" || place.categorie === "stationnement") return null;

  const stop: TripStop = { id: place.id, nom: place.nom, c: place.categorie, lat: place.lat, lng: place.lng, co: place.commune, creneau };
  const withCommune = { ...current, commune: current.commune ?? place.commune };
  const save = (t: typeof current, ok: string) => setMessage(tripStore.save(t) ? ok : "Ce navigateur refuse l'enregistrement.");
  const isLodging = place.categorie === "hebergement";
  const chosen = current.hebergement?.id === place.id;
  const inProgram = current.programme.some((d) => d.some((s) => s.id === place.id));

  return (
    <section aria-labelledby={`sejour-${place.id}`} className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4">
      <h3 id={`sejour-${place.id}`} className="flex items-center gap-2 text-xl">
        <CalendarPlus aria-hidden="true" className="size-6" />
        Mon séjour
      </h3>
      {isLodging ? (
        <Button
          type="button"
          variant={chosen ? "dark" : "default"}
          className="self-start"
          aria-pressed={chosen}
          onClick={() => save({ ...withCommune, hebergement: { ...stop, creneau: "matin" } }, `${place.nom} est l'hébergement du séjour.`)}
        >
          {chosen && <Check aria-hidden="true" />}
          {chosen ? "Hébergement du séjour" : "Choisir comme hébergement"}
        </Button>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-ink-600">Jour</span>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={select}>
              {current.programme.map((_, i) => (
                <option key={i} value={i}>
                  {dayLabel(current, i)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-ink-600">Moment</span>
            <select value={creneau} onChange={(e) => setCreneau(e.target.value as Creneau)} className={select}>
              {(Object.keys(CRENEAU_LABELS) as Creneau[]).map((c) => (
                <option key={c} value={c}>
                  {CRENEAU_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={() => save(addStop(withCommune, day, stop), `${place.nom} ajouté au jour ${day + 1}.`)}>
            Ajouter au séjour
          </Button>
        </div>
      )}
      {inProgram && !message && <p className="text-sm text-ink-700">Ce lieu est déjà dans votre programme.</p>}
      <p role="status" className="text-sm font-bold empty:hidden">
        {message}
      </p>
      <Link href="/sejour/" className="self-start font-bold underline underline-offset-4">
        Voir mon séjour
      </Link>
    </section>
  );
}
