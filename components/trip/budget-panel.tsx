"use client";

import { useState } from "react";
import { Banknote, CircleCheck, CircleHelp, Equal, Lightbulb, Ticket, TriangleAlert, Waves } from "lucide-react";
import { cn } from "cn";
import { ANCV_QUESTIONS, EMPTY_ANSWERS, ancvPistes, type AncvAnswers } from "@/lib/ancv";
import {
  DEFAULT_BUDGET,
  MARGE_ESTIMATION,
  MONTANT_MAX,
  estimateTrip,
  personnes,
  type BudgetEstimate,
  type BudgetSettings,
  type Nature,
  type Offer,
} from "@/lib/budget";
import { getOffer } from "@/lib/data";
import { FEATURES } from "@/lib/features";
import type { Trip } from "@/lib/trip";
import type { Category } from "@/lib/types";

const input = "min-h-11 w-full rounded-full border border-input bg-white px-4 font-bold";
const labelText = "text-sm font-bold text-ink-600";
const euros = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/** Personnes fixées par le parcours (groupe d'une structure) : le formulaire ne les demande pas. */
export type FixedPeople = { voyageurs: number; accompagnants: number };

/** Réglages de budget du séjour, avec les personnes du groupe quand elles sont connues. */
export function budgetOf(trip: Trip, fixed?: FixedPeople): BudgetSettings {
  const s = { ...DEFAULT_BUDGET, ...(trip.budget ?? {}), ...(fixed ?? {}) };
  // Budget masqué : un montant déjà enregistré ne filtre plus les activités.
  return FEATURES.budget ? s : { ...s, montant: null };
}

/** Titre de la rubrique de réglages, selon que le budget est affiché ou non. */
export const PAYMENT_TITLE = FEATURES.budget ? "Budget et moyens de paiement" : "Moyens de paiement";

/** Nature d'un montant : jamais la couleur seule, toujours une icône et un mot. */
export function NatureBadge({ nature }: { nature: Nature }) {
  return nature === "reel" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-ok-600/40 bg-ok-100 px-2 py-0.5 text-xs font-bold text-ok-700">
      <CircleCheck aria-hidden="true" className="size-3.5" />
      Prix réel <span className="font-normal">(simulé)</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink-400 bg-white px-2 py-0.5 text-xs font-bold text-ink-700">
      <Equal aria-hidden="true" className="size-3.5" />
      Estimation
    </span>
  );
}

/** Acceptation des Chèques-Vacances par un prestataire. */
export function ChequesBadge({ offer }: { offer: Offer }) {
  const v = offer.chequesVacances;
  if (v === "sans_objet") return null;
  const meta = {
    oui: { label: "Chèques-Vacances acceptés", Icon: Ticket, cls: "border-label-600/40 bg-label-100 text-label-700" },
    non: { label: "Chèques-Vacances refusés", Icon: Ticket, cls: "border-ink-400 bg-white text-ink-700 line-through decoration-1" },
    inconnu: { label: "Chèques-Vacances : à confirmer", Icon: CircleHelp, cls: "border-dashed border-ink-400 bg-white text-ink-700" },
  }[v];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold whitespace-nowrap", meta.cls)}>
      <meta.Icon aria-hidden="true" className="size-3.5" />
      {meta.label}
      {offer.simule && <span className="font-normal no-underline">(simulé)</span>}
    </span>
  );
}

/** Prix et moyens de paiement d'un lieu, en une ligne. */
export function OfferLine({ id, c, className }: { id: string; c: Category; className?: string }) {
  const offer = getOffer(id, c);
  let prix: React.ReactNode = null;
  if (c === "hebergement" && offer.nuitEstimee) {
    prix = (
      <span className="inline-flex items-center gap-1 text-sm text-ink-700">
        <Banknote aria-hidden="true" className="size-4" />≈ {euros(offer.nuitEstimee)} la nuit
        <span className="text-ink-600">(estimation)</span>
      </span>
    );
  } else if (offer.prix === 0) {
    prix = (
      <span className="inline-flex items-center gap-1 text-sm text-ink-700">
        <Waves aria-hidden="true" className="size-4" />
        Gratuit
      </span>
    );
  } else if (offer.prix) {
    const acc = offer.tarifAccompagnant === "gratuit" ? "accompagnant gratuit" : offer.tarifAccompagnant === "reduit" ? "accompagnant à moitié prix" : "accompagnant plein tarif";
    prix = (
      <span className="inline-flex items-center gap-1 text-sm text-ink-700">
        <Banknote aria-hidden="true" className="size-4" />
        {euros(offer.prix)} par personne, {acc} <span className="text-ink-600">(prix simulé)</span>
      </span>
    );
  }
  return (
    <span className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {FEATURES.budget && prix}
      <ChequesBadge offer={offer} />
    </span>
  );
}

