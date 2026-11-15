import type { Metadata } from "next";
import { Search } from "lucide-react";
import { PlaceCard } from "@/components/ability/place-card";
import { SearchBar } from "@/components/ability/search-bar";
import { SiteFooter } from "@/components/ability/site-chrome";
import { AccessPill, CompatibilityPill, ProofBadge } from "@/components/ability/status";
import { markerDataUri } from "@/components/map/marker-sprites";
import { Button } from "@/components/ui/button";
import { ACCESS_META, ACCESS_ORDER, CATEGORY_LABELS, PROOF_ORDER } from "@/lib/labels";
import { getMeta } from "@/lib/server-data";
import type { Category, PlaceFeatureProps } from "@/lib/types";
import { FilterChipDemo } from "./demos";

export const metadata: Metadata = { title: "Système de design" };

const COLORS: { name: string; hex: string; usage: string; dark?: boolean }[] = [
  { name: "butter-50", hex: "#FFFDF5", usage: "Fond de page" },
  { name: "butter-100", hex: "#FFF6D6", usage: "Surfaces mises en avant" },
  { name: "butter-300", hex: "#FFE58A", usage: "Survol, sélection, puces actives" },
  { name: "sun-400", hex: "#FFCB3D", usage: "Bouton principal, texte encre (≈ 11:1)" },
  { name: "sun-600", hex: "#B88A00", usage: "Icônes et bordures décoratives" },
  { name: "ink-900", hex: "#1D1B16", usage: "Texte, anneau de focus", dark: true },
  { name: "ink-600", hex: "#5C574A", usage: "Texte secondaire (≈ 7:1)", dark: true },
  { name: "ink-200", hex: "#E3DCC6", usage: "Séparateurs" },
];

const SAMPLES: PlaceFeatureProps[] = [
  { id: "a", n: "Hôtel des Dunes", c: "hebergement", a: "oui", p: "label", s: 7, co: "Sète", w: 1, k: 1 },
  { id: "b", n: "Le Quai des Brumes", c: "restauration", a: "partiel", p: "indicatif", s: 2, co: "Agde", w: 0 },
  { id: "c", n: "Musée du Vieux Port", c: "activite", a: "divergent", p: "divergent", s: 3, co: "Marseillan" },
  { id: "d", n: "Gîte du Mas Blanc", c: "hebergement", a: "inconnu", p: "inconnu", s: 2, co: null },
];

const MARKER_CATEGORIES: Category[] = ["hebergement", "restauration", "activite", "plage", "toilettes", "stationnement"];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-ink-200 py-10">
      <h2 id={id} className="text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const meta = getMeta();
  return (
    <>
      <main id="contenu" className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="text-4xl">Système de design</h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-700">
          Les briques de l&apos;interface Ability. Règle de base : le jaune est un fond, jamais une
          couleur de texte, et aucun statut ne repose sur la couleur seule.
        </p>

        <Block title="Couleurs">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COLORS.map((c) => (
              <li key={c.name} className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                <div
                  className="flex h-20 items-end p-2 font-bold"
                  style={{ backgroundColor: c.hex, color: c.dark ? "#fff" : "#1D1B16" }}
                >
                  {c.hex}
                </div>
                <div className="p-3">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-sm text-ink-600">{c.usage}</p>
                </div>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Typographie">
          <p className="text-sm text-ink-600">
            Atkinson Hyperlegible Next, conçue pour la basse vision. Texte courant à 18 px.
          </p>
          <p className="text-5xl font-extrabold tracking-tight">Titre 800, serré</p>
          <p className="text-2xl font-extrabold tracking-tight">Sous-titre 800</p>
          <p className="max-w-2xl">
            Texte courant 400. Les caractères proches restent distincts : Il1, O0, rn et m, B8, 5S.
          </p>
          <p className="text-sm text-ink-600">Texte secondaire, en encre 600.</p>
        </Block>

        <Block title="Boutons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <Search aria-hidden="true" />
              Action principale
            </Button>
            <Button variant="dark">Sombre</Button>
            <Button variant="outline">Contour</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="ghost">Discret</Button>
            <Button disabled>Désactivé</Button>
          </div>
          <p className="text-sm text-ink-600">
            Cibles de 44 px au moins. Au clavier, le focus est un anneau encre de 3 px.
          </p>
        </Block>

        <Block title="Barre de recherche">
          <div className="rounded-3xl bg-butter-100 p-6">
            <SearchBar communes={["Sète", "Montpellier", "Agde"]} />
          </div>
        </Block>

        <Block title="Niveaux de preuve">
          <ul className="flex flex-col gap-3">
            {PROOF_ORDER.map((level) => (
              <li key={level}>
                <ProofBadge
                  level={level}
                  date={level === "label" ? "2020-12-15" : level === "declare" ? null : "2026-03-10"}
                  dateType={
                    level === "label" ? "liste" : level === "indicatif" ? "modification" : level === "declare" ? "export" : "verification"
                  }
                  stale={level === "label"}
                  demo={level === "verifie" || level === "communaute"}
                />
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Accessibilité selon les sources">
          <div className="flex flex-wrap gap-2">
            {ACCESS_ORDER.map((s) => (
              <AccessPill key={s} status={s} />
            ))}
          </div>
        </Block>

        <Block title="Compatibilité avec un profil">
          <div className="flex flex-wrap gap-2">
            <CompatibilityPill status="compatible" />
            <CompatibilityPill status="a_confirmer" />
            <CompatibilityPill status="incompatible" />
          </div>
          <p className="text-sm text-ink-600">
            Un critère bloquant inconnu ou divergent donne toujours « À confirmer ».
          </p>
        </Block>

        <Block title="Puces de filtre">
          <FilterChipDemo />
        </Block>

        <Block title="Cartes de résultat">
          <ul className="grid gap-3 md:grid-cols-2">
            {SAMPLES.map((p) => (
              <li key={p.id}>
                <PlaceCard place={p} />
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-600">Exemples fictifs.</p>
        </Block>

        <Block title="Marqueurs de carte">
          <p className="text-sm text-ink-600">
            Le pictogramme donne la catégorie. L&apos;anneau et le badge donnent l&apos;accessibilité,
            par la couleur et par la forme.
          </p>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-x-4 border-spacing-y-2 text-sm">
              <thead>
                <tr>
                  <td />
                  {ACCESS_ORDER.map((s) => (
                    <th key={s} scope="col" className="font-bold">
                      {ACCESS_META[s].court}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MARKER_CATEGORIES.map((c) => (
                  <tr key={c}>
                    <th scope="row" className="text-left font-bold">
                      {CATEGORY_LABELS[c]}
                    </th>
                    {ACCESS_ORDER.map((s) => (
                      <td key={s} className="text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={markerDataUri(c, s)}
                          width={44}
                          height={44}
                          alt=""
                          className="inline-block"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
