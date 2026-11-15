import { ExternalLink, MessageCircleQuestion, PencilLine } from "lucide-react";
import { CategoryIcon } from "@/components/ability/category-icon";
import { NotYetButton } from "@/components/ability/not-yet";
import { AccessPill, ProofBadge } from "@/components/ability/status";
import {
  CRITERIA,
  CRITERIA_BY_KEY,
  SECTION_LABELS,
  type CriterionDef,
  type CriterionSection,
} from "@/lib/criteria";
import { CATEGORY_SINGULAR, SOURCE_LABELS, formatDate } from "@/lib/labels";
import type { CriterionScalar, CriterionValue, Place } from "@/lib/types";

export function formatValue(def: CriterionDef, value: CriterionScalar): string {
  if (def.type === "bool") return value ? "Oui" : "Non";
  if (def.type === "nombre") return `${value} ${def.unite ?? ""}`.trim();
  return def.valeurs?.[String(value)] ?? String(value);
}

/** Critères qui s'appliquent au lieu : ceux des chambres ne concernent que les hébergements. */
function applicable(place: Place): CriterionDef[] {
  return CRITERIA.filter((c) => !c.hebergement || place.categorie === "hebergement");
}

/** Valeurs d'un critère, source par source. Ouvert d'office quand les sources divergent. */
function SourcedValues({ def, critere }: { def: CriterionDef; critere: CriterionValue }) {
  return (
    <details open={critere.preuve === "divergent"} className="text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-bold underline underline-offset-4">
        Voir les sources ({critere.sources.length})
      </summary>
      <ul className="flex flex-col gap-1 pb-2 text-ink-700">
        {critere.sources.map((s) => (
          <li key={s.source}>
            <strong>{SOURCE_LABELS[s.source]}</strong> : {formatValue(def, s.valeur)}
            {s.derive && " (déduit des critères déclarés)"} · {formatDate(s.date, s.dateType)}
          </li>
        ))}
      </ul>
    </details>
  );
}

const needsSources = (c: CriterionValue) =>
  c.sources.length > 1 || c.preuve === "divergent" || c.sources.some((s) => s.derive);

function CriterionRow({ def, critere }: { def: CriterionDef; critere: CriterionValue }) {
  return (
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-ink-700">{def.libelle}</span>
        <strong className="text-ink-900">{formatValue(def, critere.valeur as CriterionScalar)}</strong>
      </div>
      <ProofBadge
        level={critere.preuve}
        date={critere.date}
        dateType={critere.dateType}
        stale={critere.aReconfirmer}
        demo={critere.demo}
      />
      {needsSources(critere) && <SourcedValues def={def} critere={critere} />}
    </li>
  );
}

const linkClass = "inline-flex min-h-11 items-center gap-1.5 font-bold underline underline-offset-4";

function External({ href, children, icon }: { href: string; children: string; icon?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {icon}
      {children}
      <ExternalLink aria-hidden="true" className="size-4" />
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  );
}

/** Liens pour corriger ou compléter la fiche à la source : tout le monde en profite. */
function ContributeLinks({ place }: { place: Place }) {
  const acceslibre = place.sources.find((s) => s.source === "acceslibre");
  const osm = place.sources.find((s) => s.source === "osm");
  const [osmType, osmId] = osm ? osm.id.split("/") : [];
  const pencil = <PencilLine aria-hidden="true" className="size-4" />;
  return (
    <ul className="flex flex-col">
      <li>
        <External
          href={acceslibre?.url ?? "https://acceslibre.beta.gouv.fr/contrib/start/"}
          icon={pencil}
        >
          {acceslibre ? "Compléter sur Acceslibre" : "Ajouter ce lieu sur Acceslibre"}
        </External>
      </li>
      <li>
        {osm ? (
          <External href={`https://www.openstreetmap.org/edit?${osmType}=${osmId}`} icon={pencil}>
            Compléter sur OpenStreetMap, la base de Wheelmap
          </External>
        ) : (
          <External href="https://wheelmap.org" icon={pencil}>
            Ajouter l&apos;information sur Wheelmap
          </External>
        )}
      </li>
    </ul>
  );
}

/**
 * Fiche d'accessibilité d'un lieu : statut d'ensemble, critères connus avec
 * leur niveau de preuve, questions à poser pour ce qu'on ne sait pas, sources.
 * `hideUnknown` masque le bloc générique des inconnues quand la page affiche
 * déjà les questions propres au profil.
 */
