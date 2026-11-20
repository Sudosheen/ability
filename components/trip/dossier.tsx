"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { LogoFull } from "@/components/ability/brand";
import { CompatibilityPill } from "@/components/ability/status";
import { Button } from "@/components/ui/button";
import { getPlace } from "@/lib/data";
import { factsFromPlace } from "@/lib/facts";
import { aggregateProfile, emptyGroup, roomsNeeded } from "@/lib/group";
import { CATEGORY_SINGULAR } from "@/lib/labels";
import { evaluate, summarize, type Evaluation } from "@/lib/matching";
import { describeProfile } from "@/lib/profile";
import { dayLegs, formatLeg } from "@/lib/routing";
import { useGroup, useGroupTrip, useProfile, useTrip } from "@/lib/storage";
import { CRENEAU_LABELS, dayLabel, type TripStop } from "@/lib/trip";
import type { Place } from "@/lib/types";
import { BudgetSummary } from "./budget-panel";
import { RouteMap } from "./route-map";

const NUMEROS = [
  ["15", "SAMU, urgence médicale"],
  ["112", "Numéro d'urgence européen"],
  ["114", "Urgences par SMS, visio ou tchat, pour les personnes sourdes, malentendantes ou qui ne peuvent pas parler"],
  ["3237", "Pharmacie de garde (service payant)"],
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-2 border-b-2 border-ink-900 pb-1 text-2xl break-after-avoid">{children}</h2>;
}

function formatDay(iso: string | null) {
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : null;
}

/**
 * Dossier de séjour, pensé pour l'impression : une page HTML lisible à
 * l'écran, que le navigateur imprime ou enregistre en PDF balisé.
 */
