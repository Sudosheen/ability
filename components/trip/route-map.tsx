"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import MapView, { Layer, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";
import { HERAULT_BOUNDS, loadAbilityStyle } from "@/components/map/map-style";
import type { Trip } from "@/lib/trip";
import { dayLabel } from "@/lib/trip";

/** Une couleur par jour, toujours doublée du numéro de jour dans la légende et la liste. */
type PointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { label: string; color: string; text: string };
};
type LineFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: { color: string };
};

export const DAY_COLORS = ["#1d1b16", "#1565c0", "#2e7d32", "#b3261e", "#5b2a86", "#c25e00", "#0b4a8f"];

/**
 * Carte d'un séjour : l'hébergement (H), les étapes numérotées de chaque
 * jour et un tracé à vol d'oiseau par jour. Le programme détaillé reste
 * toujours disponible sous forme de liste à côté de la carte.
 */
export function RouteMap({ trip, className }: { trip: Trip; className?: string }) {
  const mapRef = useRef<MapRef>(null);
  const [style, setStyle] = useState<StyleSpecification | string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAbilityStyle().then((s) => !cancelled && setStyle(s));
    return () => {
      cancelled = true;
    };
  }, []);

  const { points, lines, coords } = useMemo(() => {
    const base = trip.hebergement;
    const pts: PointFeature[] = [];
    const lns: LineFeature[] = [];
    const all: [number, number][] = [];
    if (base) {
      pts.push({ type: "Feature", geometry: { type: "Point", coordinates: [base.lng, base.lat] }, properties: { label: "H", color: "#ffcb3d", text: "#1d1b16" } });
      all.push([base.lng, base.lat]);
    }
    trip.programme.forEach((day, d) => {
      const color = DAY_COLORS[d % DAY_COLORS.length];
      const path: [number, number][] = base ? [[base.lng, base.lat]] : [];
      day.forEach((s, i) => {
        pts.push({ type: "Feature", geometry: { type: "Point", coordinates: [s.lng, s.lat] }, properties: { label: String(i + 1), color, text: "#ffffff" } });
        path.push([s.lng, s.lat]);
        all.push([s.lng, s.lat]);
      });
      if (base && day.length) path.push([base.lng, base.lat]);
      if (path.length > 1) lns.push({ type: "Feature", geometry: { type: "LineString", coordinates: path }, properties: { color } });
    });
    return {
      points: { type: "FeatureCollection" as const, features: pts },
      lines: { type: "FeatureCollection" as const, features: lns },
      coords: all,
    };
  }, [trip]);

  // Cadre la carte sur le séjour à chaque changement du programme.
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || coords.length === 0) return;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48, maxZoom: 15, duration: 0 },
    );
  }, [coords, loaded]);

  const days = trip.programme.map((d, i) => ({ i, n: d.length })).filter((d) => d.n > 0);

  return (
    <figure className={className}>
      <div
        role="region"
        aria-label="Carte du séjour. Le détail de chaque journée est dans le programme."
        className="relative h-80 overflow-hidden rounded-2xl border border-ink-200 bg-butter-100 print:h-[11cm]"
      >
        {style && (
          <MapView
            ref={mapRef}
            mapStyle={style}
            initialViewState={{ bounds: HERAULT_BOUNDS, fitBoundsOptions: { padding: 24 } }}
            onLoad={() => setLoaded(true)}
            // Garde l'image de la carte pour l'impression du dossier.
            canvasContextAttributes={{ preserveDrawingBuffer: true }}
            attributionControl={{ compact: true }}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" showCompass={false} />
            <Source id="trajets" type="geojson" data={lines}>
              <Layer
                id="trajets"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": ["get", "color"], "line-width": 3, "line-dasharray": [2, 1.5] }}
              />
            </Source>
            <Source id="etapes" type="geojson" data={points}>
              <Layer
                id="etapes"
                type="circle"
                paint={{ "circle-radius": 13, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 }}
              />
              <Layer
                id="etapes-num"
                type="symbol"
                layout={{ "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true }}
                paint={{ "text-color": ["get", "text"] }}
              />
            </Source>
          </MapView>
        )}
        {coords.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-ink-700">
            Choisissez un hébergement et des étapes pour voir le séjour sur la carte.
          </p>
        )}
      </div>
      {days.length > 0 && (
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-700">
          {trip.hebergement && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full border-2 border-white bg-sun-400 text-xs font-bold text-ink-900 ring-1 ring-ink-400">H</span>
              Hébergement
            </span>
          )}
          {days.map(({ i }) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-1 w-6 rounded" style={{ backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }} />
              {dayLabel(trip, i).split(" · ")[0]}
            </span>
          ))}
          <span>Tracés à vol d&apos;oiseau, à titre indicatif.</span>
        </figcaption>
      )}
    </figure>
  );
}
