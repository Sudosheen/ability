"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft, MapPin, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { cn } from "cn";
import type { GeoJSONSource, StyleSpecification } from "maplibre-gl";
import MapView, {
  GeolocateControl,
  Layer,
  NavigationControl,
  ScaleControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { CategoryIcon } from "@/components/ability/category-icon";
import { EvaluationSummary } from "@/components/ability/evaluation";
import { FilterChip } from "@/components/ability/filter-chip";
import { PlaceCard } from "@/components/ability/place-card";
import { PlaceDetail } from "@/components/ability/place-detail";
import { AddToTrip } from "@/components/trip/add-to-trip";
import { PlaceCommunity } from "@/components/community/place-community";
import { COMPAT_LABELS } from "@/components/ability/status";
import { Button } from "@/components/ui/button";
import { findCommune, getLayer, getPlace, type Commune, type PlaceFeature } from "@/lib/data";
import { factsFromFeature, factsFromPlace } from "@/lib/facts";
import {
  ACCESS_META,
  ACCESS_ORDER,
  CATEGORY_FILE,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEFAULT_CATEGORIES,
  PROOF_ORDER,
  formatNumber,
  type LayerFile,
} from "@/lib/labels";
import { compareEvaluations, evaluate, type Compatibility, type Evaluation } from "@/lib/matching";
import { PRESETS, describeProfile, isPresetId } from "@/lib/profile";
import { readProfile, saveProfile, useProfile } from "@/lib/storage";
import type { AccessStatus, Category, Place } from "@/lib/types";
import { HERAULT_BOUNDS, loadAbilityStyle } from "./map-style";
import { COMPAT_COLOR, COMPAT_LOOK, addMarkerImages } from "./marker-sprites";

const LIST_SIZE = 30;
const INK = "#1d1b16";
const COMPAT_ORDER: Compatibility[] = ["compatible", "a_confirmer", "incompatible"];

type Bounds = [west: number, south: number, east: number, north: number];
/** recherche : résultats d'une zone, hébergements d'abord. carte : exploration libre. */
export type MapMode = "recherche" | "carte";
type Coloring = "profil" | "sources";
type SortKey = "compatible" | "verifie" | "proche";

const SORT_LABELS: Record<SortKey, string> = {
  compatible: "Le plus compatible",
  verifie: "Le mieux vérifié",
  proche: "Le plus proche",
};

function toggle<T>(set: Set<T>, value: T, on: boolean): Set<T> {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

/** Deux emprises quasi identiques (à 2 % près) : inutile de proposer une nouvelle recherche. */
function sameBounds(a: Bounds, b: Bounds) {
  const tolerance = 0.02 * Math.max(a[2] - a[0], a[3] - a[1]);
  return a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
}

const legend = "mb-2 text-sm font-bold tracking-wide text-ink-600 uppercase";

export function AbilityMap({
  communes,
  categoryCounts,
  mode,
}: {
  communes: Commune[];
  categoryCounts: Record<Category, number>;
  mode: MapMode;
}) {
  const mapRef = useRef<MapRef>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  // Vrai tant que la zone de recherche doit suivre le prochain déplacement de la carte.
  const followRef = useRef(true);
  const searchParams = useSearchParams();
  const initialWhere = searchParams.get("ou") ?? "";
  const urlPreset = searchParams.get("profil");
  const profile = useProfile();

  const [style, setStyle] = useState<StyleSpecification | string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [spritesReady, setSpritesReady] = useState(false);
  const [categories, setCategories] = useState<Set<Category>>(
    () => new Set<Category>(mode === "recherche" ? ["hebergement"] : DEFAULT_CATEGORIES),
  );
  const [statuses, setStatuses] = useState<Set<AccessStatus>>(() => new Set(ACCESS_ORDER));
  const [compatFilter, setCompatFilter] = useState<Set<Compatibility>>(() => new Set(COMPAT_ORDER));
  const [coloringChoice, setColoringChoice] = useState<Coloring | null>(null);
  const [sortChoice, setSortChoice] = useState<SortKey | null>(null);
  const [layers, setLayers] = useState<Partial<Record<LayerFile, PlaceFeature[]>>>({});
  const [loadError, setLoadError] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [searchArea, setSearchArea] = useState<Bounds | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [where, setWhere] = useState(initialWhere);
  const [whereMessage, setWhereMessage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sans profil, la carte ne peut montrer que ce que disent les sources.
  const coloring: Coloring = profile ? (coloringChoice ?? (mode === "recherche" ? "profil" : "sources")) : "sources";
  const sortKey: SortKey =
    sortChoice && (sortChoice !== "compatible" || coloring === "profil")
      ? sortChoice
      : coloring === "profil"
        ? "compatible"
        : mode === "recherche"
          ? "verifie"
          : "proche";
  const presetApplied = profile && isPresetId(urlPreset) && profile.nom === PRESETS[urlPreset].nom;

  // Fond de carte reteinté.
  useEffect(() => {
    let cancelled = false;
    loadAbilityStyle().then((s) => !cancelled && setStyle(s));
    return () => {
      cancelled = true;
    };
  }, []);

  // Le choix « Qui voyage ? » de l'accueil sert de profil d'exemple, sans écraser un profil enregistré.
  useEffect(() => {
    if (isPresetId(urlPreset) && !readProfile()) saveProfile(PRESETS[urlPreset]);
  }, [urlPreset]);

  // Les couches ne sont téléchargées que lorsqu'un de leurs calques est activé.
  useEffect(() => {
    const needed = new Set([...categories].map((c) => CATEGORY_FILE[c]));
    for (const file of needed) {
      if (layers[file]) continue;
      getLayer(file)
        .then((features) => setLayers((prev) => (prev[file] ? prev : { ...prev, [file]: features })))
        .catch(() => setLoadError(true));
    }
  }, [categories, layers]);

  // Fiche détaillée du lieu sélectionné, chargée à la demande.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    getPlace(selectedId)
      .then((p) => {
        if (cancelled) return;
        setPlace(p);
        detailRef.current?.focus({ preventScroll: true });
        detailRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      })
      .catch(() => setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);
  const shownPlace = place && place.id === selectedId ? place : null;

  const inCategories = useMemo(
    () =>
      (Object.values(layers) as PlaceFeature[][]).flatMap((features) =>
        features.filter((f) => categories.has(f.properties.c)),
      ),
    [layers, categories],
  );

  // Compatibilité de chaque lieu avec le profil, calculée sur les faits compacts de la couche.
  const evaluations = useMemo(() => {
    if (!profile) return null;
    return new Map<string, Evaluation>(
      inCategories.map((f) => [f.properties.id, evaluate(factsFromFeature(f.properties), profile)]),
    );
  }, [inCategories, profile]);
  const byProfile = coloring === "profil" && evaluations !== null;

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(ACCESS_ORDER.map((s) => [s, 0])) as Record<AccessStatus, number>;
    for (const f of inCategories) counts[f.properties.a]++;
    return counts;
  }, [inCategories]);

  const compatCounts = useMemo(() => {
    const counts: Record<Compatibility, number> = { compatible: 0, a_confirmer: 0, incompatible: 0 };
    if (evaluations) for (const e of evaluations.values()) counts[e.statut]++;
    return counts;
  }, [evaluations]);

  const visible = useMemo(
    () =>
      inCategories.filter((f) =>
        byProfile
          ? compatFilter.has(evaluations.get(f.properties.id)!.statut)
          : statuses.has(f.properties.a),
      ),
    [inCategories, byProfile, evaluations, compatFilter, statuses],
  );

  // Données de la carte : l'aspect du marqueur (x) dépend de la coloration choisie.
  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: visible.map((f) => ({
        type: "Feature" as const,
        geometry: f.geometry,
        properties: {
          id: f.properties.id,
          c: f.properties.c,
          x: byProfile ? COMPAT_LOOK[evaluations.get(f.properties.id)!.statut] : f.properties.a,
        },
      })),
    }),
    [visible, byProfile, evaluations],
  );

  const byId = useMemo(() => new Map(visible.map((f) => [f.properties.id, f])), [visible]);

  // Liste synchronisée avec la carte. En recherche, elle porte sur la zone de
  // recherche, qui ne change que sur demande ; en exploration, sur la zone affichée.
  const area = mode === "recherche" ? (searchArea ?? bounds) : bounds;
  const { inAreaCount, listed } = useMemo(() => {
    if (!area) return { inAreaCount: 0, listed: [] as PlaceFeature[] };
    const [w, s, e, n] = area;
    const cx = (w + e) / 2;
    const cy = (s + n) / 2;
    const k = Math.cos((cy * Math.PI) / 180);
    const inside = visible.filter((f) => {
      const [x, y] = f.geometry.coordinates;
      return x >= w && x <= e && y >= s && y <= n;
    });
    const dist = (f: PlaceFeature) =>
      ((f.geometry.coordinates[0] - cx) * k) ** 2 + (f.geometry.coordinates[1] - cy) ** 2;
    const proof = (f: PlaceFeature) => PROOF_ORDER.indexOf(f.properties.p);
    const sources = (f: PlaceFeature) => (f.properties.s.toString(2).match(/1/g) ?? []).length;
    const compare = (a: PlaceFeature, b: PlaceFeature) => {
      if (sortKey === "compatible" && evaluations) {
        const byCompat = compareEvaluations(
          evaluations.get(a.properties.id)!,
          evaluations.get(b.properties.id)!,
        );
        if (byCompat) return byCompat;
      }
      if (sortKey !== "proche") {
        const byProof = proof(a) - proof(b) || sources(b) - sources(a);
        if (byProof) return byProof;
      }
      return dist(a) - dist(b);
    };
    return { inAreaCount: inside.length, listed: [...inside].sort(compare).slice(0, LIST_SIZE) };
  }, [visible, area, sortKey, evaluations]);

  const focusFeatures = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [...new Set([selectedId, hoveredId])]
        .map((id) => (id ? byId.get(id) : undefined))
        .filter((f): f is PlaceFeature => Boolean(f))
        .map((f) => ({ type: "Feature" as const, geometry: f.geometry, properties: {} })),
    }),
    [selectedId, hoveredId, byId],
  );

  const syncBounds = () => {
    const b = mapRef.current?.getBounds();
    if (!b) return;
    const next: Bounds = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    setBounds(next);
    if (followRef.current) {
      setSearchArea(next);
      followRef.current = false;
    }
  };

  const goToCommune = (query: string, animate = true) => {
      if (!query.trim()) return;
      const commune = findCommune(communes, query);
      if (!commune) {
        setWhereMessage(`« ${query} » : commune introuvable dans l'Hérault.`);
        return;
      }
      setWhereMessage(`Carte centrée sur ${commune.nom}.`);
      setWhere(commune.nom);
      followRef.current = true;
      const target = { center: [commune.lng, commune.lat] as [number, number], zoom: 13.5 };
      if (animate) mapRef.current?.flyTo({ ...target, duration: 1200 });
      else mapRef.current?.jumpTo(target);
  };

  const onLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    setMapReady(true);
    addMarkerImages(map, Math.min(3, Math.ceil(window.devicePixelRatio || 1) + 1))
      .then(() => setSpritesReady(true))
      .catch(() => setLoadError(true));
    if (initialWhere) goToCommune(initialWhere, false);
    syncBounds();
  };

  const select = (id: string | null, recenter = false) => {
      setSelectedId(id);
      const f = id ? byId.get(id) : undefined;
      if (f && recenter) {
        const map = mapRef.current;
        map?.easeTo({ center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), 15), duration: 600 });
      }
  };

  const onMapClick = async (event: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      // On interroge la carte au point cliqué plutôt que de se fier à event.features :
      // react-map-gl y range le dernier survol, absent ou périmé au toucher.
      const layerIds = ["points", "clusters"].filter((id) => map.getLayer(id));
      const feature = map.queryRenderedFeatures(event.point, { layers: layerIds })[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const coordinates = feature.geometry.coordinates as [number, number];
      const clusterId = feature.properties?.cluster_id as number | undefined;
      if (clusterId !== undefined) {
        const source = map.getSource("lieux") as GeoJSONSource | undefined;
        const zoom = (await source?.getClusterExpansionZoom(clusterId)) ?? map.getZoom() + 2;
        map.easeTo({ center: coordinates, zoom, duration: 500 });
        return;
      }
      select(String(feature.properties?.id));
  };

  const total = visible.length;
  const loading = Object.keys(layers).length === 0 && !loadError;
  const canSearchHere = mode === "recherche" && bounds && searchArea && !sameBounds(bounds, searchArea);
  const areaName = mode === "recherche" ? "la zone de recherche" : "la zone affichée";
  const sortKeys: SortKey[] = coloring === "profil" ? ["compatible", "verifie", "proche"] : ["verifie", "proche"];

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[27rem_minmax(0,1fr)]">
      {/* Panneau : profil, recherche, calques, liste ou fiche. Placé avant la carte dans la page. */}
      <aside
        aria-label="Profil, filtres et liste des lieux"
        className="order-2 flex flex-col gap-5 border-ink-200 bg-butter-50 p-4 lg:order-1 lg:border-r"
      >
        {profile ? (
          <section aria-label="Mon profil" className="flex flex-col gap-3 rounded-2xl bg-butter-100 p-4">
            <p>
              <span className="flex items-center gap-2 font-extrabold">
                <UserRound aria-hidden="true" className="size-5 shrink-0" />
                {profile.nom}
              </span>
              <span className="text-sm text-ink-700">
                {describeProfile(profile)}.{" "}
                <Link href="/profil/" className="font-bold text-ink-900 underline underline-offset-4">
                  Modifier
                </Link>
              </span>
            </p>
            {presetApplied && (
              <p role="status" className="text-sm text-ink-700">
                Profil d&apos;exemple appliqué d&apos;après votre recherche : ajustez-le à vos besoins.
              </p>
            )}
            <div role="group" aria-label="Couleur des marqueurs" className="flex flex-wrap gap-2">
              {(["profil", "sources"] as Coloring[]).map((c) => (
                <FilterChip key={c} pressed={coloring === c} onPressedChange={() => setColoringChoice(c)}>
                  {c === "profil" ? "Selon mon profil" : "Selon les sources"}
                </FilterChip>
              ))}
            </div>
          </section>
        ) : (
          <section aria-label="Mon profil" className="flex flex-col gap-2 rounded-2xl bg-butter-100 p-4">
            <p className="font-extrabold">Ce lieu vous convient-il, à vous ?</p>
            <p className="text-sm text-ink-700">
              Sans profil, la carte montre seulement ce que disent les sources. Décrivez vos besoins en
              deux minutes pour voir ce qui est compatible, à confirmer ou incompatible.
            </p>
            <Button asChild className="self-start">
              <Link href="/profil/">
                Décrire mes besoins
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </section>
        )}

        <form
          role="search"
          aria-label="Centrer la carte sur une commune"
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            goToCommune(where);
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink-600">
              <MapPin aria-hidden="true" className="size-4" />
              Où ?
            </span>
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              list="communes-carte"
              placeholder="Sète, Montpellier, Agde…"
              autoComplete="off"
              className="min-h-11 w-full rounded-full border border-input bg-white px-4 font-bold placeholder:font-normal placeholder:text-ink-600"
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
        <p role="status" className="-mt-3 text-sm text-ink-700 empty:hidden">
          {whereMessage}
        </p>

        {/* Sur petit écran, les filtres se replient pour laisser la liste près de la carte. */}
        <Button
          variant="outline"
          className="self-start lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="filtres-carte"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal aria-hidden="true" />
          Calques et filtres
          <span className="font-normal text-ink-600">
            {categories.size} calque{categories.size > 1 ? "s" : ""}
          </span>
        </Button>
        <div id="filtres-carte" className={cn("flex-col gap-5 lg:flex", filtersOpen ? "flex" : "hidden")}>
          <fieldset className="flex flex-col gap-2">
            <legend className={legend}>Calques</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((c) => (
                <FilterChip
                  key={c}
                  pressed={categories.has(c)}
                  onPressedChange={(on) => setCategories((prev) => toggle(prev, c, on))}
                  count={categoryCounts[c]}
                  icon={<CategoryIcon category={c} className="size-4" />}
                >
                  {CATEGORY_LABELS[c]}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          {byProfile ? (
            <fieldset className="flex flex-col gap-2">
              <legend className={legend}>Compatibilité avec mon profil</legend>
              <div className="flex flex-wrap gap-2">
                {COMPAT_ORDER.map((s) => (
                  <FilterChip
                    key={s}
                    pressed={compatFilter.has(s)}
                    onPressedChange={(on) => setCompatFilter((prev) => toggle(prev, s, on))}
                    count={compatCounts[s]}
                    icon={
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full border-2"
                        style={{ borderColor: COMPAT_COLOR[s] }}
                      />
                    }
                  >
                    {COMPAT_LABELS[s]}
                  </FilterChip>
                ))}
              </div>
            </fieldset>
          ) : (
            <fieldset className="flex flex-col gap-2">
              <legend className={legend}>Accessibilité en fauteuil, d&apos;après les sources</legend>
              <div className="flex flex-wrap gap-2">
                {ACCESS_ORDER.map((s) => (
                  <FilterChip
                    key={s}
                    pressed={statuses.has(s)}
                    onPressedChange={(on) => setStatuses((prev) => toggle(prev, s, on))}
                    count={statusCounts[s]}
                    icon={
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full border-2"
                        style={{ borderColor: ACCESS_META[s].couleur }}
                      />
                    }
                  >
                    {ACCESS_META[s].court}
                  </FilterChip>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        {loadError && (
          <p role="alert" className="rounded-2xl bg-ko-100 p-3 font-bold text-ko-700">
            Les données n&apos;ont pas pu être chargées. Rechargez la page.
          </p>
        )}

        {selectedId ? (
          <div
            ref={detailRef}
            tabIndex={-1}
            aria-label="Fiche du lieu sélectionné"
            className="flex scroll-mt-4 flex-col gap-4 rounded-3xl border border-ink-200 bg-white p-4"
          >
            <Button variant="outline" size="sm" className="self-start" onClick={() => select(null)}>
              <ChevronLeft aria-hidden="true" />
              Retour à la liste
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
                <PlaceCommunity place={shownPlace} />
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
          </div>
        ) : (
          <section aria-labelledby="titre-liste" className="flex flex-col gap-3">
            <h2 id="titre-liste" className="text-xl">
              {mode === "recherche" ? "Résultats" : "Lieux dans la zone affichée"}
            </h2>
            <div role="group" aria-label="Trier la liste" className="flex flex-wrap gap-2">
              {sortKeys.map((k) => (
                <FilterChip key={k} pressed={sortKey === k} onPressedChange={() => setSortChoice(k)}>
                  {SORT_LABELS[k]}
                </FilterChip>
              ))}
            </div>
            <p role="status" className="text-sm text-ink-700">
              {loading
                ? "Chargement des lieux…"
                : `${formatNumber(inAreaCount)} lieu${inAreaCount > 1 ? "x" : ""} dans ${areaName}, sur ${formatNumber(total)} avec ces filtres.` +
                  (inAreaCount > LIST_SIZE ? ` Les ${LIST_SIZE} premiers sont listés : zoomez pour préciser.` : "")}
            </p>
            {!loading && inAreaCount === 0 && (
              <p className="rounded-2xl border border-dashed border-ink-400 p-4 text-ink-700">
                Aucun lieu ici avec ces filtres. Déplacez la carte, ou activez d&apos;autres calques.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {listed.map((f) => (
                <li key={f.properties.id}>
                  <PlaceCard
                    place={f.properties}
                    evaluation={byProfile ? evaluations.get(f.properties.id) : undefined}
                    onSelect={(id) => select(id, true)}
                    onHover={setHoveredId}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      {/* Carte : reste affichée pendant que le panneau défile. */}
      <div
        className="relative order-1 h-[58dvh] min-h-80 bg-butter-100 lg:sticky lg:top-0 lg:order-2 lg:h-dvh"
        role="region"
        aria-label="Carte des lieux. Tous les lieux affichés sont aussi dans la liste."
      >
        {style ? (
          <MapView
            ref={mapRef}
            mapStyle={style}
            initialViewState={{ bounds: HERAULT_BOUNDS, fitBoundsOptions: { padding: 24 } }}
            maxBounds={[1.2, 42.4, 5.6, 44.8]}
            minZoom={7}
            maxZoom={19}
            onLoad={onLoad}
            onMoveEnd={syncBounds}
            onClick={onMapClick}
            interactiveLayerIds={spritesReady ? ["clusters", "points"] : ["clusters"]}
            cursor="grab"
            onMouseEnter={(e) => {
              e.target.getCanvas().style.cursor = "pointer";
            }}
            onMouseLeave={(e) => {
              e.target.getCanvas().style.cursor = "";
            }}
            attributionControl={{
              // Repliée d'office sur petit écran (bouton « i »), dépliée sinon.
              customAttribution:
                "Accessibilité : Acceslibre, © contributeurs OpenStreetMap, Tourisme & Handicap",
            }}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" showCompass={false} />
            <GeolocateControl position="top-right" />
            <ScaleControl position="bottom-left" unit="metric" />

            <Source id="focus" type="geojson" data={focusFeatures}>
              <Layer
                id="focus-ring"
                type="circle"
                paint={{
                  "circle-radius": 25,
                  "circle-color": "rgba(255, 203, 61, 0.45)",
                  "circle-stroke-color": INK,
                  "circle-stroke-width": 3,
                }}
              />
            </Source>

            <Source
              id="lieux"
              type="geojson"
              data={geojson}
              cluster
              clusterMaxZoom={15}
              clusterRadius={48}
            >
              <Layer
                id="clusters"
                type="circle"
                filter={["has", "point_count"]}
                paint={{
                  "circle-color": "#ffcb3d",
                  "circle-stroke-color": INK,
                  "circle-stroke-width": 2,
                  "circle-radius": ["step", ["get", "point_count"], 16, 25, 20, 200, 25, 1000, 31],
                }}
              />
              <Layer
                id="cluster-count"
                type="symbol"
                filter={["has", "point_count"]}
                layout={{
                  "text-field": ["get", "point_count_abbreviated"],
                  "text-font": ["Noto Sans Bold"],
                  "text-size": 13,
                  "text-allow-overlap": true,
                }}
                paint={{ "text-color": INK }}
              />
              {spritesReady && (
                <Layer
                  id="points"
                  type="symbol"
                  filter={["!", ["has", "point_count"]]}
                  layout={{
                    "icon-image": ["concat", "m-", ["get", "c"], "-", ["get", "x"]],
                    "icon-allow-overlap": true,
                    // Le disque du marqueur est centré sur le lieu, le badge dépasse en haut à droite.
                    "icon-offset": [2, -2],
                    "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.72, 14, 1],
                  }}
                />
              )}
            </Source>
          </MapView>
        ) : (
          <p role="status" className="flex h-full items-center justify-center text-ink-600">
            Chargement de la carte…
          </p>
        )}
        {style && !mapReady && (
          <p
            role="status"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-ink-600"
          >
            Chargement de la carte…
          </p>
        )}
        {canSearchHere && (
          <Button
            variant="dark"
            className="absolute top-3 left-1/2 -translate-x-1/2 shadow-lg"
            onClick={() => setSearchArea(bounds)}
          >
            <Search aria-hidden="true" />
            Rechercher dans cette zone
          </Button>
        )}
      </div>
    </div>
  );
}
