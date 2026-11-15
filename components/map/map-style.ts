/**
 * Fond de carte : style Positron d'OpenFreeMap (tuiles vectorielles gratuites,
 * sans clé ni quota), reteinté aux couleurs Ability.
 */
import type { StyleSpecification } from "maplibre-gl";

export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/** Emprise de l'Hérault : [ouest, sud, est, nord]. */
export const HERAULT_BOUNDS: [number, number, number, number] = [2.53, 43.21, 4.2, 43.98];

const PAINT: Record<string, Record<string, unknown>> = {
  background: { "background-color": "#fffaea" },
  park: { "fill-color": "#e6f0cf" },
  landcover_wood: { "fill-color": "#dcebc4" },
  landuse_residential: { "fill-color": "#fbf2d9" },
  water: { "fill-color": "#b9dff0" },
  waterway: { "line-color": "#9fd0e6" },
  building: { "fill-color": "#f3e8c8", "fill-outline-color": "#e3d5ad" },
  road_area_pier: { "fill-color": "#fffaea" },
  road_pier: { "line-color": "#fffaea" },
  highway_path: { "line-color": "#eadfc0" },
  highway_minor: { "line-color": "#ffffff" },
  highway_major_casing: { "line-color": "#dccfa8" },
  highway_major_subtle: { "line-color": "#dccfa8" },
  highway_motorway_casing: { "line-color": "#d2c296" },
  highway_motorway_subtle: { "line-color": "#d2c296" },
  highway_motorway_bridge_casing: { "line-color": "#d2c296" },
  tunnel_motorway_casing: { "line-color": "#dccfa8" },
  railway: { "line-color": "#d8cfb8" },
  railway_transit: { "line-color": "#d8cfb8" },
  railway_service: { "line-color": "#d8cfb8" },
  "highway-name-minor": { "text-color": "#5c574a" },
  "highway-name-major": { "text-color": "#5c574a" },
  label_village: { "text-color": "#1d1b16" },
  label_town: { "text-color": "#1d1b16" },
  label_city: { "text-color": "#1d1b16" },
  label_city_capital: { "text-color": "#1d1b16" },
};

/** Charge le style et le reteinte. En cas d'échec, rend l'adresse du style d'origine. */
export async function loadAbilityStyle(): Promise<StyleSpecification | string> {
  try {
    const res = await fetch(OPENFREEMAP_STYLE);
    if (!res.ok) throw new Error(String(res.status));
    const style = (await res.json()) as StyleSpecification;
    for (const layer of style.layers) {
      const patch = PAINT[layer.id];
      if (patch) {
        (layer as { paint?: Record<string, unknown> }).paint = {
          ...(layer as { paint?: Record<string, unknown> }).paint,
          ...patch,
        };
      }
    }
    return style;
  } catch {
    return OPENFREEMAP_STYLE;
  }
}
