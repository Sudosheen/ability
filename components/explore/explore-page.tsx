"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Layers, List, MapPin, Search, X } from "lucide-react";
import { cn } from "cn";
import { EvaluationSummary } from "@/components/ability/evaluation";
import { PlaceCard } from "@/components/ability/place-card";
import { PlaceDetail } from "@/components/ability/place-detail";
import { CategoryFilter, COMPAT_ORDER, ProfileBox, StatusFilter, type Coloring } from "@/components/map/filters";
import { MapCanvas, type MapPoint, type MapTarget } from "@/components/map/map-canvas";
import { COMPAT_LOOK } from "@/components/map/marker-sprites";
import { usePlaces, useUrlPreset } from "@/components/map/use-places";
import { AddToTrip } from "@/components/trip/add-to-trip";
import { Button } from "@/components/ui/button";
import { findCommune, getPlace, type Commune } from "@/lib/data";
import { factsFromPlace } from "@/lib/facts";
import { ACCESS_ORDER, CATEGORY_ORDER, DEFAULT_CATEGORIES, formatNumber } from "@/lib/labels";
import { evaluate, type Compatibility } from "@/lib/matching";
import {
  boundsCenter,
  countAccess,
  countCompat,
  inBounds,
  matchesFilters,
  resultsAround,
  sortResults,
  type Bounds,
  type Result,
} from "@/lib/search";
import { useProfile } from "@/lib/storage";
import type { AccessStatus, Category, Place } from "@/lib/types";

const LIST_SIZE = 30;
type Panel = "calques" | "liste" | null;

/**
 * Page Carte : explorer librement le territoire, à la manière de Wheelmap.
 * La carte occupe tout l'écran ; recherche, calques, liste et fiche du lieu
 * s'ouvrent par-dessus. La liste des lieux visibles reste toujours accessible
 * (clavier, lecteur d'écran, carte indisponible).
 */
