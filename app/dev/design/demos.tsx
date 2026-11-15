"use client";

import { useState } from "react";
import { CategoryIcon } from "@/components/ability/category-icon";
import { FilterChip } from "@/components/ability/filter-chip";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { Category } from "@/lib/types";

const DEMO: Category[] = ["hebergement", "restauration", "toilettes"];

export function FilterChipDemo() {
  const [active, setActive] = useState<Set<Category>>(() => new Set<Category>(["hebergement"]));
  return (
    <div className="flex flex-wrap gap-2">
      {DEMO.map((c) => (
        <FilterChip
          key={c}
          pressed={active.has(c)}
          onPressedChange={(on) =>
            setActive((prev) => {
              const next = new Set(prev);
              if (on) next.add(c);
              else next.delete(c);
              return next;
            })
          }
          count={c === "hebergement" ? 1285 : c === "restauration" ? 1894 : 839}
          icon={<CategoryIcon category={c} className="size-4" />}
        >
          {CATEGORY_LABELS[c]}
        </FilterChip>
      ))}
    </div>
  );
}
