import { Check, CircleHelp, EqualNot, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { CopyButton } from "@/components/ability/copy-button";
import { CompatibilityPill } from "@/components/ability/status";
import { summarize, type Check as Exigence, type Evaluation } from "@/lib/matching";
import { describeProfile, type NeedsProfile } from "@/lib/profile";

const ICONS: Record<Exigence["resultat"], { Icon: LucideIcon; classes: string; label: string }> = {
  ok: { Icon: Check, classes: "bg-ok-100 text-ok-700", label: "Convient" },
  ko: { Icon: X, classes: "bg-ko-100 text-ko-700", label: "Ne convient pas" },
  inconnu: { Icon: CircleHelp, classes: "bg-warn-100 text-warn-700", label: "Inconnu" },
  divergent: { Icon: EqualNot, classes: "bg-sun-400 text-ink-900", label: "Sources divergentes" },
};

function Group({ title, checks, icon }: { title: string; checks: Exigence[]; icon?: LucideIcon }) {
  if (checks.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-sm font-bold tracking-wide text-ink-600 uppercase">{title}</h4>
      <ul className="flex flex-col gap-2">
        {checks.map((c) => {
          const meta = ICONS[c.resultat];
          const Icon = icon ?? meta.Icon;
          return (
            <li key={c.id} className="flex items-start gap-2.5">
              <span
                className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", meta.classes)}
              >
                <Icon aria-hidden="true" className="size-4" strokeWidth={3} />
                <span className="sr-only">{meta.label} :</span>
              </span>
              <span>
                <strong>{c.libelle}.</strong> <span className="text-ink-700">{c.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function questionsMessage(questions: string[], profile: NeedsProfile, placeName: string) {
  return [
    "Bonjour,",
    "",
    `Je prépare un séjour pour une personne en fauteuil roulant (${describeProfile(profile)}). Pour savoir si « ${placeName} » convient, pourriez-vous me préciser :`,
    "",
    ...questions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "Merci d'avance pour votre réponse.",
  ].join("\n");
}

/**
 * Ce que donne un lieu pour un profil : ce qui bloque, ce qu'il reste à
 * confirmer, les points d'attention, ce qui convient, et les questions à poser.
 */
export function EvaluationSummary({
  evaluation,
  profile,
  placeName,
  headingId,
}: {
  evaluation: Evaluation;
  profile: NeedsProfile;
  placeName: string;
  headingId: string;
}) {
  const ok = evaluation.exigences.filter((c) => c.resultat === "ok");
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-2xl border-2 border-ink-900 bg-white p-4">
      <div className="flex flex-col gap-2">
        <h3 id={headingId} className="text-xl">
          Pour votre profil
        </h3>
        <CompatibilityPill status={evaluation.statut} className="self-start" />
        <p className="text-ink-700">{summarize(evaluation)}</p>
        <p className="text-sm text-ink-600">Profil : {describeProfile(profile)}.</p>
      </div>

      <Group title="Ce qui bloque" checks={evaluation.bloquants} />
      <Group title="À confirmer avant de réserver" checks={evaluation.aConfirmer} />
      <Group title="Points d'attention" checks={evaluation.attention} icon={TriangleAlert} />

      {ok.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold underline underline-offset-4">
            Ce qui convient ({ok.length})
          </summary>
          <div className="pt-2">
            <Group title="Exigences remplies" checks={ok} />
          </div>
        </details>
      )}

      {evaluation.questions.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-ink-400 p-3">
          <h4 className="font-extrabold">Questions à poser à l&apos;établissement</h4>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            {evaluation.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
          <CopyButton text={questionsMessage(evaluation.questions, profile, placeName)}>
            Copier le message
          </CopyButton>
        </div>
      )}
    </section>
  );
}
