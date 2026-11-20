"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Plus, Printer, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { BudgetSettingsForm, BudgetSummary, PAYMENT_TITLE } from "@/components/trip/budget-panel";
import { FEATURES } from "@/lib/features";
import { LodgingPicker, ProgramEditor, TripSettings } from "@/components/trip/trip-sections";
import { useEvaluatedPlaces } from "@/components/trip/use-candidates";
import type { Commune } from "@/lib/data";
import { aggregateProfile, emptyGroup, RESIDENTS_MAX, roomsNeeded, type Group } from "@/lib/group";
import { describeProfile, LARGEUR_MAX, LARGEUR_MIN, PRESETS, type PresetId } from "@/lib/profile";
import { groupStore, groupTripStore, useGroup, useGroupTrip } from "@/lib/storage";
import { emptyTrip, type Trip } from "@/lib/trip";

const STEPS = ["Profil du groupe", FEATURES.budget ? "Destination, dates et budget" : "Destination et dates", "Hébergement", "Itinéraire", "Dossier"];
const input = "min-h-11 rounded-full border border-input bg-white px-4 font-bold";
const GROUP_SUFFIX = "&groupe=1";

function presetOf(nom: string): PresetId | "" {
  return (Object.keys(PRESETS) as PresetId[]).find((id) => PRESETS[id].nom === nom) ?? "";
}

