"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { List, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "cn";
import { FilterChip } from "@/components/ability/filter-chip";
import { PlaceCard } from "@/components/ability/place-card";
import { CategoryFilter, COMPAT_ORDER, ProfileBox, StatusFilter, type Coloring } from "@/components/map/filters";
import { MapCanvas, type MapPoint, type MapTarget } from "@/components/map/map-canvas";
import { COMPAT_LOOK } from "@/components/map/marker-sprites";
import { usePlaces, useUrlPreset } from "@/components/map/use-places";
import { Button } from "@/components/ui/button";
import { findCommune, type Commune } from "@/lib/data";
import { ACCESS_ORDER, CATEGORY_LABELS, formatNumber } from "@/lib/labels";
import type { Compatibility } from "@/lib/matching";
import {
  SORT_LABELS,
  boundsCenter,
  boundsRadiusKm,
  countAccess,
  countCompat,
  formatDistance,
  matchesFilters,
  resultsAround,
  sortResults,
  type Bounds,
  type Result,
  type SortKey,
} from "@/lib/search";
import { useProfile } from "@/lib/storage";
import type { AccessStatus, Category } from "@/lib/types";

const TYPES: Category[] = ["hebergement", "restauration", "activite", "plage"];
const RAYONS = [5, 10, 20, 30];
const PAGE = 20;

type Zone = { lat: number; lng: number; km: number; nom: string };

function title(categories: Set<Category>): string {
  if (categories.size === 1) return CATEGORY_LABELS[[...categories][0]];
  return "Lieux";
}

/** Un résultat : la carte du lieu, sa distance, et un lien vers sa fiche. */
function ResultItem({ result, zoneName, onHover }: { result: Result; zoneName: string; onHover?: (id: string | null) => void }) {
  const p = result.feature.properties;
  return (
    <Link
      href={`/lieu/?id=${p.id}`}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(p.id)}
      onBlur={() => onHover?.(null)}
      className="group flex flex-col rounded-2xl border border-ink-200 bg-white hover:border-ink-900 hover:bg-butter-50"
    >
      <PlaceCard place={p} evaluation={result.evaluation ?? undefined} className="border-0 bg-transparent" />
      <span className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 px-3 py-2 text-sm">
        <span className="flex items-center gap-1 text-ink-700">
          <MapPin aria-hidden="true" className="size-4" />
          à {formatDistance(result.km)} de {zoneName}
        </span>
        <span className="font-bold underline underline-offset-4 group-hover:decoration-2">Voir la fiche</span>
      </span>
    </Link>
  );
}

/**
 * Page Recherche : des résultats autour d'une destination, la liste d'abord.
 * La carte des mêmes résultats est une option (« Carte »). La liste ne dépend
 * jamais de la carte : elle marche aussi quand la carte ne peut pas s'afficher.
 */
