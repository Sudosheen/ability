"use client";

import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { CategoryIcon } from "@/components/ability/category-icon";
import { FilterChip } from "@/components/ability/filter-chip";
import { COMPAT_LABELS } from "@/components/ability/status";
import { Button } from "@/components/ui/button";
import { ACCESS_META, ACCESS_ORDER, CATEGORY_LABELS } from "@/lib/labels";
import type { Compatibility } from "@/lib/matching";
import { describeProfile, type NeedsProfile } from "@/lib/profile";
import type { AccessStatus, Category } from "@/lib/types";
import { COMPAT_COLOR } from "./marker-sprites";

export const COMPAT_ORDER: Compatibility[] = ["compatible", "a_confirmer", "incompatible"];
export type Coloring = "profil" | "sources";

const legend = "mb-2 text-sm font-bold tracking-wide text-ink-600 uppercase";

export function toggle<T>(set: Set<T>, value: T, on: boolean): Set<T> {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

/** Résumé du profil (ou invitation à le créer), et choix de la couleur des marqueurs. */
export function ProfileBox({
  profile,
  presetApplied,
  coloring,
  onColoring,
}: {
  profile: NeedsProfile | null;
  presetApplied: boolean;
  coloring?: Coloring;
  onColoring?: (c: Coloring) => void;
}) {
  if (!profile) {
    return (
      <section aria-label="Mon profil" className="flex flex-col gap-2 rounded-2xl bg-butter-100 p-4">
        <p className="font-extrabold">Ces lieux vous conviennent-ils, à vous ?</p>
        <p className="text-sm text-ink-700">
          Sans profil, Ability montre seulement ce que disent les sources. Décrivez vos besoins en deux minutes pour
          voir ce qui est compatible, à confirmer ou incompatible.
        </p>
        <Button asChild className="self-start">
          <Link href="/profil/">
            Décrire mes besoins
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  }
  return (
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
      {coloring && onColoring && (
        <div role="group" aria-label="Couleur des marqueurs" className="flex flex-wrap gap-2">
          {(["profil", "sources"] as Coloring[]).map((c) => (
            <FilterChip key={c} pressed={coloring === c} onPressedChange={() => onColoring(c)}>
              {c === "profil" ? "Selon mon profil" : "Selon les sources"}
            </FilterChip>
          ))}
        </div>
      )}
    </section>
  );
}

export function CategoryFilter({
  options,
  value,
  onChange,
  counts,
  title = "Types de lieux",
}: {
  options: Category[];
  value: Set<Category>;
  onChange: (next: Set<Category>) => void;
  counts?: Partial<Record<Category, number>>;
  title?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={legend}>{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => (
          <FilterChip
            key={c}
            pressed={value.has(c)}
            onPressedChange={(on) => onChange(toggle(value, c, on))}
            count={counts?.[c]}
            icon={<CategoryIcon category={c} className="size-4" />}
          >
            {CATEGORY_LABELS[c]}
          </FilterChip>
        ))}
      </div>
    </fieldset>
  );
}

/** Filtre par compatibilité (avec un profil coloré « selon mon profil ») ou par accessibilité selon les sources. */
export function StatusFilter({
  byProfile,
  compat,
  onCompat,
  compatCounts,
  access,
  onAccess,
  accessCounts,
}: {
  byProfile: boolean;
  compat: Set<Compatibility>;
  onCompat: (next: Set<Compatibility>) => void;
  compatCounts: Record<Compatibility, number>;
  access: Set<AccessStatus>;
  onAccess: (next: Set<AccessStatus>) => void;
  accessCounts: Record<AccessStatus, number>;
}) {
  const dot = (color: string) => (
    <span aria-hidden="true" className="size-3 rounded-full border-2" style={{ borderColor: color }} />
  );
  return byProfile ? (
    <fieldset className="flex flex-col gap-2">
      <legend className={legend}>Compatibilité avec mon profil</legend>
      <div className="flex flex-wrap gap-2">
        {COMPAT_ORDER.map((s) => (
          <FilterChip key={s} pressed={compat.has(s)} onPressedChange={(on) => onCompat(toggle(compat, s, on))} count={compatCounts[s]} icon={dot(COMPAT_COLOR[s])}>
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
          <FilterChip key={s} pressed={access.has(s)} onPressedChange={(on) => onAccess(toggle(access, s, on))} count={accessCounts[s]} icon={dot(ACCESS_META[s].couleur)}>
            {ACCESS_META[s].court}
          </FilterChip>
        ))}
      </div>
    </fieldset>
  );
}
