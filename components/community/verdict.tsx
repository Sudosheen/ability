import Link from "next/link";
import { CircleDashed, EqualNot, Hourglass, Images, Users, X, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { CategoryIcon } from "@/components/ability/category-icon";
import { VERDICT_META, type PlaceCommunity, type Verdict } from "@/lib/community";
import { CATEGORY_SINGULAR } from "@/lib/labels";

const VERDICT_STYLE: Record<Verdict, { Icon: LucideIcon; classes: string }> = {
  confirme: { Icon: Users, classes: "bg-commu-100 text-commu-700 border-commu-700/40" },
  en_attente: { Icon: Hourglass, classes: "bg-white text-ink-700 border-ink-400" },
  contraire: { Icon: EqualNot, classes: "bg-sun-400 text-ink-900 border-ink-900/50" },
  infirme: { Icon: X, classes: "bg-ko-100 text-ko-700 border-ko-600/40" },
  aucun: { Icon: CircleDashed, classes: "bg-white text-ink-700 border-ink-400 border-dashed" },
};

/** Verdict de la communauté sur un bloc : icône, texte et couleur, jamais la couleur seule. */
export function VerdictPill({ verdict, className }: { verdict: Verdict; className?: string }) {
  const { Icon, classes } = VERDICT_STYLE[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm leading-tight font-bold",
        classes,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {VERDICT_META[verdict].label}
    </span>
  );
}

export function formatDay(iso: string | null): string {
  if (!iso) return "jamais";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Synthèse de la communauté pour un lieu : un verdict par bloc de la fiche, et les métadonnées. */
export function PlaceCommunityCard({ summary, headingLevel = "h3" }: { summary: PlaceCommunity; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const { meta } = summary;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4">
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-butter-100">
          <CategoryIcon category={summary.categorie} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <H className="text-lg leading-tight">
            <Link href={`/lieu/?id=${summary.lieuId}`} className="underline underline-offset-4">
              {summary.lieuNom}
            </Link>
          </H>
          <p className="text-sm text-ink-600">
            {CATEGORY_SINGULAR[summary.categorie]}
            {summary.commune ? ` · ${summary.commune}` : ""}
            {summary.demo ? " · retours simulés" : ""}
          </p>
        </div>
      </header>
      <ul className="flex flex-col divide-y divide-ink-200">
        {summary.blocs.map(({ bloc, result }) => (
          <li key={bloc.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
            <span className="font-bold text-ink-900">{bloc.libelle}</span>
            <span className="flex flex-wrap items-center gap-2">
              <VerdictPill verdict={result.verdict} />
              {result.conformes + result.nonConformes > 0 && (
                <span className="text-sm text-ink-600">
                  {result.conformes} oui · {result.nonConformes} non
                  {result.photos > 0 && (
                    <span className="ml-1 inline-flex items-center gap-1">
                      · <Images aria-hidden="true" className="size-4" /> {result.photos} photo{result.photos > 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="rounded-xl bg-butter-50 p-2 text-sm text-ink-700">
        <strong>Métadonnées :</strong> {summary.retours} retour{summary.retours > 1 ? "s" : ""} de {meta.verificateurs}{" "}
        voyageur{meta.verificateurs > 1 ? "s" : ""}, dernier le {formatDay(meta.derniere)}. {meta.confirmes} bloc
        {meta.confirmes > 1 ? "s" : ""} confirmé{meta.confirmes > 1 ? "s" : ""}
        {meta.aReconfirmer > 0 ? `, ${meta.aReconfirmer} à reconfirmer` : ""}. Niveau de preuve : communauté.
      </p>
    </article>
  );
}
