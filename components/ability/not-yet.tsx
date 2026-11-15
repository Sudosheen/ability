"use client";

import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { logSignal } from "@/lib/signals";

/**
 * Bouton d'une fonction pas encore construite (« porte factice ») : le clic
 * est noté comme signal d'intérêt, puis la maquette dit honnêtement ce qu'il en est.
 */
export function NotYetButton({
  signal,
  children,
  message,
  variant = "default",
  className,
}: {
  signal: { type: string; detail: string };
  children: React.ReactNode;
  message: string;
  variant?: "default" | "outline" | "dark";
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        variant={variant}
        className="self-start"
        onClick={() => {
          logSignal(signal.type, signal.detail);
          setShown(true);
        }}
      >
        {children}
      </Button>
      <p role="status" className="text-sm text-ink-700 empty:hidden">
        {shown ? message : ""}
      </p>
    </div>
  );
}
