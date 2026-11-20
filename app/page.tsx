import Link from "next/link";
import { ArrowRight, Building2, Map as MapIcon, User } from "lucide-react";
import { SunMark } from "@/components/ability/brand";
import { SearchBar } from "@/components/ability/search-bar";
import { SiteFooter } from "@/components/ability/site-chrome";
import { ProofBadge } from "@/components/ability/status";
import { Button } from "@/components/ui/button";
import { PROOF_META, PROOF_ORDER, formatNumber } from "@/lib/labels";
import { getCommuneList, getMeta } from "@/lib/server-data";

const pct = (n: number, total: number) => Math.round((100 * n) / total);

export default function HomePage() {
  const meta = getMeta();
  const communes = getCommuneList().map((c) => c.nom);
  const heb = meta.hebergements;
  const hebInconnus = (heb.parStatut.inconnu ?? 0) + (heb.parStatut.divergent ?? 0);

  return (
    <>
      <main id="contenu">
        {/* Héro */}
        <section className="relative overflow-hidden bg-butter-100">
          {/* Le soleil du logo en décor, à droite du titre sur grand écran. */}
          <SunMark className="pointer-events-none absolute top-8 right-[6%] h-[30rem] w-auto opacity-90 max-lg:hidden" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-14 pb-16 lg:pt-20 lg:pb-24">
            <div className="flex max-w-3xl flex-col gap-4">
              <h1 className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                Des séjours accessibles, vérifiés critère par critère.
              </h1>
              <p className="max-w-2xl text-xl text-ink-700">
                Hébergements, activités et lieux utiles dans l&apos;Hérault, pour les personnes en
                fauteuil et celles qui les accompagnent. Chaque information affiche sa source et son
                niveau de preuve.
              </p>
            </div>
            <SearchBar communes={communes} />
            <p className="text-sm text-ink-700">
              Le profil choisi sert d&apos;exemple, à ajuster ensuite. Les dates ne sont pas encore prises
              en compte dans la maquette.
            </p>
          </div>
        </section>

        {/* Chiffres */}
        <section aria-labelledby="chiffres" className="border-b border-ink-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <h2 id="chiffres" className="sr-only">
              Les données en chiffres
            </h2>
            <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [formatNumber(meta.total), "lieux de l'Hérault réunis sur une seule carte"],
                [String(meta.sources.length), "sources ouvertes croisées et fusionnées"],
                [formatNumber(heb.total), "hébergements recensés"],
                [
                  `${pct(hebInconnus, heb.total)} %`,
                  "de ces hébergements n'ont aucune information d'accès fiable",
                ],
              ].map(([value, label]) => (
                // Libellé avant le chiffre dans le code (dt puis dd), chiffre en haut à l'écran :
                // justify-end place le contenu en haut avec flex-col-reverse, chiffres alignés.
                <div key={label} className="flex flex-col-reverse justify-end gap-1">
                  <dt className="text-ink-600">{label}</dt>
                  <dd className="text-4xl font-extrabold tracking-tight">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Niveaux de preuve */}
        <section id="preuves" aria-labelledby="titre-preuves" className="scroll-mt-4">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
            <div className="flex flex-col gap-4">
              <h2 id="titre-preuves" className="text-3xl sm:text-4xl">
                Une information inconnue n&apos;est jamais une information rassurante.
              </h2>
              <p className="text-lg text-ink-700">
                « Accessible » ne veut rien dire sans savoir qui le dit, et depuis quand. Ability
                affiche pour chaque critère son niveau de preuve et sa date. Quand rien n&apos;est
                connu, le lieu passe en « À confirmer », avec la question à poser à
                l&apos;établissement.
              </p>
              <Button asChild className="self-start">
                <Link href="/carte/">
                  <MapIcon aria-hidden="true" />
                  Explorer la carte
                </Link>
              </Button>
            </div>
            <ul className="flex flex-col divide-y divide-ink-200 rounded-3xl border border-ink-200 bg-white">
              {PROOF_ORDER.map((level) => (
                <li key={level} className="flex flex-col gap-1.5 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <span className="sm:w-64 sm:shrink-0">
                    <ProofBadge level={level} hideDate />
                  </span>
                  <span className="text-ink-700">{PROOF_META[level].description}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Deux publics */}
        <section aria-labelledby="titre-publics" className="bg-butter-100">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16">
            <h2 id="titre-publics" className="text-3xl sm:text-4xl">
              Pour qui ?
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  Icon: User,
                  title: "Particuliers",
                  text: "Vous préparez un séjour pour vous ou pour un proche : décrivez vos besoins une fois (fauteuil, transferts, lève-personne), puis ne voyez que les lieux qui y répondent.",
                  href: "/sejour/",
                  cta: "Préparer mon séjour",
                },
                {
                  Icon: Building2,
                  title: "Structures médico-sociales",
                  text: "Vous organisez un séjour de groupe de 3 à 7 jours : profil du groupe, hébergements avec assez de chambres accessibles, itinéraire jour par jour et dossier de séjour à imprimer.",
                  href: "/pro/",
                  cta: "Préparer un séjour de groupe",
                },
              ].map(({ Icon, title, text, href, cta }) => (
                <article
                  key={title}
                  className="flex flex-col gap-3 rounded-3xl border-2 border-ink-900 bg-white p-6"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-12 items-center justify-center rounded-2xl bg-sun-400"
                  >
                    <Icon className="size-6" />
                  </span>
                  <h3 className="text-2xl">{title}</h3>
                  <p className="text-ink-700">{text}</p>
                  <Button asChild variant="dark" className="mt-auto self-start">
                    <Link href={href}>
                      {cta}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Sources */}
        <section id="sources" aria-labelledby="titre-sources" className="scroll-mt-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16">
            <div className="flex max-w-3xl flex-col gap-3">
              <h2 id="titre-sources" className="text-3xl sm:text-4xl">
                Trois sources, une seule fiche par lieu
              </h2>
              <p className="text-lg text-ink-700">
                Les fiches qui désignent le même lieu sont rapprochées, puis fusionnées :{" "}
                {formatNumber(meta.fusions)} lieux réunissent déjà plusieurs sources. Quand elles se
                contredisent ({formatNumber(meta.divergences)} cas), Ability l&apos;affiche au lieu de
                choisir en silence.
              </p>
            </div>
            <ul className="grid gap-4 md:grid-cols-3">
              {meta.sources.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 rounded-3xl border border-ink-200 bg-white p-5">
                  <h3 className="text-xl">{s.titre}</h3>
                  <p className="text-3xl font-extrabold tracking-tight">
                    {formatNumber(s.fiches)}{" "}
                    <span className="text-base font-normal text-ink-600">fiches</span>
                  </p>
                  <p className="text-sm text-ink-600">
                    {s.attribution}. Licence : {s.licence}.
                  </p>
                  {s.note && <p className="text-sm text-ink-700">{s.note}</p>}
                </li>
              ))}
            </ul>
            <Link
              href="/carte/"
              className="inline-flex items-center gap-2 self-start font-bold underline underline-offset-4"
            >
              Voir ces lieux sur la carte
              <ArrowRight aria-hidden="true" className="size-5" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
