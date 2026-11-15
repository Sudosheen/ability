import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { BASE_PATH } from "@/lib/data";

const field =
  "w-full bg-transparent text-base font-bold text-ink-900 placeholder:font-normal placeholder:text-ink-600 focus:outline-none";
const segment =
  "flex min-h-16 min-w-0 flex-col justify-center gap-0.5 rounded-2xl bg-butter-50 px-5 py-2 focus-within:bg-butter-100 xl:rounded-full xl:bg-transparent";
const caption = "flex items-center gap-1.5 text-sm font-bold whitespace-nowrap text-ink-600";
const divider = "hidden w-px self-stretch bg-ink-200 xl:my-3 xl:block";

/**
 * Barre de recherche principale : Où ? | Quand ? | Qui voyage ? | Rechercher.
 * C'est un formulaire GET ordinaire vers la recherche : il marche sans JavaScript
 * et la recherche se partage par son adresse.
 * Grille de deux colonnes sur écran moyen, pilule horizontale sur grand écran.
 */
export function SearchBar({
  communes,
  defaultWhere = "",
  className,
}: {
  communes: string[];
  defaultWhere?: string;
  className?: string;
}) {
  return (
    <form
      action={`${BASE_PATH}/recherche/`}
      method="get"
      role="search"
      aria-label="Rechercher une destination accessible"
      className={cn(
        "grid gap-1.5 rounded-3xl border-2 border-ink-900 bg-white p-2 shadow-[0_6px_0_0_var(--color-ink-900)] md:grid-cols-2 xl:flex xl:items-stretch xl:gap-1 xl:rounded-full",
        className,
      )}
    >
      <label className={cn(segment, "xl:flex-[1.2]")}>
        <span className={caption}>
          <MapPin aria-hidden="true" className="size-4" />
          Où ?
        </span>
        <input
          name="ou"
          list="communes"
          defaultValue={defaultWhere}
          placeholder="Sète, Montpellier, Agde…"
          autoComplete="off"
          className={field}
        />
        <datalist id="communes">
          {communes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <div aria-hidden="true" className={divider} />
      <fieldset className={cn(segment, "xl:flex-[1.5]")}>
        <legend className="sr-only">Quand ?</legend>
        <span aria-hidden="true" className={caption}>
          <CalendarDays className="size-4" />
          Quand ?
        </span>
        <div className="flex items-center gap-2">
          <input type="date" name="du" aria-label="Date d'arrivée" className={cn(field, "min-w-0")} />
          <span aria-hidden="true" className="text-ink-600">
            →
          </span>
          <input type="date" name="au" aria-label="Date de départ" className={cn(field, "min-w-0")} />
        </div>
      </fieldset>

      <div aria-hidden="true" className={divider} />
      <label className={cn(segment, "xl:flex-1")}>
        <span className={caption}>
          <Users aria-hidden="true" className="size-4" />
          Qui voyage ?
        </span>
        <select name="profil" defaultValue="" className={cn(field, "cursor-pointer")}>
          <option value="">Choisir un profil</option>
          <option value="manuel">Fauteuil manuel</option>
          <option value="electrique">Fauteuil électrique</option>
          <option value="leve-personne">Fauteuil et lève-personne</option>
          <option value="groupe">Groupe accompagné (structure)</option>
        </select>
      </label>

      <Button type="submit" size="lg" className="min-h-16 xl:min-h-14 xl:self-center">
        <Search aria-hidden="true" />
        Rechercher
      </Button>
    </form>
  );
}