export function ResultsPage({ communes }: { communes: Commune[] }) {
  const params = useSearchParams();
  const profile = useProfile();
  const presetApplied = useUrlPreset(profile);
  const initial = findCommune(communes, params.get("ou") ?? "");

  const [where, setWhere] = useState(initial?.nom ?? params.get("ou") ?? "");
  const [whereMessage, setWhereMessage] = useState(params.get("ou") && !initial ? `« ${params.get("ou")} » : commune introuvable dans l'Hérault.` : "");
  const [zone, setZone] = useState<Zone | null>(initial ? { lat: initial.lat, lng: initial.lng, km: 10, nom: initial.nom } : null);
  const [categories, setCategories] = useState<Set<Category>>(() => new Set<Category>(["hebergement"]));
  const [compat, setCompat] = useState<Set<Compatibility>>(() => new Set(COMPAT_ORDER));
  const [access, setAccess] = useState<Set<AccessStatus>>(() => new Set(ACCESS_ORDER));
  const [coloringChoice, setColoringChoice] = useState<Coloring | null>(null);
  const [sortChoice, setSortChoice] = useState<SortKey | null>(null);
  const [view, setView] = useState<"liste" | "carte">("liste");
  const [limit, setLimit] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  // Vrai dès que l'utilisateur déplace la carte lui-même, remis à faux à chaque nouvelle recherche.
  const [userMoved, setUserMoved] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [target, setTarget] = useState<MapTarget | null>(initial ? { lng: initial.lng, lat: initial.lat, zoom: 12 } : null);

  const { features, evaluations, loading, error } = usePlaces(categories, profile);
  const coloring: Coloring = profile ? (coloringChoice ?? "profil") : "sources";
  const byProfile = coloring === "profil" && evaluations !== null;
  const sortKey: SortKey = sortChoice && (sortChoice !== "compatible" || byProfile) ? sortChoice : byProfile ? "compatible" : "verifie";

  const around = useMemo(
    () => (zone ? resultsAround(features, zone, zone.km, evaluations) : []),
    [features, zone, evaluations],
  );
  const results = useMemo(
    () => sortResults(around.filter((r) => matchesFilters(r, { compat: byProfile ? compat : null, access })), sortKey),
    [around, byProfile, compat, access, sortKey],
  );
  const shown = results.slice(0, limit);
  const selected = selectedId ? results.find((r) => r.feature.properties.id === selectedId) : undefined;

  // La carte montre les mêmes résultats que la liste, dans le même ordre :
  // le tri et « Afficher plus » s'y appliquent aussi.
  const points: MapPoint[] = useMemo(
    () =>
      results.slice(0, limit).map((r, rank) => ({
        id: r.feature.properties.id,
        c: r.feature.properties.c,
        look: byProfile && r.evaluation ? COMPAT_LOOK[r.evaluation.statut] : r.feature.properties.a,
        coordinates: r.feature.geometry.coordinates,
        rank,
      })),
    [results, limit, byProfile],
  );

  const showMore = results.length > shown.length && (
    <Button variant="outline" className="flex-wrap self-center" onClick={() => setLimit((l) => l + PAGE)}>
      Afficher {Math.min(PAGE, results.length - shown.length)} résultats de plus
      <span className="font-normal text-ink-600">
        ({shown.length} sur {results.length})
      </span>
    </Button>
  );

  const search = (query: string) => {
    const c = findCommune(communes, query);
    if (!c) {
      setWhereMessage(query.trim() ? `« ${query} » : commune introuvable dans l'Hérault.` : "Indiquez une commune.");
      return;
    }
    setWhere(c.nom);
    setWhereMessage("");
    setZone({ lat: c.lat, lng: c.lng, km: zone?.km ?? 10, nom: c.nom });
    setTarget({ lng: c.lng, lat: c.lat, zoom: 12 });
    setUserMoved(false);
    setLimit(PAGE);
    setSelectedId(null);
  };

  const searchHere = () => {
    if (!mapBounds) return;
    const c = boundsCenter(mapBounds);
    setZone({ ...c, km: Math.max(1, Math.round(boundsRadiusKm(mapBounds))), nom: "la zone affichée" });
    setUserMoved(false);
    setLimit(PAGE);
    setSelectedId(null);
  };

  // Le bouton « Rechercher dans cette zone » n'apparaît qu'après un déplacement fait par l'utilisateur.
  const moved =
    userMoved &&
    mapBounds &&
    zone &&
    (Math.abs(boundsCenter(mapBounds).lat - zone.lat) > 0.01 || Math.abs(boundsCenter(mapBounds).lng - zone.lng) > 0.01);
  const sortKeys: SortKey[] = byProfile ? ["compatible", "verifie", "proche"] : ["verifie", "proche"];
  const zoneName = zone?.nom === "la zone affichée" ? "son centre" : (zone?.nom ?? "");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl sm:text-4xl">
          {title(categories)}
          {zone ? (zone.nom === "la zone affichée" ? " dans la zone affichée" : ` autour de ${zone.nom}`) : ""}
        </h1>
        <form
          role="search"
          aria-label="Changer de destination"
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            search(where);
          }}
        >
          <label className="flex min-w-56 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink-600">
              <MapPin aria-hidden="true" className="size-4" />
              Où ?
            </span>
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              list="communes-recherche"
              placeholder="Sète, Montpellier, Agde…"
              autoComplete="off"
              className="min-h-11 w-full rounded-full border border-input bg-white px-4 font-bold placeholder:font-normal placeholder:text-ink-600"
            />
            <datalist id="communes-recherche">
              {communes.map((c) => (
                <option key={c.nom} value={c.nom} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-ink-600">Rayon</span>
            <select
              value={zone?.km ?? 10}
              onChange={(e) => {
                const km = Number(e.target.value);
                if (zone) setZone({ ...zone, km });
                setLimit(PAGE);
              }}
              className="min-h-11 cursor-pointer rounded-full border border-input bg-white px-4 font-bold"
            >
              {[...new Set([...RAYONS, zone?.km ?? 10])].sort((a, b) => a - b).map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">
            <Search aria-hidden="true" />
            Rechercher
          </Button>
        </form>
        <p role="status" className="text-sm font-bold text-ko-700 empty:hidden">
          {whereMessage}
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <aside aria-label="Profil et filtres" className="flex flex-col gap-5 lg:sticky lg:top-4">
          <ProfileBox
            profile={profile}
            presetApplied={presetApplied}
            coloring={profile ? coloring : undefined}
            onColoring={setColoringChoice}
          />
          <Button
            variant="outline"
            className="self-start lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls="filtres-recherche"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal aria-hidden="true" />
            Filtres
          </Button>
          <div id="filtres-recherche" className={cn("flex-col gap-5 lg:flex", filtersOpen ? "flex" : "hidden")}>
            <CategoryFilter options={TYPES} value={categories} onChange={(c) => {
                setCategories(c);
                setLimit(PAGE);
              }} />
            <StatusFilter
              byProfile={byProfile}
              compat={compat}
              onCompat={setCompat}
              compatCounts={countCompat(around)}
              access={access}
              onAccess={setAccess}
              accessCounts={countAccess(around)}
            />
          </div>
        </aside>

        <section aria-labelledby="titre-resultats" className="flex min-w-0 flex-col gap-4">
          <h2 id="titre-resultats" className="sr-only">
            Résultats
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="font-bold">
              {!zone
                ? "Indiquez une destination pour voir les résultats."
                : loading
                  ? "Chargement des lieux…"
                  : `${formatNumber(results.length)} résultat${results.length > 1 ? "s" : ""}`}
            </p>
            <div role="group" aria-label="Affichage des résultats" className="flex rounded-full border border-ink-400 bg-white p-1">
              {(["liste", "carte"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 font-bold",
                    view === v ? "bg-ink-900 text-white" : "text-ink-900 hover:bg-butter-100",
                  )}
                >
                  {v === "liste" ? <List aria-hidden="true" className="size-5" /> : <MapIcon aria-hidden="true" className="size-5" />}
                  {v === "liste" ? "Liste" : "Carte"}
                </button>
              ))}
            </div>
          </div>
          <div role="group" aria-label="Trier les résultats" className="flex flex-wrap gap-2">
            {sortKeys.map((k) => (
              <FilterChip key={k} pressed={sortKey === k} onPressedChange={() => setSortChoice(k)}>
                {SORT_LABELS[k]}
              </FilterChip>
            ))}
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-ko-100 p-3 font-bold text-ko-700">
              Les données n&apos;ont pas pu être chargées. Rechargez la page.
            </p>
          )}

          {view === "liste" || mapUnavailable ? (
            <>
              {mapUnavailable && view === "carte" && (
                <p role="alert" className="rounded-2xl border-2 border-ink-900 bg-white p-3">
                  La carte ne peut pas s&apos;afficher sur cet appareil. Voici les mêmes résultats sous forme de liste.
                </p>
              )}
              {zone && !loading && results.length === 0 && (
                <p className="rounded-2xl border border-dashed border-ink-400 p-4 text-ink-700">
                  Aucun résultat avec ces filtres. Élargissez le rayon ou cochez d&apos;autres types de lieux.
                </p>
              )}
              <ol className="grid gap-3 xl:grid-cols-2">
                {shown.map((r) => (
                  <li key={r.feature.properties.id}>
                    <ResultItem result={r} zoneName={zoneName} />
                  </li>
                ))}
              </ol>
              {showMore}
            </>
          ) : (
            <>
            {results.length > 0 && (
              <p className="text-ink-700">
                {shown.length < results.length
                  ? `Les ${shown.length} premiers résultats, triés par « ${SORT_LABELS[sortKey].toLowerCase()} », comme dans la liste.`
                  : `Les ${results.length} résultats, comme dans la liste.`}
              </p>
            )}
            <div className="relative h-[70dvh] min-h-96 overflow-hidden rounded-2xl border border-ink-200">
              <MapCanvas
                points={points}
                focusIds={[selectedId, hoveredId].filter((x): x is string => Boolean(x))}
                target={target}
                onSelect={setSelectedId}
                onMove={(bounds, byUser) => {
                  setMapBounds(bounds);
                  if (byUser) setUserMoved(true);
                }}
                onUnavailable={() => setMapUnavailable(true)}
                label="Carte des résultats. Les mêmes résultats sont dans la liste."
                cluster={false}
              />
              {moved && (
                <Button variant="dark" className="absolute top-3 left-1/2 -translate-x-1/2 shadow-lg" onClick={searchHere}>
                  <Search aria-hidden="true" />
                  Rechercher dans cette zone
                </Button>
              )}
              {selected && (
                // À gauche et au-dessus de l'échelle : les boutons de zoom restent libres, à droite.
                <div className="absolute right-16 bottom-10 left-3 flex flex-col gap-2 sm:right-auto sm:w-[26rem]">
                  <Button
                    variant="outline"
                    size="icon"
                    className="self-start bg-white shadow"
                    aria-label="Fermer l'aperçu"
                    onClick={() => setSelectedId(null)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                  <div className="shadow-lg">
                    <ResultItem result={selected} zoneName={zoneName} onHover={setHoveredId} />
                  </div>
                </div>
              )}
            </div>
            {showMore}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