export function Dossier() {
  const params = useSearchParams();
  const isGroup = params.get("groupe") === "1";
  const autoPrint = params.get("imprimer") === "1";
  const personal = useProfile();
  const group = useGroup();
  const personalTrip = useTrip();
  const groupTrip = useGroupTrip();
  const trip = isGroup ? groupTrip : personalTrip;
  const g = group ?? emptyGroup();
  const profile = isGroup ? aggregateProfile(g) : personal;
  const rooms = isGroup ? roomsNeeded(g) : 1;
  const [places, setPlaces] = useState<Map<string, Place>>(new Map());
  const printed = useRef(false);

  const stops = useMemo(() => (trip ? [...(trip.hebergement ? [trip.hebergement] : []), ...trip.programme.flat()] : []), [trip]);
  const ids = stops.map((s) => s.id).join(",");

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    Promise.all(ids.split(",").map((id) => getPlace(id))).then((list) => {
      if (cancelled) return;
      setPlaces(new Map(list.filter((p): p is Place => p !== null).map((p) => [p.id, p])));
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const ready = !ids || ids.split(",").every((id) => places.has(id));
  useEffect(() => {
    if (autoPrint && ready && trip && !printed.current) {
      printed.current = true;
      // Laisse le temps à la carte de se dessiner avant d'ouvrir l'impression.
      setTimeout(() => window.print(), 1500);
    }
  }, [autoPrint, ready, trip]);

  const evalOf = (s: TripStop): Evaluation | null => {
    const p = places.get(s.id);
    return p && profile ? evaluate(factsFromPlace(p), profile, { chambres: rooms }) : null;
  };

  if (!trip || !profile) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-ink-400 p-6">
        <h1 className="text-3xl">Dossier de séjour</h1>
        <p className="mt-2 text-ink-700">
          Aucun séjour n&apos;est encore préparé dans ce navigateur.{" "}
          <Link href={isGroup ? "/pro/" : "/sejour/"} className="font-bold underline underline-offset-4">
            Préparer un séjour
          </Link>
        </p>
      </div>
    );
  }

  // Budget : mêmes réglages que dans le parcours (personnes du groupe, chambres, lève-personne à louer).
  const fixed = isGroup ? { voyageurs: g.residents.length, accompagnants: g.accompagnants } : undefined;
  const levePersonne = profile.transfert === "leve_personne" && profile.levePersonne === "sur_place";

  const attention = stops
    .map((s) => ({ s, e: evalOf(s) }))
    .filter((x): x is { s: TripStop; e: Evaluation } => x.e !== null && x.e.statut !== "compatible");
  const du = formatDay(trip.du);
  const au = formatDay(trip.au);

  return (
    <article className="flex flex-col gap-6 print:gap-4 print:text-[11pt]">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold tracking-wide text-ink-600 uppercase">Dossier de séjour</p>
          <LogoFull className="w-32 print:w-28" />
        </div>
        <h1 className="text-4xl">
          {isGroup ? g.nom : "Mon séjour"}
          {trip.commune ? ` à ${trip.commune}` : ""}
        </h1>
        <p className="text-lg text-ink-700">
          {du && au ? `Du ${du} au ${au}` : `${trip.programme.length} jour${trip.programme.length > 1 ? "s" : ""}, dates à fixer`}
        </p>
        <p className="rounded-xl border-2 border-ink-900 p-3 text-sm">
          <strong>Maquette.</strong> Informations issues de données ouvertes non vérifiées sur place (Acceslibre,
          OpenStreetMap, Tourisme &amp; Handicap) ; les lieux marqués « lieu fictif » n&apos;existent pas. Confirmez
          chaque point auprès des établissements avant de partir. Document créé le{" "}
          {new Date().toLocaleDateString("fr-FR")}.
        </p>
        <div className="flex flex-wrap gap-3 print:hidden">
          <Button type="button" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimer ou enregistrer en PDF
          </Button>
          <Button asChild variant="outline">
            <Link href={isGroup ? "/pro/" : "/sejour/"}>Modifier le séjour</Link>
          </Button>
        </div>
        {!ready && <p role="status" className="text-ink-600 print:hidden">Chargement des fiches…</p>}
      </header>

      <section className="flex flex-col gap-2">
        <H2>{isGroup ? "Le groupe" : "Besoins du voyageur"}</H2>
        {isGroup ? (
          <>
            <p>
              {g.residents.length} résident{g.residents.length > 1 ? "s" : ""} en fauteuil, {g.accompagnants} accompagnant
              {g.accompagnants > 1 ? "s" : ""}. Chambres accessibles nécessaires : {rooms}.
            </p>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-ink-400">
                  <th scope="col" className="py-1 pr-3">Résident</th>
                  <th scope="col" className="py-1">Besoins</th>
                </tr>
              </thead>
              <tbody>
                {g.residents.map((r) => (
                  <tr key={r.code} className="border-b border-ink-200 align-top">
                    <th scope="row" className="py-1.5 pr-3 font-bold">{r.code}</th>
                    <td className="py-1.5">{describeProfile(r.profil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-ink-700">Besoins retenus pour le groupe : {describeProfile(profile)}.</p>
          </>
        ) : (
          <p>{describeProfile(profile)}.</p>
        )}
      </section>

      <section className="flex flex-col gap-2 break-inside-avoid">
        <H2>Hébergement</H2>
        {trip.hebergement ? (
          (() => {
            const p = places.get(trip.hebergement.id);
            const e = evalOf(trip.hebergement);
            return (
              <div className="flex flex-col gap-1.5">
                <p className="text-xl font-extrabold">{trip.hebergement.nom}</p>
                <p className="text-ink-700">
                  {p?.adresse ? `${p.adresse}, ` : ""}
                  {p?.codePostal ? `${p.codePostal} ` : ""}
                  {p?.commune ?? trip.hebergement.co ?? ""}
                </p>
                {p?.siteWeb && <p className="text-sm break-all">Site : {p.siteWeb}</p>}
                {e && (
                  <>
                    <CompatibilityPill status={e.statut} className="self-start" />
                    <p>{summarize(e)}</p>
                    <ul className="list-disc pl-6 text-sm">
                      {e.exigences.map((c) => (
                        <li key={c.id}>
                          <strong>{c.libelle}</strong> : {c.detail}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })()
        ) : (
          <p className="text-ink-700">Aucun hébergement choisi.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <H2>Programme</H2>
        {trip.programme.map((day, d) => {
          const legs = dayLegs(trip.hebergement, day);
          return (
            <div key={d} className="break-inside-avoid">
              <h3 className="text-lg">{dayLabel(trip, d)}</h3>
              {day.length === 0 ? (
                <p className="text-ink-700">Journée libre.</p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {day.map((s, i) => {
                    const p = places.get(s.id);
                    const e = evalOf(s);
                    const leg = legs[trip.hebergement ? i : i - 1];
                    return (
                      <li key={s.id} className="flex flex-col">
                        {leg && <span className="text-sm text-ink-600">↓ {formatLeg(leg)}</span>}
                        <span>
                          <strong>{CRENEAU_LABELS[s.creneau]} · {i + 1}. {s.nom}</strong>{" "}
                          <span className="text-ink-700">
                            ({CATEGORY_SINGULAR[s.c]}
                            {p?.adresse ? `, ${p.adresse}` : ""}
                            {s.co ? `, ${s.co}` : ""})
                          </span>
                        </span>
                        {e && (
                          <span className="text-sm">
                            {e.statut === "compatible" ? "Compatible" : e.statut === "a_confirmer" ? "À confirmer" : "Incompatible"} : {summarize(e)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {trip.hebergement && legs.at(-1) && <li className="text-sm text-ink-600">↓ Retour à l&apos;hébergement · {formatLeg(legs.at(-1)!)}</li>}
                </ol>
              )}
            </div>
          );
        })}
        <RouteMap trip={trip} className="break-inside-avoid" />
      </section>

      <section className="flex flex-col gap-2 break-inside-avoid">
        <H2>Budget</H2>
        <BudgetSummary trip={trip} fixed={fixed} rooms={isGroup ? rooms : undefined} levePersonne={levePersonne} />
      </section>

      <section className="flex flex-col gap-2">
        <H2>À confirmer avant de partir</H2>
        {attention.length === 0 ? (
          <p>Aucun point en suspens d&apos;après les données disponibles.</p>
        ) : (
          attention.map(({ s, e }) => (
            <div key={s.id} className="break-inside-avoid">
              <p className="font-extrabold">
                {s.nom} · {e.statut === "incompatible" ? "incompatible" : "à confirmer"}
              </p>
              {e.statut === "incompatible" && <p className="text-sm">{e.bloquants.map((c) => c.detail).join(" ")}</p>}
              {e.questions.length > 0 && (
                <ul className="list-[square] pl-6 text-sm">
                  {e.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2 break-inside-avoid">
        <H2>Numéros utiles</H2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {NUMEROS.map(([n, label]) => (
            <div key={n} className="contents">
              <dt className="font-extrabold">{n}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-ink-700">
          Location de matériel médical (lève-personne, lit médicalisé) : à réserver avant le départ auprès
          d&apos;une pharmacie ou d&apos;un prestataire proche de l&apos;hébergement.
        </p>
      </section>

      <section className="flex flex-col gap-2 break-inside-avoid">
        <H2>Avant le départ</H2>
        <ul className="flex flex-col gap-1">
          {[
            "Faire confirmer par écrit chaque point « à confirmer » ci-dessus",
            "Réserver le matériel nécessaire sur place (lève-personne, lit médicalisé, siège de douche)",
            "Chargeur du fauteuil électrique et adaptateurs",
            "Ordonnances, traitements et carte Vitale",
            "Carte mobilité inclusion (stationnement)",
            "Contacts des proches et des soignants",
            "Une solution de repli si l'hébergement ne convient pas à l'arrivée",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 inline-block size-4 shrink-0 rounded border-2 border-ink-900" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
