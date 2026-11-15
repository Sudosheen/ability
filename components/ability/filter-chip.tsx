"use client";

import { Check } from "lucide-react";
import { cn } from "cn";

/** Puce de filtre : un bouton à bascule (aria-pressed), avec une coche quand il est actif. */
export function FilterChip({
  pressed,
  onPressedChange,
  children,
  count,
  icon,
  className,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors",
        pressed
          ? "border-ink-900 bg-butter-300 text-ink-900"
          : "border-ink-400 bg-white text-ink-700 hover:bg-butter-100",
        className,
      )}
    >
      {pressed ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : icon}
      <span>{children}</span>
      {count !== undefined && (
        <span className="font-normal text-ink-600">{count.toLocaleString("fr-FR")}</span>
      )}
    </button>
  );
}
