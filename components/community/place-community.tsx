"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blocsFor, summarizePlaces } from "@/lib/community";
import { getDemoCommunity } from "@/lib/data";
import { useCommunity } from "@/lib/storage";
import type { Place } from "@/lib/types";
import { PlaceCommunityCard } from "./verdict";

/** Sur la fiche d'un lieu : ce qu'en dit la communauté, et le bouton pour donner son retour. */
export function PlaceCommunity({ place }: { place: Place }) {
  const mine = useCommunity();
  const summary = useMemo(() => {
    const retours = [...getDemoCommunity().retours, ...(mine?.retours ?? [])].filter((r) => r.lieuId === place.id);
    return summarizePlaces(retours, new Date().toISOString().slice(0, 10))[0] ?? null;
  }, [mine, place.id]);

  // Toilettes, stationnement… : aucun bloc à confirmer par les voyageurs.
  if (blocsFor(place.categorie).length === 0) return null;

  return (
    <section aria-labelledby={`communaute-${place.id}`} className="flex flex-col gap-3">
      <h2 id={`communaute-${place.id}`} className="text-xl">
        L&apos;avis de la communauté
      </h2>
      {summary ? (
        <PlaceCommunityCard summary={summary} />
      ) : (
        <p className="text-ink-700">Aucun voyageur n&apos;a encore donné son retour sur ce lieu.</p>
      )}
      <p className="text-sm text-ink-600">
        Vous y êtes allé·e ? Confirmez ou non chaque point de la fiche : deux retours concordants font passer un bloc au
        niveau « Confirmé par la communauté ».
      </p>
      <Button asChild variant="outline" className="self-start">
        <Link href={`/communaute/?lieu=${place.id}#donner-un-retour`}>
          <MessagesSquare aria-hidden="true" />
          Donner mon retour sur ce lieu
        </Link>
      </Button>
    </section>
  );
}
