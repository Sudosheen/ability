"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Award, Camera, ClipboardCheck, Hourglass, Send, Trash2, Users } from "lucide-react";
import { CategoryIcon } from "@/components/ability/category-icon";
import { ProofBadge } from "@/components/ability/status";
import { Button } from "@/components/ui/button";
import {
  REPONSE_LABELS,
  RESSENTI_LABELS,
  blocsFor,
  summarizePlaces,
  type BlocId,
  type CommunityData,
  type Reponse,
  type Ressenti,
  type Retour,
  type RetourSejour,
} from "@/lib/community";
import { getDemoCommunity, getPlace } from "@/lib/data";
import { communityStore, useCommunity, useTrip } from "@/lib/storage";
import type { Category } from "@/lib/types";
import { PlaceCommunityCard, VerdictPill, formatDay } from "./verdict";

type Target = { id: string; nom: string; c: Category; co: string | null };

const input = "min-h-11 w-full rounded-full border border-input bg-white px-4 font-bold";
const labelText = "text-sm font-bold text-ink-600";
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const EMPTY: CommunityData = { retours: [], sejours: [] };

/** Comment un retour devient une preuve : l'échelle affichée en haut de page. */
function Ladder() {
  const steps = [
    { Icon: Hourglass, titre: "1 retour", texte: "Le bloc passe « en attente d'un 2e retour ». Il ne change pas encore la fiche." },
    { Icon: Users, titre: "2 voyageurs concordants", texte: "Le bloc devient « Confirmé par la communauté ». Des avis contraires le font passer « à reconfirmer »." },
    { Icon: Award, titre: "Ambassadeurs (plus tard)", texte: "Les voyageurs les plus actifs deviennent ambassadeurs : leurs retours pèsent davantage." },
    { Icon: ClipboardCheck, titre: "Visite sur place (plus tard)", texte: "Un ambassadeur terrain mesure et photographie : « Vérifié sur place »." },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(({ Icon, titre, texte }, i) => (
        <li key={titre} className="flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-4">
          <span className="flex items-center gap-2 font-extrabold">
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-sun-400 text-base">
              {i + 1}
            </span>
            <Icon aria-hidden="true" className="size-5" />
            {titre}
          </span>
          <span className="text-sm text-ink-700">{texte}</span>
        </li>
      ))}
    </ol>
  );
}

