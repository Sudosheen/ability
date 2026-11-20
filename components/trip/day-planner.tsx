"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Car, Accessibility, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/ability/category-icon";
import { Button } from "@/components/ui/button";
import { dayLegs, formatLeg, type Leg } from "@/lib/routing";
import {
  CRENEAU_LABELS,
  dayLabel,
  moveStop,
  moveStopToDay,
  removeStop,
  type Trip,
} from "@/lib/trip";
import { OfferLine } from "./budget-panel";
import { DAY_COLORS } from "./route-map";

function LegLine({ leg, from }: { leg: Leg; from?: string }) {
  const Icon = leg.mode === "fauteuil" ? Accessibility : Car;
  return (
    <p className="flex items-center gap-2 py-1 pl-4 text-sm text-ink-600">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {from ? `${from} : ` : ""}
      {formatLeg(leg)}
    </p>
  );
}

/**
 * Programme jour par jour, modifiable au clavier : monter, descendre, changer
 * de jour, retirer. Les trajets entre étapes sont des estimations.
 */
export function DayPlanner({
  trip,
  onChange,
  lieuSuffix = "",
}: {
  trip: Trip;
  onChange: (trip: Trip) => void;
  /** Ajouté aux liens vers les fiches (par exemple « &groupe=1 »). */
  lieuSuffix?: string;
}) {
  const base = trip.hebergement;
  return (
    <ol className="flex flex-col gap-4">
      {trip.programme.map((day, d) => {
        const legs = dayLegs(base, day);
        const titleId = `jour-${d}`;
        return (
          <li key={d} aria-labelledby={titleId} className="rounded-2xl border border-ink-200 bg-white p-4">
            <h3 id={titleId} className="flex items-center gap-2 text-lg">
              <span aria-hidden="true" className="inline-block h-1.5 w-6 rounded" style={{ backgroundColor: DAY_COLORS[d % DAY_COLORS.length] }} />
              {dayLabel(trip, d)}
            </h3>
            {day.length === 0 ? (
              <p className="mt-2 text-ink-600">Journée libre. Ajoutez des lieux depuis la recherche ou la carte.</p>
            ) : (
              <ol className="mt-2 flex flex-col">
                {day.map((s, i) => (
                  <li key={s.id}>
                    {i === 0 && base && legs[0] && <LegLine leg={legs[0]} from="Depuis l'hébergement" />}
                    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-butter-50 p-2">
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: DAY_COLORS[d % DAY_COLORS.length] }}
                      >
                        {i + 1}
                      </span>
                      <CategoryIcon category={s.c} className="size-5 shrink-0" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-bold text-ink-600">{CRENEAU_LABELS[s.creneau]}</span>
                        <Link href={`/lieu/?id=${s.id}${lieuSuffix}`} className="font-extrabold underline underline-offset-4">
                          {s.nom}
                        </Link>
                        {s.co && <span className="text-sm text-ink-600">{s.co}</span>}
                      </span>
                      <span className="flex flex-wrap items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label={`Monter ${s.nom}`} disabled={i === 0} onClick={() => onChange(moveStop(trip, d, i, -1))}>
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Descendre ${s.nom}`} disabled={i === day.length - 1} onClick={() => onChange(moveStop(trip, d, i, 1))}>
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        {trip.programme.length > 1 && (
                          <select
                            aria-label={`Déplacer ${s.nom} vers un autre jour`}
                            value=""
                            onChange={(e) => onChange(moveStopToDay(trip, d, i, Number(e.target.value)))}
                            className="min-h-11 cursor-pointer rounded-full border border-input bg-white px-3 text-sm font-bold"
                          >
                            <option value="" disabled>
                              Changer de jour
                            </option>
                            {trip.programme.map((_, j) =>
                              j === d ? null : (
                                <option key={j} value={j}>
                                  Jour {j + 1}
                                </option>
                              ),
                            )}
                          </select>
                        )}
                        <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${s.nom}`} onClick={() => onChange(removeStop(trip, d, i))}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </span>
                    </div>
                    <OfferLine id={s.id} c={s.c} className="px-2 pt-1 pl-14" />
                    {legs[base ? i + 1 : i] && (i < day.length - 1 || base) && (
                      <LegLine leg={legs[base ? i + 1 : i]} from={i === day.length - 1 ? "Retour à l'hébergement" : undefined} />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );
}