function AncvHelper() {
  const [answers, setAnswers] = useState<AncvAnswers>(EMPTY_ANSWERS);
  const pistes = ancvPistes(answers);
  const answered = Object.values(answers).some(Boolean);
  return (
    <details className="rounded-2xl border border-ink-200 bg-white p-4">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-extrabold">
        <Lightbulb aria-hidden="true" className="size-5 shrink-0" />
        Ai-je droit à une aide aux vacances de l&apos;ANCV ?
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-ink-700">
          Un premier repérage, à titre indicatif. Ability ne verse aucune aide : les aides de l&apos;ANCV passent par
          une structure partenaire (association, CCAS, établissement). Les conditions sont toujours à vérifier
          auprès d&apos;elle ou sur le site de l&apos;ANCV.
        </p>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-bold text-ink-600">Cochez ce qui correspond</legend>
          {ANCV_QUESTIONS.map((q) => (
            <label key={q.key} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={answers[q.key]}
                onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.checked })}
                className="size-5 shrink-0 accent-ink-900"
              />
              <span>{q.label}</span>
            </label>
          ))}
        </fieldset>
        <div role="status" className="flex flex-col gap-2">
          {!answered ? null : pistes.length === 0 ? (
            <p className="text-sm text-ink-700">
              Aucune piste évidente avec ces réponses. Le CCAS de votre commune peut vous orienter.
            </p>
          ) : (
            <>
              <p className="font-bold">
                {pistes.length} piste{pistes.length > 1 ? "s" : ""} à explorer :
              </p>
              <ul className="flex flex-col gap-2">
                {pistes.map((p) => (
                  <li key={p.id} className="rounded-xl bg-butter-100 p-3">
                    <p className="font-extrabold">{p.titre}</p>
                    <p className="text-sm text-ink-700">{p.pourquoi}</p>
                    <p className="text-sm text-ink-700">
                      <strong>Auprès de :</strong> {p.aupresDe}. <em>À vérifier.</em>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </details>
  );
}

/**
 * Budget et moyens de paiement du séjour : enveloppe pour l'itinéraire
 * entier, et filtre Chèques-Vacances. Proposition à tester en entretien.
 */
export function BudgetSettingsForm({
  trip,
  onChange,
  fixed,
}: {
  trip: Trip;
  onChange: (t: Trip) => void;
  fixed?: FixedPeople;
}) {
  const s = budgetOf(trip, fixed);
  const set = (patch: Partial<BudgetSettings>) => onChange({ ...trip, budget: { ...s, ...patch } });
  const count = (v: string, min: number) => Math.max(min, Math.min(20, Math.round(Number(v)) || min));
  return (
    <div className="flex flex-col gap-4">
      {FEATURES.budget && (
        <>
          <p className="text-sm text-ink-700">
            <strong>Proposition à tester :</strong> le budget porte sur l&apos;itinéraire entier. Les activités et les
            locations de matériel comptent à leur prix réel ; l&apos;hébergement, les repas et les trajets sont estimés, et
            signalés comme tels. Dans la maquette, tous les prix sont simulés.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className={labelText}>Budget maximum (en euros)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={MONTANT_MAX}
                step={50}
                value={s.montant ?? ""}
                placeholder="Sans plafond"
                onChange={(e) =>
                  set({ montant: e.target.value === "" ? null : Math.max(0, Math.min(MONTANT_MAX, Math.round(Number(e.target.value)) || 0)) })
                }
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelText}>Ce budget vaut</span>
              <select value={s.portee} onChange={(e) => set({ portee: e.target.value === "personne" ? "personne" : "sejour" })} className={`${input} cursor-pointer`}>
                <option value="sejour">Pour tout le séjour</option>
                <option value="personne">Par personne (accompagnants compris)</option>
              </select>
            </label>
            {fixed ? (
              <p className="text-sm text-ink-700 sm:col-span-2">
                Pour {fixed.voyageurs} résident{fixed.voyageurs > 1 ? "s" : ""} et {fixed.accompagnants} accompagnant
                {fixed.accompagnants > 1 ? "s" : ""}, d&apos;après le profil du groupe.
              </p>
            ) : (
              <>
                <label className="flex flex-col gap-1">
                  <span className={labelText}>Voyageurs en fauteuil</span>
                  <input type="number" min={1} max={20} value={s.voyageurs} onChange={(e) => set({ voyageurs: count(e.target.value, 1) })} className={input} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelText}>Accompagnants</span>
                  <input type="number" min={0} max={20} value={s.accompagnants} onChange={(e) => set({ accompagnants: count(e.target.value, 0) })} className={input} />
                </label>
              </>
            )}
          </div>
        </>
      )}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 bg-white p-3">
        <input
          type="checkbox"
          checked={s.chequesVacances}
          onChange={(e) => set({ chequesVacances: e.target.checked })}
          className="mt-0.5 size-5 shrink-0 accent-ink-900"
        />
        <span className="flex flex-col">
          <span className="font-bold">Je paie en Chèques-Vacances ANCV</span>
          <span className="text-sm text-ink-700">
            Hébergements, restaurants et activités payants : seulement ceux qui les acceptent. Un prestataire dont on ne
            sait rien est écarté, comme toute information inconnue.
          </span>
        </span>
      </label>
      <AncvHelper />
    </div>
  );
}

const STATUS: Record<BudgetEstimate["statut"], { Icon: typeof CircleCheck; cls: string; text: (e: BudgetEstimate) => string }> = {
  sans_plafond: { Icon: Banknote, cls: "bg-butter-100 text-ink-900", text: () => "Aucun plafond fixé : le coût est donné pour information." },
  dans_budget: {
    Icon: CircleCheck,
    cls: "bg-ok-100 text-ok-700",
    text: (e) => `Dans le budget, même si les estimations sont hautes : il reste au moins ${euros((e.enveloppe ?? 0) - e.haut)}.`,
  },
  incertain: {
    Icon: TriangleAlert,
    cls: "bg-warn-100 text-warn-700",
    text: (e) => `Dans le budget en moyenne, mais il peut être dépassé si les estimations sont hautes (jusqu'à ${euros(e.haut)}).`,
  },
  depasse: {
    Icon: TriangleAlert,
    cls: "bg-ko-100 text-ko-700",
    text: (e) => `Au-dessus du budget d'environ ${euros(e.total - (e.enveloppe ?? 0))}. Essayez un rythme plus calme ou un autre hébergement.`,
  },
};

/** Coût de l'itinéraire entier, poste par poste, en séparant le réel de l'estimé. */
export function BudgetSummary({
  trip,
  fixed,
  rooms,
  levePersonne = false,
}: {
  trip: Trip;
  fixed?: FixedPeople;
  rooms?: number;
  levePersonne?: boolean;
}) {
  if (!FEATURES.budget) return null;
  const s = budgetOf(trip, fixed);
  const e = estimateTrip(trip, s, { offerOf: getOffer, rooms, levePersonne });
  const status = STATUS[e.statut];
  const pctEstime = Math.round(e.partEstimee * 100);
  return (
    <section aria-labelledby="titre-budget" className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="titre-budget" className="text-xl">
          Budget de l&apos;itinéraire
        </h3>
        <p className="text-sm text-ink-600">
          {personnes(s)} personne{personnes(s) > 1 ? "s" : ""}, {trip.programme.length} jour{trip.programme.length > 1 ? "s" : ""}
          {e.enveloppe !== null ? ` · budget ${euros(e.enveloppe)}` : ""}
        </p>
      </div>
      <ul className="divide-y divide-ink-200">
        {e.lignes.map((l) => (
          <li key={l.poste} className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5", l.nature === "estime" && "border-l-4 border-dashed border-l-ink-400 pl-3")}>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2 font-bold">
                {l.libelle}
                <NatureBadge nature={l.nature} />
              </span>
              <span className="text-sm text-ink-600">{l.detail}</span>
            </span>
            <strong className="text-lg">
              {l.nature === "estime" ? "≈ " : ""}
              {euros(l.montant)}
            </strong>
          </li>
        ))}
      </ul>
      <dl className="grid gap-3 rounded-xl bg-butter-50 p-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-ink-600">Total</dt>
          <dd className="text-2xl font-extrabold">≈ {euros(e.total)}</dd>
          <dd className="text-sm text-ink-600">
            entre {euros(e.bas)} et {euros(e.haut)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-600">Prix réels</dt>
          <dd className="text-2xl font-extrabold">{euros(e.reel)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-600">Part estimée</dt>
          <dd className="text-2xl font-extrabold">{pctEstime} %</dd>
          <dd className="text-sm text-ink-600">à ± {Math.round(MARGE_ESTIMATION * 100)} % près</dd>
        </div>
      </dl>
      <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full border border-ink-400">
        <span className="bg-ok-600" style={{ width: `${100 - pctEstime}%` }} />
        <span className="bg-[repeating-linear-gradient(45deg,var(--color-ink-200)_0_6px,white_6px_12px)]" style={{ width: `${pctEstime}%` }} />
      </div>
      <p className={cn("flex items-start gap-2 rounded-xl p-3 font-bold", status.cls)}>
        <status.Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {status.text(e)}
      </p>
      {s.chequesVacances && (
        <p className="flex items-start gap-2 text-sm text-ink-700">
          <Ticket aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Filtre Chèques-Vacances actif : les propositions ne gardent que les prestataires qui les acceptent (ou les lieux
          gratuits).
        </p>
      )}
    </section>
  );
}
