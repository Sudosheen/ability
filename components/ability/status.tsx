import {
  Award,
  Check,
  CircleDashed,
  CircleHelp,
  ClipboardCheck,
  EqualNot,
  FileText,
  Map as MapIcon,
  TriangleAlert,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { ACCESS_META, PROOF_META, formatDate } from "@/lib/labels";
import type { Compatibility } from "@/lib/matching";
import type { AccessStatus, DateKind, ProofLevel } from "@/lib/types";

const pill =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm leading-tight font-bold";

const ACCESS_ICONS: Record<AccessStatus, LucideIcon> = {
  oui: Check,
  partiel: TriangleAlert,
  non: X,
  divergent: EqualNot,
  inconnu: CircleHelp,
};

/** Accessibilité brute en fauteuil : icône, texte et couleur. */
export function AccessPill({
  status,
  short = false,
  className,
}: {
  status: AccessStatus;
  short?: boolean;
  className?: string;
}) {
  const meta = ACCESS_META[status];
  const Icon = ACCESS_ICONS[status];
  return (
    <span className={cn(pill, meta.classes, className)}>
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={3} />
      {short ? meta.court : meta.label}
    </span>
  );
}

const PROOF_ICONS: Record<ProofLevel, LucideIcon> = {
  verifie: ClipboardCheck,
  label: Award,
  communaute: Users,
  declare: FileText,
  indicatif: MapIcon,
  divergent: EqualNot,
  inconnu: CircleDashed,
};

/**
 * Niveau de preuve d'un critère, avec la date quand la source la donne.
 * Au-delà de 24 mois, la mention « à reconfirmer » s'ajoute.
 */
export function ProofBadge({
  level,
  date = null,
  dateType = null,
  stale = false,
  demo = false,
  hideDate = false,
  className,
}: {
  level: ProofLevel;
  date?: string | null;
  dateType?: DateKind | null;
  stale?: boolean;
  demo?: boolean;
  /** Masque la date, par exemple dans une légende. */
  hideDate?: boolean;
  className?: string;
}) {
  const meta = PROOF_META[level];
  const Icon = PROOF_ICONS[level];
  const showDate = !hideDate && level !== "inconnu" && level !== "divergent";
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className={cn(pill, meta.classes)}>
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {meta.label}
        {demo && <span className="font-normal">(simulé)</span>}
      </span>
      {showDate && (
        <span className="text-sm text-ink-600">
          {formatDate(date, dateType)}
          {stale && <strong className="font-bold text-warn-700"> · à reconfirmer</strong>}
        </span>
      )}
    </span>
  );
}

export const COMPAT_LABELS: Record<Compatibility, string> = {
  compatible: "Compatible",
  a_confirmer: "À confirmer",
  incompatible: "Incompatible",
};

const COMPAT: Record<Compatibility, { label: string; classes: string; Icon: LucideIcon }> = {
  compatible: {
    label: "Compatible avec vos besoins",
    classes: "bg-ok-100 text-ok-700 border-ok-600/40",
    Icon: Check,
  },
  a_confirmer: {
    label: "À confirmer",
    classes: "bg-warn-100 text-warn-700 border-warn-600/40",
    Icon: CircleHelp,
  },
  incompatible: {
    label: "Incompatible",
    classes: "bg-ko-100 text-ko-700 border-ko-600/40",
    Icon: X,
  },
};

/** Compatibilité d'un lieu avec un profil de besoins. Une information inconnue donne « À confirmer ». */
export function CompatibilityPill({
  status,
  short = false,
  className,
}: {
  status: Compatibility;
  short?: boolean;
  className?: string;
}) {
  const { label, classes, Icon } = COMPAT[status];
  return (
    <span className={cn(pill, classes, className)}>
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={3} />
      {short ? COMPAT_LABELS[status] : label}
    </span>
  );
}