export function ExplorePage({ communes, categoryCounts }: { communes: Commune[]; categoryCounts: Record<Category, number> }) {
  const params = useSearchParams();
  const profile = useProfile();
  const presetApplied = useUrlPreset(profile);
  const initial = findCommune(communes, params.get("ou") ?? "");

  const [where, setWhere] = useState(initial?.nom ?? "");
  const [whereMessage, setWhereMessage] = useState("");
  const [target, setTarget] = useState<MapTarget | null>(initial ? { lng: initial.lng, lat: initial.lat, zoom: 13.5 } : null);
  const [categories, setCategories] = useState<Set<Category>>(() => new Set(DEFAULT_CATEGORIES));
  const [compat, setCompat] = useState<Set<Compatibility>>(() => new Set(COMPAT_ORDER));
  const [access, setAccess] = useState<Set<AccessStatus>>(() => new Set(ACCESS_ORDER));
  const [coloringChoice, setColoringChoice] = useState<Coloring | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  const { features, evaluations, loading, error } = usePlaces(categories, profile);
  const coloring: Coloring = profile ? (coloringChoice ?? "sources") : "sources";
  const byProfile = coloring === "profil" && evaluations !== null;

  // Fiche du lieu choisi, chargée à la demande ; le focus va sur le panneau.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    getPlace(selectedId).then((p) => {
      if (cancelled) return;
      setPlace(p);
      detailRef.current?.focus();
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);
  const shownPlace = place && place.id === selectedId ? place : null;

  // Tous les lieux filtrés (pour la carte), puis ceux de la zone affichée (pour la liste).
  const all: Result[] = useMemo(
    () =>
      features
        .map((feature) => ({ feature, evaluation: evaluations?.get(feature.properties.id) ?? null, km: 0 }))
        .filter((r) => matchesFilters(r, { compat: byProfile ? compat : null, access })),
    [features, evaluations, byProfile, compat, access],
  );
  const inView = useMemo(() => {
    if (!bounds) return [];
    const visible = all.filter((r) => inBounds(r.feature, bounds)).map((r) => r.feature);
    return sortResults(resultsAround(visible, boundsCenter(bounds), Infinity, evaluations), "proche");
  }, [all, bounds, evaluations]);

  const points: MapPoint[] = useMemo(
    () =>
      all.map((r) => ({
        id: r.feature.properties.id,
        c: r.feature.properties.c,
        look: byProfile && r.evaluation ? COMPAT_LOOK[r.evaluation.statut] : r.feature.properties.a,
        coordinates: r.feature.geometry.coordinates,
      })),
    [all, byProfile],
  );

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) setPanel(null);
  };

  const search = (query: string) => {
    const c = findCommune(communes, query);
    if (!c) {
      setWhereMessage(query.trim() ? `« ${query} » : commune introuvable dans l'Hérault.` : "");
      return;
    }
    setWhere(c.nom);
    setWhereMessage(`Carte centrée sur ${c.nom}.`);
    setTarget({ lng: c.lng, lat: c.lat, zoom: 13.5 });
  };

  if (mapUnavailable) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <h2 className="text-2xl">La carte ne peut pas s&apos;afficher</h2>
        <p className="text-ink-700">
          Ce navigateur ou cet appareil n&apos;arrive pas à dessiner la carte (WebGL indisponible). La page Recherche
          présente les mêmes lieux sous forme de liste, autour de la destination de votre choix.
        </p>
        <Button asChild className="self-start">
          <Link href={where ? `/recherche/?ou=${encodeURIComponent(where)}` : "/recherche/"}>
            Ouvrir la Recherche
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  const panelButton = (id: Exclude<Panel, null>, label: string, Icon: typeof Layers, extra?: string) => (
    <Button
      type="button"
      variant={panel === id ? "dark" : "outline"}
      size="sm"
      aria-expanded={panel === id}
      aria-controls={`panneau-${id}`}
      onClick={() => setPanel(panel === id ? null : id)}
    >
      <Icon aria-hidden="true" />
      {label}
      {extra && <span className="font-normal">{extra}</span>}
    </Button>
  );

  return (
    <div className="relative h-[calc(100dvh-8rem)] min-h-[32rem] overflow-hidden">
      <MapCanvas
        points={points}
        focusIds={[selectedId, hoveredId].filter((x): x is string => Boolean(x))}
        target={target}
        onSelect={select}
        onMove={setBounds}
        onUnavailable={() => setMapUnavailable(true)}
        label="Carte des lieux. Le bouton « Liste » donne les lieux visibles sous forme de liste."
      />

      {/* Barre de recherche et boutons, par-dessus la carte. */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex max-h-[calc(100%-1.5rem)] flex-col gap-2 sm:right-auto sm:w-[24rem]">
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-3 shadow-lg">
          <form
            role="search"
            aria-label="Centrer la carte sur une commune"
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search(where);
            }}
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-input px-3 focus-within:outline-3 focus-within:outline-ink-900">
              <MapPin aria-hidden="true" className="size-4 shrink-0 text-ink-600" />
              <span className="sr-only">Commune</span>
              <input
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                list="communes-carte"
                placeholder="Aller à… Sète, Agde"
                autoComplete="off"
                className="min-h-11 w-full bg-transparent font-bold placeholder:font-normal placeholder:text-ink-600 focus:outline-none"
              />
              <datalist id="communes-carte">
                {communes.map((c) => (
                  <option key={c.nom} value={c.nom} />
                ))}
              </datalist>
            </label>
            <Button type="submit" size="icon" aria-label="Centrer la carte">
              <Search aria-hidden="true" />
            </Button>
          </form>
          <p role="status" className="text-sm text-ink-700 empty:hidden">
            {whereMessage}
          </p>
          <div className="flex flex-wrap gap-2">
            {panelButton("calques", "Calques et filtres", Layers)}
            {panelButton("liste", "Liste", List, loading ? undefined : `(${formatNumber(inView.length)})`)}
          </div>
          {error && (
            <p role="alert" className="text-sm font-bold text-ko-700">
              Les données n&apos;ont pas pu être chargées. Rechargez la page.
            </p>
          )}
        </div>

        {panel === "calques" && (
          <div id="panneau-calques" className="pointer-events-auto flex min-h-0 flex-col gap-5 overflow-y-auto rounded-2xl border border-ink-200 bg-white p-4 shadow-lg">
            <ProfileBox profile={profile} presetApplied={presetApplied} coloring={profile ? coloring : undefined} onColoring={setColoringChoice} />
            <CategoryFilter title="Calques" options={CATEGORY_ORDER} value={categories} onChange={setCategories} counts={categoryCounts} />
            <StatusFilter
              byProfile={byProfile}
              compat={compat}
              onCompat={setCompat}
              compatCounts={countCompat(all)}
              access={access}
              onAccess={setAccess}
              accessCounts={countAccess(all)}
            />
          </div>
        )}

        {panel === "liste" && (
          <section
            id="panneau-liste"
            aria-labelledby="titre-liste-carte"
            className="pointer-events-auto flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-ink-200 bg-white p-4 shadow-lg"
          >
            <h2 id="titre-liste-carte" className="text-lg">
              Lieux visibles sur la carte
            </h2>
            <p className="text-sm text-ink-700">
              {inView.length > LIST_SIZE
                ? `Les ${LIST_SIZE} plus proches du centre, sur ${formatNumber(inView.length)} : zoomez pour préciser.`
                : `${inView.length} lieu${inView.length > 1 ? "x" : ""}, du plus proche au plus loin du centre.`}
            </p>
            <ul className="flex flex-col gap-2">
              {inView.slice(0, LIST_SIZE).map((r) => (
                <li key={r.feature.properties.id}>
                  <PlaceCard
                    place={r.feature.properties}
                    evaluation={byProfile ? (r.evaluation ?? undefined) : undefined}
                    onSelect={select}
                    onHover={setHoveredId}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Fiche du lieu choisi : panneau à droite sur grand écran, feuille en bas sur mobile. */}
      {selectedId && (
        <aside
          ref={detailRef}
          tabIndex={-1}
          aria-label={shownPlace ? `Fiche : ${shownPlace.nom}` : "Fiche du lieu"}
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 flex max-h-[70%] flex-col gap-4 overflow-y-auto rounded-t-3xl border border-ink-200 bg-white p-4 shadow-2xl",
            "lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-3 lg:max-h-none lg:w-[28rem] lg:rounded-3xl",
          )}
        >
          <Button variant="outline" size="sm" className="self-end" onClick={() => select(null)}>
            <X aria-hidden="true" />
            Fermer la fiche
          </Button>
          {shownPlace ? (
            <>
              {profile && (
                <EvaluationSummary
                  evaluation={evaluate(factsFromPlace(shownPlace), profile)}
                  profile={profile}
                  placeName={shownPlace.nom}
                  headingId={`profil-${shownPlace.id}`}
                />
              )}
              <PlaceDetail place={shownPlace} hideUnknown={Boolean(profile)} />
              <AddToTrip place={shownPlace} />
              <Button asChild variant="dark" className="self-start">
                <Link href={`/lieu/?id=${shownPlace.id}`}>
                  Ouvrir la fiche complète
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          ) : (
            <p role="status" className="text-ink-600">
              Chargement de la fiche…
            </p>
          )}
        </aside>
      )}
    </div>
  );
}