export function PlaceDetail({ place, hideUnknown = false }: { place: Place; hideUnknown?: boolean }) {
  const defs = applicable(place);
  const acces = place.criteres.acces_fauteuil;
  const known = defs.filter((d) => d.cle !== "acces_fauteuil" && place.criteres[d.cle]);
  const unknownBlocking = defs.filter((d) => d.bloquant && !place.criteres[d.cle]);
  const fictif = place.sources.some((s) => s.source === "demo");

  const sections = new Map<CriterionSection, CriterionDef[]>();
  for (const d of known) {
    const list = sections.get(d.section) ?? [];
    list.push(d);
    sections.set(d.section, list);
  }

  return (
    <article className="flex flex-col gap-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-butter-100"
        >
          <CategoryIcon category={place.categorie} className="size-6" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="text-2xl leading-tight">{place.nom}</h2>
          <p className="text-ink-600">
            {place.activite ?? CATEGORY_SINGULAR[place.categorie]}
            {place.commune ? ` · ${place.commune}` : ""}
          </p>
          {place.adresse && (
            <p className="text-sm text-ink-600">
              {place.adresse}
              {place.codePostal ? `, ${place.codePostal}` : ""}
            </p>
          )}
        </div>
      </header>

      {fictif && (
        <p className="rounded-2xl bg-ink-900 p-3 text-sm text-white">
          <strong>Lieu fictif.</strong> Il n&apos;existe pas : il montre à quoi ressemble une fiche vérifiée
          sur place, avec des mesures simulées.
        </p>
      )}

      <section aria-label="Accès en fauteuil" className="flex flex-col gap-2 rounded-2xl bg-butter-100 p-4">
        <AccessPill status={place.acces} className="self-start" />
        {acces ? (
          <>
            {place.acces !== "divergent" && (
              <ProofBadge
                level={acces.preuve}
                date={acces.date}
                dateType={acces.dateType}
                stale={acces.aReconfirmer}
                demo={acces.demo}
              />
            )}
            {place.acces === "divergent" && (
              <p className="text-sm text-ink-700">
                Les sources ne sont pas d&apos;accord. Ce lieu ne peut pas être considéré comme
                accessible sans confirmation.
              </p>
            )}
            {needsSources(acces) && <SourcedValues def={CRITERIA_BY_KEY.acces_fauteuil} critere={acces} />}
          </>
        ) : (
          <p className="text-sm text-ink-700">
            Aucune source ne dit si ce lieu est accessible en fauteuil.
          </p>
        )}
        {place.note && (
          <blockquote className="border-l-4 border-ink-400 pl-3 text-sm text-ink-700">
            « {place.note} »
            <footer className="text-ink-600">Note d&apos;un contributeur OpenStreetMap</footer>
          </blockquote>
        )}
      </section>

      {sections.size > 0 && (
        <section aria-labelledby={`criteres-${place.id}`} className="flex flex-col gap-3">
          <h3 id={`criteres-${place.id}`} className="text-xl">
            Ce que l&apos;on sait
          </h3>
          {[...sections].map(([section, list]) => (
            <div key={section}>
              <h4 className="text-sm font-bold tracking-wide text-ink-600 uppercase">
                {SECTION_LABELS[section]}
              </h4>
              <ul className="divide-y divide-ink-200">
                {list.map((d) => (
                  <CriterionRow key={d.cle} def={d} critere={place.criteres[d.cle]} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {!hideUnknown && unknownBlocking.length > 0 && (
        <section
          aria-labelledby={`inconnu-${place.id}`}
          className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-ink-400 p-4"
        >
          <h3 id={`inconnu-${place.id}`} className="flex items-center gap-2 text-xl">
            <MessageCircleQuestion aria-hidden="true" className="size-6 shrink-0" />
            Ce qu&apos;on ne sait pas encore
          </h3>
          <p className="text-sm text-ink-700">
            {unknownBlocking.length} information{unknownBlocking.length > 1 ? "s" : ""} qui{" "}
            {unknownBlocking.length > 1 ? "peuvent" : "peut"} bloquer un séjour{" "}
            {unknownBlocking.length > 1 ? "manquent" : "manque"}. Questions à poser à
            l&apos;établissement :
          </p>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-ink-900">
            {unknownBlocking.map((d) => (
              <li key={d.cle}>{d.question}</li>
            ))}
          </ol>
        </section>
      )}

      {!fictif && (
        <section aria-labelledby={`sources-${place.id}`} className="flex flex-col gap-2">
          <h3 id={`sources-${place.id}`} className="text-xl">
            Sources
          </h3>
          <ul className="flex flex-col">
            {place.sources.map((s) => (
              <li key={`${s.source}-${s.id}`}>
                {s.url ? (
                  <External href={s.url}>{SOURCE_LABELS[s.source]}</External>
                ) : (
                  <span className="inline-flex min-h-11 items-center font-bold">{SOURCE_LABELS[s.source]}</span>
                )}
              </li>
            ))}
          </ul>
          <h4 className="mt-2 font-extrabold">Vous y êtes allé·e ?</h4>
          <p className="text-sm text-ink-600">
            Dites-nous si cette fiche correspond à ce que vous avez trouvé sur place.
          </p>
          <div className="flex flex-wrap gap-x-3">
            <NotYetButton
              variant="outline"
              signal={{ type: "verification", detail: "fiche exacte" }}
              message="Merci ! Dans la version complète, deux retours concordants font passer une information au niveau « confirmé par la communauté »."
            >
              Oui, c&apos;était exact
            </NotYetButton>
            <NotYetButton
              variant="outline"
              signal={{ type: "verification", detail: "fiche inexacte" }}
              message="Merci ! Dans la version complète, vous pourrez dire quel critère est faux et ajouter une photo."
            >
              Non, il y a une erreur
            </NotYetButton>
          </div>
          <h4 className="mt-2 font-extrabold">Une erreur, une information en plus ?</h4>
          <p className="text-sm text-ink-600">
            Les fiches se corrigent à la source, et la correction profite à tout le monde.
          </p>
          <ContributeLinks place={place} />
        </section>
      )}
    </article>
  );
}
