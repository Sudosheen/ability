"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { nearestPoint, type Bounds } from "@/lib/search";
import type { Category } from "@/lib/types";
import { HERAULT_BOUNDS, loadAbilityStyle } from "./map-style";
import { addMarkerImages, type MarkerLook } from "./marker-sprites";

const INK = "#1d1b16";
const CLUSTER_MAX_ZOOM = 15;
/** Rayon de détection d'un clic autour d'un marqueur, en pixels (cible de 44 px). */
const HIT_RADIUS_PX = 22;

/**
 * Un lieu à dessiner. `rank` (0 = le premier) suit l'ordre de la liste :
 * quand des marqueurs se chevauchent, les mieux classés passent au-dessus.
 */
export type MapPoint = { id: string; c: Category; look: MarkerLook; coordinates: [number, number]; rank?: number };

/** Où amener la carte. Un nouvel objet déclenche le déplacement. */
export type MapTarget = { lng: number; lat: number; zoom: number };

/** Le navigateur sait-il afficher une carte WebGL ? */
function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Carte des lieux, partagée par la Recherche et la Carte : fond Ability,
 * marqueurs regroupés, anneau sur les lieux mis en avant. Elle ne garde aucun
 * état métier : tout arrive par les props, tout ressort par les rappels.
 * Si le navigateur ne peut pas afficher la carte, `onUnavailable` est appelé :
 * la page doit alors proposer la liste à la place.
 */