function BlocQuestions({
  target,
  answers,
  onAnswer,
}: {
  target: Target;
  answers: Partial<Record<BlocId, Reponse>>;
  onAnswer: (bloc: BlocId, r: Reponse) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {blocsFor(target.c).map((bloc) => (
        <fieldset key={bloc.id} className="flex flex-col gap-2 rounded-xl bg-butter-50 p-3">
          <legend className="sr-only">{bloc.libelle}</legend>
          <p aria-hidden="true" className="font-extrabold">
            {bloc.libelle}
          </p>
          <p className="text-sm text-ink-700">{bloc.question}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(REPONSE_LABELS) as Reponse[]).map((r) => (
              <label
                key={r}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-ink-400 bg-white px-4 font-bold has-[:checked]:border-ink-900 has-[:checked]:bg-ink-900 has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name={`${target.id}-${bloc.id}`}
                  value={r}
                  checked={answers[bloc.id] === r}
                  onChange={() => onAnswer(bloc.id, r)}
                  className="size-4 accent-sun-400"
                />
                {REPONSE_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function FeedbackForm({ targets, tripInfo, onSaved }: { targets: Target[]; tripInfo: { commune: string | null; jours: number } | null; onSaved: (msg: string) => void }) {
  const stored = useCommunity() ?? EMPTY;
  const [auteur, setAuteur] = useState("Moi");
  const [date, setDate] = useState(today);
  const [ressenti, setRessenti] = useState<Ressenti | null>(null);
  const [commentaireSejour, setCommentaireSejour] = useState("");
  const [answers, setAnswers] = useState<Record<string, Partial<Record<BlocId, Reponse>>>>({});
  const [photos, setPhotos] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pseudo = auteur.trim() || "Moi";
    const retours: Retour[] = targets
      .filter((t) => Object.values(answers[t.id] ?? {}).some((r) => r !== "pas_vu"))
      .map((t) => ({
        id: newId(),
        lieuId: t.id,
        lieuNom: t.nom,
        categorie: t.c,
        commune: t.co,
        date,
        auteur: pseudo,
        blocs: answers[t.id] ?? {},
        photo: photos[t.id] === true,
        commentaire: (comments[t.id] ?? "").trim(),
      }));
    const sejours: RetourSejour[] =
      tripInfo && ressenti
        ? [{ id: newId(), date, auteur: pseudo, commune: tripInfo.commune, jours: tripInfo.jours, ressenti, commentaire: commentaireSejour.trim() }]
        : [];
    if (!retours.length && !sejours.length) {
      onSaved("Rien à enregistrer : répondez à au moins une question (« Conforme » ou « Pas conforme »).");
      return;
    }
    communityStore.save({ retours: [...stored.retours, ...retours], sejours: [...stored.sejours, ...sejours] });
    setAnswers({});
    setPhotos({});
    setComments({});
    setRessenti(null);
    setCommentaireSejour("");
    onSaved(
      `Merci ! ${retours.length} lieu${retours.length > 1 ? "x" : ""} et ${sejours.length ? "votre itinéraire" : "aucun itinéraire"} enregistrés dans ce navigateur. ` +
        "Leur effet sur les fiches s'affiche plus bas. Dans la version complète, ils seraient envoyés à la base partagée.",
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelText}>Pseudonyme (jamais votre nom)</span>
          <input value={auteur} maxLength={40} onChange={(e) => setAuteur(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelText}>Date de la visite</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} className={input} />
        </label>
      </div>

      {tripInfo && (
        <fieldset className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4">
          <legend className="px-1 text-lg font-extrabold">
            Votre itinéraire{tripInfo.commune ? ` à ${tripInfo.commune}` : ""} ({tripInfo.jours} jour{tripInfo.jours > 1 ? "s" : ""})
          </legend>
          <p className="text-sm text-ink-700">Le séjour s&apos;est-il enchaîné sans rupture ?</p>
          <div className="flex flex-col gap-1">
            {(Object.keys(RESSENTI_LABELS) as Ressenti[]).map((r) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="radio" name="ressenti" checked={ressenti === r} onChange={() => setRessenti(r)} className="size-5 accent-ink-900" />
                {RESSENTI_LABELS[r]}
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className={labelText}>Ce qui a marché, ce qui a coincé (facultatif)</span>
            <textarea
              value={commentaireSejour}
              maxLength={600}
              rows={3}
              onChange={(e) => setCommentaireSejour(e.target.value)}
              className="rounded-2xl border border-input bg-white p-3"
            />
          </label>
        </fieldset>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-lg">Les lieux, bloc par bloc</h3>
        <p className="text-sm text-ink-700">
          Pour chaque point de la fiche d&apos;accessibilité : était-ce conforme à ce qui était annoncé ? « Pas vu » ne
          compte ni pour ni contre.
        </p>
        <ul className="flex flex-col gap-3">
          {targets.map((t, i) => {
            const n = Object.values(answers[t.id] ?? {}).filter((r) => r !== "pas_vu").length;
            return (
              <li key={t.id}>
                <details open={i === 0} className="rounded-2xl border border-ink-200 bg-white p-3">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-3">
                    <CategoryIcon category={t.c} className="size-5 shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-extrabold">{t.nom}</span>
                      <span className="text-sm text-ink-600">
                        {t.co ?? ""}
                        {n > 0 ? ` · ${n} réponse${n > 1 ? "s" : ""}` : ""}
                      </span>
                    </span>
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <BlocQuestions
                      target={t}
                      answers={answers[t.id] ?? {}}
                      onAnswer={(bloc, r) => setAnswers({ ...answers, [t.id]: { ...answers[t.id], [bloc]: r } })}
                    />
                    <label className="flex min-h-11 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={photos[t.id] === true}
                        onChange={(e) => setPhotos({ ...photos, [t.id]: e.target.checked })}
                        className="size-5 accent-ink-900"
                      />
                      <Camera aria-hidden="true" className="size-5" />
                      J&apos;ajoute une photo <span className="text-sm text-ink-600">(simulé : aucune image n&apos;est envoyée)</span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={labelText}>Un détail utile aux suivants (facultatif)</span>
                      <textarea
                        value={comments[t.id] ?? ""}
                        maxLength={600}
                        rows={2}
                        onChange={(e) => setComments({ ...comments, [t.id]: e.target.value })}
                        className="rounded-2xl border border-input bg-white p-3"
                      />
                    </label>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </div>
      <Button type="submit" className="self-start">
        <Send aria-hidden="true" />
        Enregistrer mon retour
      </Button>
    </form>
  );
}

/**
 * Communauté : les voyageurs racontent l'itinéraire suivi et confirment, bloc
 * par bloc, l'accessibilité des lieux. Les retours font monter ou descendre le
 * niveau de preuve des fiches (règles dans lib/community.ts).
 */
export function CommunityPage() {
  const params = useSearchParams();
  const lieuId = params.get("lieu");
  const trip = useTrip();
  const mine = useCommunity() ?? EMPTY;
  const demo = useMemo(() => getDemoCommunity(), []);
  const [lieuParam, setLieuParam] = useState<Target | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!lieuId) return;
    let cancelled = false;
    getPlace(lieuId)
      .then((p) => !cancelled && p && setLieuParam({ id: p.id, nom: p.nom, c: p.categorie, co: p.commune }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [lieuId]);

  // Lieux à noter : celui de l'adresse, puis ceux du séjour ; sinon les lieux fictifs de démonstration.
  const targets = useMemo(() => {
    const list: Target[] = [];
    const add = (t: Target) => {
      if (!blocsFor(t.c).length || list.some((x) => x.id === t.id)) return;
      list.push(t);
    };
    if (lieuParam) add(lieuParam);
    if (trip?.hebergement) add({ id: trip.hebergement.id, nom: trip.hebergement.nom, c: trip.hebergement.c, co: trip.hebergement.co });
    trip?.programme.flat().forEach((s) => add({ id: s.id, nom: s.nom, c: s.c, co: s.co }));
    if (!list.length) demo.retours.forEach((r) => add({ id: r.lieuId, nom: r.lieuNom, c: r.categorie, co: r.commune }));
    return list;
  }, [lieuParam, trip, demo]);

  const hasTrip = Boolean(trip && (trip.hebergement || trip.programme.some((d) => d.length)));
  const tripInfo = hasTrip && trip ? { commune: trip.commune, jours: trip.programme.length } : null;
  const all = useMemo(() => [...demo.retours, ...mine.retours], [demo, mine]);
  const summaries = useMemo(() => summarizePlaces(all, today()), [all]);
  const sejours = [...mine.sejours, ...demo.sejours].sort((a, b) => b.date.localeCompare(a.date));
  const confirmes = summaries.reduce((n, s) => n + s.meta.confirmes, 0);

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="titre-echelle" className="flex flex-col gap-4">
        <h2 id="titre-echelle" className="text-2xl">
          Comment un retour devient une preuve
        </h2>
        <p className="max-w-3xl text-ink-700">
          Chaque retour porte sur les blocs de la fiche d&apos;accessibilité (stationnement, entrées, chambre,
          sanitaires, restauration, activités, transport). Le bloc « métadonnées » se remplit tout seul : date, nombre
          de voyageurs, niveau de preuve. Un bloc confirmé affiche le badge <ProofBadge level="communaute" hideDate className="align-middle" />.
        </p>
        <Ladder />
      </section>

      <section id="donner-un-retour" aria-labelledby="titre-retour" className="flex scroll-mt-4 flex-col gap-4">
        <h2 id="titre-retour" className="text-2xl">
          Donner mon retour
        </h2>
        <p className="max-w-3xl text-ink-700">
          {lieuParam
            ? `Pour ${lieuParam.nom}${hasTrip ? " et les lieux de votre séjour" : ""}.`
            : hasTrip
              ? "Les lieux de votre séjour sont prêts à être notés."
              : "Vous n'avez pas encore de séjour : pour essayer, notez l'un des lieux fictifs ci-dessous, ou partez d'une fiche."}{" "}
          Tout reste dans ce navigateur.
        </p>
        <p role="status" className="rounded-2xl bg-ok-100 p-3 font-bold text-ok-700 empty:hidden">
          {message}
        </p>
        <FeedbackForm key={targets.map((t) => t.id).join()} targets={targets} tripInfo={tripInfo} onSaved={setMessage} />
      </section>

      <section aria-labelledby="titre-verifie" className="flex flex-col gap-4">
        <h2 id="titre-verifie" className="text-2xl">
          Ce que la communauté a vérifié
        </h2>
        <p className="text-ink-700">
          {summaries.length} lieu{summaries.length > 1 ? "x" : ""} avec des retours, {confirmes} bloc{confirmes > 1 ? "s" : ""} confirmé
          {confirmes > 1 ? "s" : ""}. Les retours simulés ne portent que sur des lieux fictifs ; les retours de plus de 24 mois ne
          comptent plus.
        </p>
        <div className="flex flex-wrap gap-2" aria-label="Légende">
          {(["confirme", "en_attente", "contraire", "infirme"] as const).map((v) => (
            <VerdictPill key={v} verdict={v} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {summaries.map((s) => (
            <PlaceCommunityCard key={s.lieuId} summary={s} />
          ))}
        </div>
      </section>

      <section aria-labelledby="titre-itineraires" className="flex flex-col gap-4">
        <h2 id="titre-itineraires" className="text-2xl">
          Retours sur les itinéraires
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {sejours.map((s) => (
            <li key={s.id} className="flex flex-col gap-1 rounded-2xl border border-ink-200 bg-white p-4">
              <p className="font-extrabold">{RESSENTI_LABELS[s.ressenti]}</p>
              <p className="text-sm text-ink-600">
                {s.auteur} · {s.commune ?? "destination non précisée"} · {s.jours} jour{s.jours > 1 ? "s" : ""} · {formatDay(s.date)}
              </p>
              {s.commentaire && <p className="text-ink-700">« {s.commentaire} »</p>}
            </li>
          ))}
        </ul>
      </section>

      {(mine.retours.length > 0 || mine.sejours.length > 0) && (
        <section aria-labelledby="titre-mes-retours" className="flex flex-col gap-3 rounded-2xl bg-butter-100 p-4">
          <h2 id="titre-mes-retours" className="text-xl">
            Mes retours
          </h2>
          <p className="text-ink-700">
            {mine.retours.length} retour{mine.retours.length > 1 ? "s" : ""} sur des lieux, {mine.sejours.length} sur des
            itinéraires, enregistrés dans ce navigateur.
          </p>
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => {
              if (window.confirm("Effacer vos retours de ce navigateur ?")) communityStore.clear();
            }}
          >
            <Trash2 aria-hidden="true" />
            Effacer mes retours
          </Button>
          <p className="text-sm text-ink-700">
            <Link href="/sejour/" className="font-bold underline underline-offset-4">
              Revenir à mon séjour
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
