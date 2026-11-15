import { SquareParking, Toilet } from "lucide-react";
import { cn } from "cn";
import { CategoryIcon } from "@/components/ability/category-icon";
import { AccessPill, CompatibilityPill } from "@/components/ability/status";
import { CATEGORY_SINGULAR, PROOF_META, SOURCE_LABELS } from "@/lib/labels";
import { summarize, type Evaluation } from "@/lib/matching";
import { SOURCE_BITS, type PlaceFeatureProps, type SourceId } from "@/lib/types";

/** Sources d'un lieu d'après le masque de bits de la couche carte. */
export function sourcesFromBits(bits: number): SourceId[] {
  return (Object.keys(SOURCE_BITS) as SourceId[]).filter((s) => (bits & SOURCE_BITS[s]) !== 0);
}

export function SourceList({ sources, className }: { sources: SourceId[]; className?: string }) {
  return (
    <span className={cn("text-sm text-ink-600", className)}>
      {sources.length > 1 ? `${sources.length} sources : ` : "Source : "}
      {sources.map((s) => SOURCE_LABELS[s]).join(", ")}
    </span>
  );
}

function Fact({ ok, children, icon }: { ok: boolean; children: string; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink-700">
      {icon}
      {children} : <strong>{ok ? "oui" : "non"}</strong>
    </span>
  );
}

/**
 * Carte de résultat : nom, catégorie, statut, niveau de preuve, équipements
 * connus et sources. Avec une évaluation, le statut est la compatibilité avec
 * le profil et sa première raison ; sinon, l'accessibilité d'après les sources.
 * Devient un bouton quand `onSelect` est fourni.
 */
export function PlaceCard({
  place,
  evaluation,
  selected = false,
  onSelect,
  onHover,
  className,
}: {
  place: PlaceFeatureProps;
  evaluation?: Evaluation;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  className?: string;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-butter-100 text-ink-900"
      >
        <CategoryIcon category={place.c} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-col">
          <span className="font-extrabold text-ink-900">{place.n}</span>
          <span className="truncate text-sm text-ink-600">
            {CATEGORY_SINGULAR[place.c]}
            {place.co ? ` · ${place.co}` : ""}
          </span>
        </span>
        {evaluation ? (
          <>
            <CompatibilityPill status={evaluation.statut} short className="self-start" />
            <span className="text-sm text-ink-700">{summarize(evaluation)}</span>
          </>
        ) : (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <AccessPill status={place.a} short />
          </span>
        )}
        <span className="text-sm text-ink-600">
          {place.a === "inconnu" || place.a === "divergent"
            ? "Niveau de preuve : aucun"
            : `Niveau de preuve : ${PROOF_META[place.p].label.toLowerCase()}`}
        </span>
        {!evaluation && (place.w !== undefined || place.k !== undefined) && (
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {place.w !== undefined && (
              <Fact ok={place.w === 1} icon={<Toilet aria-hidden="true" className="size-4" />}>
                WC adaptés
              </Fact>
            )}
            {place.k !== undefined && (
              <Fact ok={place.k === 1} icon={<SquareParking aria-hidden="true" className="size-4" />}>
                Place adaptée
              </Fact>
            )}
          </span>
        )}
        <SourceList sources={sourcesFromBits(place.s)} />
      </span>
    </>
  );

  const shell = cn(
    "flex w-full items-start gap-3 rounded-2xl border bg-white p-3 text-left",
    selected ? "border-ink-900 ring-2 ring-ink-900" : "border-ink-200",
    className,
  );

  if (!onSelect) return <div className={shell}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onSelect(place.id)}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(place.id)}
      onBlur={() => onHover?.(null)}
      className={cn(shell, "cursor-pointer hover:border-ink-900 hover:bg-butter-50")}
    >
      {body}
    </button>
  );
}
