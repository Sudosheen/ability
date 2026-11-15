import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { BASE_PATH } from "@/lib/data";
import type { Meta } from "@/lib/server-data";

/** Bandeau permanent : la maquette ne doit jamais passer pour un service en production. */
export function DemoBanner() {
  return (
    <p role="note" className="print:hidden bg-ink-900 px-4 py-2 text-center text-sm text-white">
      <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-sun-400 px-2 py-0.5 font-bold text-ink-900">
        <FlaskConical aria-hidden="true" className="size-4" />
        Maquette
      </span>
      Données ouvertes non vérifiées sur place, et quelques lieux fictifs signalés : ne pas s&apos;en servir pour réserver.
    </p>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink-900">
      <span
        aria-hidden="true"
        className="inline-block size-6 rounded-full border-2 border-ink-900 bg-sun-400"
      />
      Ability
    </span>
  );
}

const navLink =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold whitespace-nowrap text-ink-900 hover:bg-butter-100 sm:px-4 sm:text-base";

export function SiteHeader() {
  return (
    <header className="border-b border-ink-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
        <Link href="/" aria-label="Ability, accueil" className="rounded-full">
          <Wordmark />
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="-mx-3 flex flex-wrap items-center sm:mx-0 sm:gap-1">
            <li>
              <Link href="/recherche/" className={navLink}>
                Rechercher
              </Link>
            </li>
            <li>
              <Link href="/carte/" className={navLink}>
                Carte
              </Link>
            </li>
            <li>
              <Link href="/sejour/" className={navLink}>
                Mon séjour
              </Link>
            </li>
            <li>
              <Link href="/pro/" className={navLink}>
                Structures
              </Link>
            </li>
            <li>
              <Link href="/profil/" className={navLink}>
                Mon profil
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ meta }: { meta: Meta }) {
  const date = new Date(meta.genereLe).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <footer className="mt-auto border-t border-ink-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-ink-600">
        <Wordmark />
        <p>
          Maquette de démonstration (preuve de concept). Territoire : Hérault. Données générées le{" "}
          {date}.
        </p>
        <p>
          Sources : {meta.sources.map((s) => s.attribution).join(" · ")}. La base fusionnée contient
          des données © les contributeurs d&apos;OpenStreetMap : elle est mise à disposition sous{" "}
          {/* Fichiers statiques produits par l'ETL : lien simple, pas une route Next. */}
          <a href={`${BASE_PATH}/data/LICENCE.txt`} className="font-bold text-ink-900 underline underline-offset-4">
            licence ODbL 1.0
          </a>
          .
        </p>
        <p>
          <Link href="/#preuves" className="font-bold text-ink-900 underline underline-offset-4">
            Niveaux de preuve
          </Link>
          {" · "}
          <Link href="/#sources" className="font-bold text-ink-900 underline underline-offset-4">
            Sources et licences
          </Link>
          {" · "}
          <Link href="/tarifs/" className="font-bold text-ink-900 underline underline-offset-4">
            Offres
          </Link>
          {" · "}
          <Link href="/demo/" className="font-bold text-ink-900 underline underline-offset-4">
            Démonstration
          </Link>
          {" · "}
          <Link href="/dev/design/" className="font-bold text-ink-900 underline underline-offset-4">
            Système de design
          </Link>
        </p>
      </div>
    </footer>
  );
}