function GroupStep({ group, onChange }: { group: Group; onChange: (g: Group) => void }) {
  const setResident = (i: number, patch: Partial<Group["residents"][number]>) =>
    onChange({ ...group, residents: group.residents.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const profil = aggregateProfile(group);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-ink-600">Nom du groupe</span>
          <input value={group.nom} onChange={(e) => onChange({ ...group, nom: e.target.value })} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-ink-600">Accompagnants</span>
          <input
            type="number"
            min={0}
            max={20}
            value={group.accompagnants}
            onChange={(e) => onChange({ ...group, accompagnants: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })}
            className={cn(input, "w-28")}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-extrabold">Résidents en fauteuil</legend>
        <p className="text-sm text-ink-700">
          Un code par personne (jamais le nom), et ses besoins fonctionnels. Aucune donnée médicale.
        </p>
        <ul className="flex flex-col gap-2">
          {group.residents.map((r, i) => (
            <li key={i} className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink-200 bg-white p-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-bold text-ink-600">Code</span>
                <input value={r.code} maxLength={12} onChange={(e) => setResident(i, { code: e.target.value })} className={cn(input, "w-24")} />
              </label>
              <label className="flex min-w-48 flex-1 flex-col gap-1">
                <span className="text-sm font-bold text-ink-600">Besoins</span>
                <select
                  value={presetOf(r.profil.nom)}
                  onChange={(e) => e.target.value && setResident(i, { profil: { ...PRESETS[e.target.value as PresetId], largeurFauteuil: r.profil.largeurFauteuil } })}
                  className={cn(input, "cursor-pointer")}
                >
                  {presetOf(r.profil.nom) === "" && <option value="">Profil personnalisé</option>}
                  {(Object.keys(PRESETS) as PresetId[]).map((id) => (
                    <option key={id} value={id}>
                      {PRESETS[id].nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-bold text-ink-600">Largeur (cm)</span>
                <input
                  type="number"
                  min={LARGEUR_MIN}
                  max={LARGEUR_MAX}
                  value={r.profil.largeurFauteuil}
                  onChange={(e) => setResident(i, { profil: { ...r.profil, largeurFauteuil: Math.max(LARGEUR_MIN, Math.min(LARGEUR_MAX, Number(e.target.value) || LARGEUR_MIN)) } })}
                  className={cn(input, "w-24")}
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Retirer le résident ${r.code}`}
                disabled={group.residents.length <= 1}
                onClick={() => onChange({ ...group, residents: group.residents.filter((_, j) => j !== i) })}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={group.residents.length >= RESIDENTS_MAX}
          onClick={() => onChange({ ...group, residents: [...group.residents, { code: `R${group.residents.length + 1}`, profil: PRESETS.electrique }] })}
        >
          <Plus aria-hidden="true" />
          Ajouter un résident
        </Button>
      </fieldset>

      <section aria-label="Besoins du groupe" className="rounded-2xl bg-butter-100 p-4">
        <p className="font-extrabold">Besoins retenus pour le groupe</p>
        <p className="text-ink-700">
          {describeProfile(profil)}, {roomsNeeded(group)} chambre{roomsNeeded(group) > 1 ? "s" : ""} accessible
          {roomsNeeded(group) > 1 ? "s" : ""}. Pour chaque critère, c&apos;est l&apos;exigence la plus stricte qui compte.
        </p>
      </section>
    </div>
  );
}

/**
 * Parcours des structures médico-sociales en cinq écrans : profil du groupe,
 * destination, hébergement, itinéraire, dossier.
 */
export function GroupWizard({ communes }: { communes: Commune[] }) {
  const group = useGroup() ?? emptyGroup();
  const trip = useGroupTrip() ?? emptyTrip();
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const profile = aggregateProfile(group);
  const rooms = roomsNeeded(group);
  const { evaluated, error } = useEvaluatedPlaces(profile, { chambres: rooms });
  const saveGroup = (g: Group) => groupStore.save(g);
  const saveTrip = (t: Trip) => groupTripStore.save(t);
  const fixed = { voyageurs: group.residents.length, accompagnants: group.accompagnants };
  const levePersonne = profile.transfert === "leve_personne" && profile.levePersonne === "sur_place";

  // À chaque changement d'écran, le focus va sur son titre (sauf au chargement).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const canNext = step !== 1 || Boolean(trip.commune);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Étapes du séjour de groupe">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                aria-current={i === step ? "step" : undefined}
                onClick={() => setStep(i)}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-bold",
                  i === step ? "border-ink-900 bg-ink-900 text-white" : "border-ink-400 bg-white text-ink-900 hover:bg-butter-100",
                )}
              >
                <span aria-hidden="true">{i + 1}</span>
                {s}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="titre-etape" className="flex flex-col gap-5">
        <h2 id="titre-etape" ref={headingRef} tabIndex={-1} className="text-3xl">
          <span className="sr-only">Étape {step + 1} sur {STEPS.length} : </span>
          {STEPS[step]}
        </h2>
        {error && (
          <p role="alert" className="rounded-2xl bg-ko-100 p-3 font-bold text-ko-700">
            Les lieux n&apos;ont pas pu être chargés. Rechargez la page.
          </p>
        )}
        {step === 0 && <GroupStep group={group} onChange={saveGroup} />}
        {step === 1 && (
          <div className="flex flex-col gap-8">
            <TripSettings trip={trip} onChange={saveTrip} communes={communes} />
            <section aria-labelledby="titre-budget-groupe" className="flex flex-col gap-3 border-t border-ink-200 pt-6">
              <h3 id="titre-budget-groupe" className="text-2xl">
                {PAYMENT_TITLE}
              </h3>
              <BudgetSettingsForm trip={trip} onChange={saveTrip} fixed={fixed} />
            </section>
          </div>
        )}
        {step === 2 && (
          <LodgingPicker trip={trip} onChange={saveTrip} communes={communes} evaluated={evaluated} lieuSuffix={GROUP_SUFFIX} rooms={rooms} />
        )}
        {step === 3 && (
          <>
            <ProgramEditor
              trip={trip}
              onChange={saveTrip}
              communes={communes}
              evaluated={evaluated}
              lieuSuffix={GROUP_SUFFIX}
              fixed={fixed}
              rooms={rooms}
              levePersonne={levePersonne}
            />
            <BudgetSummary trip={trip} fixed={fixed} rooms={rooms} levePersonne={levePersonne} />
          </>
        )}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <p className="text-ink-700">
              Le dossier réunit le groupe (résident par résident), l&apos;hébergement, l&apos;itinéraire, les points
              à confirmer et les numéros utiles. Il s&apos;imprime ou s&apos;enregistre en PDF.
            </p>
            <ul className="list-disc pl-6 text-ink-700">
              <li>{group.nom} : {group.residents.length} résident{group.residents.length > 1 ? "s" : ""}, {group.accompagnants} accompagnant{group.accompagnants > 1 ? "s" : ""}</li>
              <li>Destination : {trip.commune ?? "non choisie"}</li>
              <li>Hébergement : {trip.hebergement?.nom ?? "non choisi"}</li>
              <li>Étapes au programme : {trip.programme.flat().length}</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="dark">
                <Link href="/dossier/?groupe=1">
                  <FileText aria-hidden="true" />
                  Voir le dossier de groupe
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dossier/?groupe=1&imprimer=1">
                  <Printer aria-hidden="true" />
                  Imprimer
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-between gap-3 border-t border-ink-200 pt-5">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft aria-hidden="true" />
          Étape précédente
        </Button>
        {step < STEPS.length - 1 && (
          <Button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Étape suivante : {STEPS[step + 1].toLowerCase()}
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </div>
      {!canNext && <p className="text-sm text-ink-700">Indiquez une destination pour continuer.</p>}
    </div>
  );
}
