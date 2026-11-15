"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Search, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  LARGEUR_MAX,
  LARGEUR_MIN,
  MARGE_PORTE_CM,
  PRESETS,
  type NeedsProfile,
  type PresetId,
} from "@/lib/profile";
import { clearProfile, saveProfile, useProfile } from "@/lib/storage";

type Option<T extends string> = { value: T; label: string; hint?: string };

/** Groupe de boutons radio présentés comme des cartes à choisir. */
function RadioCards<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-lg font-extrabold">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white p-3 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-900",
                checked ? "border-ink-900 bg-butter-100" : "border-ink-200 hover:border-ink-400",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="mt-1 size-5 shrink-0 accent-ink-900 focus-visible:outline-none"
              />
              <span className="flex flex-col">
                <span className="font-bold">{o.label}</span>
                {o.hint && <span className="text-sm text-ink-600">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 border-ink-200 bg-white p-3 hover:border-ink-400 has-checked:border-ink-900 has-checked:bg-butter-100 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-ink-900 focus-visible:outline-none"
      />
      <span className="flex flex-col">
        <span className="font-bold">{label}</span>
        <span className="text-sm text-ink-600">{hint}</span>
      </span>
    </label>
  );
}

const PRESET_ORDER: PresetId[] = ["manuel", "electrique", "leve-personne"];

/**
 * Assistant « profil de besoins » : quelques questions fonctionnelles, sans
 * compte ni diagnostic. Le profil est enregistré dans le navigateur.
 */
export function NeedsWizard() {
  const router = useRouter();
  const saved = useProfile();
  // Tant que rien n'a été modifié, le formulaire montre le profil enregistré, ou un exemple.
  const [draft, setDraft] = useState<NeedsProfile | null>(null);
  const [message, setMessage] = useState("");
  const profile = draft ?? saved ?? PRESETS.electrique;
  const hasSaved = saved !== null;

  const set = <K extends keyof NeedsProfile>(key: K, value: NeedsProfile[K]) =>
    setDraft({ ...profile, nom: "Mon profil", [key]: value });

  const besoinPorte = profile.largeurFauteuil + MARGE_PORTE_CM;

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (saveProfile(profile)) router.push("/recherche/");
        else setMessage("Ce navigateur refuse l'enregistrement. Vérifiez que la navigation privée est désactivée.");
      }}
    >
      <section aria-labelledby="titre-exemples" className="flex flex-col gap-3 rounded-3xl bg-butter-100 p-5">
        <h2 id="titre-exemples" className="text-xl">
          Partir d&apos;un exemple
        </h2>
        <p className="text-ink-700">Choisissez le plus proche de votre situation, puis ajustez les réponses.</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_ORDER.map((id) => (
            <Button
              key={id}
              type="button"
              variant={profile.nom === PRESETS[id].nom ? "dark" : "outline"}
              aria-pressed={profile.nom === PRESETS[id].nom}
              onClick={() => setDraft(PRESETS[id])}
            >
              {profile.nom === PRESETS[id].nom && <Check aria-hidden="true" />}
              {PRESETS[id].nom}
            </Button>
          ))}
        </div>
      </section>

      <RadioCards
        legend="Quel fauteuil ?"
        name="fauteuil"
        value={profile.fauteuil}
        onChange={(v) => set("fauteuil", v)}
        options={[
          { value: "manuel", label: "Fauteuil manuel" },
          { value: "electrique", label: "Fauteuil électrique" },
        ]}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="largeur" className="text-lg font-extrabold">
          Largeur du fauteuil, roues comprises
        </label>
        <div className="flex items-center gap-3">
          <input
            id="largeur"
            type="number"
            inputMode="numeric"
            min={LARGEUR_MIN}
            max={LARGEUR_MAX}
            required
            value={profile.largeurFauteuil}
            onChange={(e) => set("largeurFauteuil", Number(e.target.value))}
            aria-describedby="largeur-aide"
            className="min-h-11 w-28 rounded-full border border-input bg-white px-4 text-lg font-bold"
          />
          <span className="font-bold">cm</span>
        </div>
        <p id="largeur-aide" className="text-sm text-ink-600">
          Entre {LARGEUR_MIN} et {LARGEUR_MAX} cm. Ability cherchera des portes d&apos;au moins{" "}
          <strong className="text-ink-900">
            {Number.isFinite(besoinPorte) && profile.largeurFauteuil >= LARGEUR_MIN ? besoinPorte : "…"} cm
          </strong>{" "}
          de passage ({MARGE_PORTE_CM} cm de marge).
        </p>
      </div>

      <RadioCards
        legend="Une marche à l'entrée, c'est possible ?"
        name="marche"
        value={profile.marche}
        onChange={(v) => set("marche", v)}
        options={[
          { value: "aucune", label: "Non, aucune marche", hint: "Il faut du plain-pied, une rampe ou un ascenseur." },
          { value: "une_avec_aide", label: "Une marche, avec de l'aide", hint: "Quelqu'un peut basculer le fauteuil." },
        ]}
      />

      <RadioCards
        legend="Comment se font les transferts ?"
        name="transfert"
        value={profile.transfert}
        onChange={(v) => set("transfert", v)}
        options={[
          { value: "autonome", label: "Seul·e", hint: "Du fauteuil au lit, aux toilettes, à la douche." },
          { value: "aide", label: "Avec l'aide d'une personne" },
          { value: "leve_personne", label: "Au lève-personne", hint: "Il faut de la place sous le lit pour le piétement." },
        ]}
      />

      {profile.transfert === "leve_personne" && (
        <RadioCards
          legend="Et le lève-personne ?"
          name="levePersonne"
          value={profile.levePersonne}
          onChange={(v) => set("levePersonne", v)}
          options={[
            { value: "apporte", label: "Nous apportons le nôtre" },
            { value: "sur_place", label: "Il en faut un sur place", hint: "Dans l'hébergement, ou en location à proximité." },
          ]}
        />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-extrabold">Dans l&apos;hébergement, il faut…</legend>
        <CheckRow
          checked={profile.douchePlainPied}
          onChange={(v) => set("douchePlainPied", v)}
          label="Une douche de plain-pied"
          hint="À l'italienne, sans ressaut ni bac."
        />
        <CheckRow
          checked={profile.wcTransfert}
          onChange={(v) => set("wcTransfert", v)}
          label="Un espace de transfert à côté des toilettes"
          hint="De la place pour ranger le fauteuil le long de la cuvette."
        />
        <CheckRow
          checked={profile.stationnement}
          onChange={(v) => set("stationnement", v)}
          label="Une place de stationnement adaptée"
          hint="Signalée comme point d'attention, sans exclure le lieu."
        />
      </fieldset>

      <p className="flex items-start gap-2 rounded-2xl border border-ink-200 bg-white p-4 text-ink-700">
        <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>
          Ces réponses restent dans ce navigateur. Elles ne sont envoyées nulle part, et Ability ne demande
          jamais de diagnostic.
        </span>
      </p>

      <p role="alert" className="font-bold text-ko-700 empty:hidden">
        {message}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg">
          <Search aria-hidden="true" />
          Enregistrer et voir les hébergements
        </Button>
        {hasSaved && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              clearProfile();
              setDraft(null);
              setMessage("Profil effacé de ce navigateur.");
            }}
          >
            <Trash2 aria-hidden="true" />
            Effacer mon profil
          </Button>
        )}
      </div>
    </form>
  );
}
