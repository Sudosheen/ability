"use client";

import { usePathname } from "next/navigation";
import { MessageSquareText } from "lucide-react";

/**
 * « Donner mon avis » : ouvre le formulaire Tally configuré dans
 * NEXT_PUBLIC_TALLY_URL, avec le nom de l'écran en champ caché (« ecran »).
 * Sans formulaire configuré, le bouton n'apparaît pas.
 */
const TALLY_URL = process.env.NEXT_PUBLIC_TALLY_URL ?? "";

export function FeedbackButton() {
  const pathname = usePathname();
  if (!TALLY_URL) return null;
  const sep = TALLY_URL.includes("?") ? "&" : "?";
  return (
    <a
      href={`${TALLY_URL}${sep}ecran=${encodeURIComponent(pathname)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 bottom-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink-900 bg-sun-400 px-5 font-bold text-ink-900 shadow-[0_4px_0_0_var(--color-ink-900)] hover:bg-sun-500 print:hidden"
    >
      <MessageSquareText aria-hidden="true" className="size-5" />
      Donner mon avis
      <span className="sr-only">(formulaire dans un nouvel onglet)</span>
    </a>
  );
}
