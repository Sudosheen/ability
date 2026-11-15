/**
 * Marqueurs de la carte : un pictogramme de catégorie dans un anneau dont la
 * couleur ET la forme du badge donnent l'accessibilité (jamais la couleur seule).
 *
 *   oui : anneau vert, coche           partiel : anneau orange, point d'exclamation
 *   non : anneau rouge, croix          inconnu : anneau gris en pointillés, « ? »
 *   divergent : anneau noir, badge jaune « ≠ »
 *
 * En coloration « selon mon profil », trois aspects : compatible (comme oui),
 * incompatible (comme non) et à confirmer (anneau orange, « ? »).
 */
import { ACCESS_META, ACCESS_ORDER, CATEGORY_ORDER } from "@/lib/labels";
import type { Compatibility } from "@/lib/matching";
import type { AccessStatus, Category } from "@/lib/types";
import { CATEGORY_ICON_SVG } from "./marker-icons";

export const MARKER_SIZE = 44;
const INK = "#1d1b16";

/** Aspect d'un marqueur : un statut d'accessibilité, ou « à confirmer » pour un profil. */
export type MarkerLook = AccessStatus | "confirmer";

const LOOKS: MarkerLook[] = [...ACCESS_ORDER, "confirmer"];

export const COMPAT_LOOK: Record<Compatibility, MarkerLook> = {
  compatible: "oui",
  a_confirmer: "confirmer",
  incompatible: "non",
};

export const COMPAT_COLOR: Record<Compatibility, string> = {
  compatible: ACCESS_META.oui.couleur,
  a_confirmer: ACCESS_META.partiel.couleur,
  incompatible: ACCESS_META.non.couleur,
};

const question = (c: string) =>
  `<text x="33" y="15" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="700" fill="${c}">?</text>`;

const BADGE_GLYPH: Record<MarkerLook, (color: string) => string> = {
  oui: (c) =>
    `<path d="M29.4 11.2l2.6 2.6 4.8-5.4" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  partiel: (c) =>
    `<path d="M33 6.4v5.2" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><circle cx="33" cy="15" r="1.3" fill="${c}"/>`,
  non: (c) =>
    `<path d="M30 8l6 6M36 8l-6 6" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`,
  inconnu: question,
  confirmer: question,
  divergent: (c) =>
    `<path d="M29.4 9.4h7.2M29.4 12.8h7.2M35.4 6.6l-4.8 9" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
};

export function markerImageId(category: Category, look: MarkerLook) {
  return `m-${category}-${look}`;
}

/** SVG d'un marqueur, dessiné sur une grille de 44 x 44. */
export function markerSvg(category: Category, status: MarkerLook, pixelRatio = 2): string {
  const ring = status === "confirmer" ? ACCESS_META.partiel.couleur : ACCESS_META[status].couleur;
  const badgeFill = status === "divergent" ? "#ffcb3d" : ring;
  const glyph = status === "divergent" ? INK : "#ffffff";
  const dash = status === "inconnu" ? ' stroke-dasharray="4 3"' : "";
  const size = MARKER_SIZE * pixelRatio;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${MARKER_SIZE} ${MARKER_SIZE}">` +
    `<circle cx="20" cy="24" r="16.5" fill="#ffffff"/>` +
    `<circle cx="20" cy="24" r="15" fill="#ffffff" stroke="${ring}" stroke-width="3.5"${dash}/>` +
    `<g transform="translate(11 15) scale(0.75)" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_ICON_SVG[category]}</g>` +
    `<circle cx="33" cy="11" r="8" fill="${badgeFill}" stroke="#ffffff" stroke-width="2"/>` +
    BADGE_GLYPH[status](glyph) +
    `</svg>`
  );
}

export function markerDataUri(category: Category, status: MarkerLook, pixelRatio = 2) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markerSvg(category, status, pixelRatio))}`;
}

type ImageHost = {
  hasImage(id: string): boolean;
  addImage(id: string, image: HTMLImageElement, options?: { pixelRatio?: number }): unknown;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Marqueur illisible"));
    img.src = src;
  });
}

/** Enregistre dans la carte une image par couple catégorie x aspect. */
export async function addMarkerImages(map: ImageHost, pixelRatio = 2) {
  await Promise.all(
    CATEGORY_ORDER.flatMap((category) =>
      LOOKS.map(async (status) => {
        const id = markerImageId(category, status);
        if (map.hasImage(id)) return;
        const img = await loadImage(markerDataUri(category, status, pixelRatio));
        if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio });
      }),
    ),
  );
}
