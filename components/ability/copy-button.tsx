"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copie un texte dans le presse-papiers et le confirme à l'écran et aux lecteurs d'écran. */
export function CopyButton({ text, children }: { text: string; children: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  return (
    <span className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("done");
          } catch {
            setState("error");
          }
        }}
      >
        {state === "done" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {children}
      </Button>
      <span role="status" className="text-sm text-ink-700">
        {state === "done" && "Message copié."}
        {state === "error" && "Copie impossible : sélectionnez le texte à la main."}
      </span>
    </span>
  );
}