export function MapCanvas({
  points,
  focusIds = [],
  target,
  onSelect,
  onMove,
  onUnavailable,
  label,
  cluster = true,
}: {
  points: MapPoint[];
  focusIds?: string[];
  target: MapTarget | null;
  onSelect: (id: string) => void;
  /** Emprise après chaque déplacement ; `byUser` vaut vrai si l'utilisateur a déplacé la carte (glisser, zoomer). */
  onMove?: (bounds: Bounds, byUser: boolean) => void;
  onUnavailable: () => void;
  /** Nom accessible de la région « carte ». */
  label: string;
  /** Regrouper les marqueurs proches (utile au-delà de quelques centaines de lieux). */
  cluster?: boolean;
}) {
  const mapRef = useRef<MapRef>(null);
  const [style, setStyle] = useState<StyleSpecification | string | null>(null);
  const [ready, setReady] = useState(false);
  const [spritesReady, setSpritesReady] = useState(false);
  const failed = useRef(false);
  // Dernière cible déjà appliquée : évite de relancer l'animation vers l'endroit où la carte se trouve.
  const applied = useRef<MapTarget | null>(null);

  const fail = () => {
    if (failed.current) return;
    failed.current = true;
    onUnavailable();
  };

  useEffect(() => {
    if (!webglAvailable()) {
      fail();
      return;
    }
    let cancelled = false;
    loadAbilityStyle().then((s) => !cancelled && setStyle(s));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vérification unique au montage
  }, []);

  // Déplace la carte quand la page demande une nouvelle cible.
  useEffect(() => {
    if (!ready || !target || applied.current === target) return;
    applied.current = target;
    mapRef.current?.flyTo({ center: [target.lng, target.lat], zoom: target.zoom, duration: 900 });
  }, [ready, target]);

  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: p.coordinates },
        properties: { id: p.id, c: p.c, x: p.look, r: p.rank ?? 0 },
      })),
    }),
    [points],
  );

  // Clé stable : les données de l'anneau ne changent que si la sélection change,
  // pas à chaque rendu de la page (sinon la source est rechargée à chaque déplacement).
  const focusKey = focusIds.join("|");
  const focus = useMemo(() => {
    const ids = new Set(focusKey ? focusKey.split("|") : []);
    return {
      type: "FeatureCollection" as const,
      features: points
        .filter((p) => ids.has(p.id))
        .map((p) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: p.coordinates }, properties: {} })),
    };
  }, [points, focusKey]);

  const emitBounds = (byUser: boolean) => {
    const b = mapRef.current?.getBounds();
    if (b) onMove?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], byUser);
  };

  const onLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    setReady(true);
    addMarkerImages(map, Math.min(3, Math.ceil(window.devicePixelRatio || 1) + 1))
      .then(() => setSpritesReady(true))
      .catch(() => setSpritesReady(false));
    if (target) {
      applied.current = target;
      map.jumpTo({ center: [target.lng, target.lat], zoom: target.zoom });
    }
    emitBounds(false);
  };

  const onClick = async (event: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    // 1. On demande à la carte ce qui est sous le clic : regroupement ou lieu.
    try {
      const layerIds = ["points", "clusters"].filter((id) => map.getLayer(id));
      const feature = map.queryRenderedFeatures(event.point, { layers: layerIds })[0];
      if (feature && feature.geometry.type === "Point") {
        const clusterId = feature.properties?.cluster_id as number | undefined;
        if (clusterId !== undefined) {
          const source = map.getSource("lieux") as GeoJSONSource | undefined;
          const zoom = (await source?.getClusterExpansionZoom(clusterId)) ?? map.getZoom() + 2;
          map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom, duration: 500 });
        } else {
          onSelect(String(feature.properties?.id));
        }
        return;
      }
    } catch {
      // L'index interne de MapLibre s'est montré peu fiable dans certaines vues : on passe au point 2.
    }
    // 2. Sans regroupement, chaque lieu est dessiné seul : on retrouve le marqueur le plus
    // proche du clic à partir de la position des lieux, que la page connaît.
    if (!cluster) {
      const screen = points.map((p) => {
        const { x, y } = map.project(p.coordinates);
        return { id: p.id, x, y };
      });
      const id = nearestPoint(screen, event.point, HIT_RADIUS_PX);
      if (id) onSelect(id);
    }
  };

  return (
    <div role="region" aria-label={label} className="relative h-full w-full bg-butter-100">
      {style && (
        <MapView
          ref={mapRef}
          mapStyle={style}
          initialViewState={{ bounds: HERAULT_BOUNDS, fitBoundsOptions: { padding: 24 } }}
          maxBounds={[1.2, 42.4, 5.6, 44.8]}
          minZoom={7}
          maxZoom={19}
          onLoad={onLoad}
          onError={(e) => {
            if (/webgl/i.test(String(e.error?.message ?? e.error))) fail();
          }}
          // Seuls les gestes de l'utilisateur portent un événement d'origine ; flyTo et jumpTo n'en ont pas.
          onMoveEnd={(e) => emitBounds(Boolean(e.originalEvent))}
          onClick={onClick}
          interactiveLayerIds={spritesReady ? ["clusters", "points"] : ["clusters"]}
          cursor="grab"
          onMouseEnter={(e) => {
            e.target.getCanvas().style.cursor = "pointer";
          }}
          onMouseLeave={(e) => {
            e.target.getCanvas().style.cursor = "";
          }}
          attributionControl={{
            customAttribution: "Accessibilité : Acceslibre, © contributeurs OpenStreetMap, Tourisme & Handicap",
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          <GeolocateControl position="bottom-right" />
          <ScaleControl position="bottom-left" unit="metric" />

          <Source id="focus" type="geojson" data={focus}>
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

          <Source id="lieux" type="geojson" data={data} cluster={cluster} clusterMaxZoom={CLUSTER_MAX_ZOOM} clusterRadius={48}>
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
                  // MapLibre dessine d'abord les clés basses : le rang 0 doit avoir la clé la plus haute.
                  "symbol-sort-key": ["-", ["get", "r"]],
                  // Le disque du marqueur est centré sur le lieu, le badge dépasse en haut à droite.
                  "icon-offset": [2, -2],
                  "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.72, 14, 1],
                }}
              />
            )}
          </Source>
        </MapView>
      )}
      {!ready && (
        <p role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center text-ink-600">
          Chargement de la carte…
        </p>
      )}
    </div>
  );
}
