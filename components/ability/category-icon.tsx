import {
  BedDouble,
  Building2,
  Cross,
  Info,
  Landmark,
  MapPin,
  ShoppingBag,
  SquareParking,
  Toilet,
  Umbrella,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";

const ICONS: Record<Category, LucideIcon> = {
  hebergement: BedDouble,
  restauration: Utensils,
  activite: Landmark,
  plage: Umbrella,
  toilettes: Toilet,
  stationnement: SquareParking,
  info: Info,
  sante: Cross,
  commerce: ShoppingBag,
  service: Building2,
  autre: MapPin,
};

/** Pictogramme décoratif d'une catégorie : toujours accompagné de son libellé. */
export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = ICONS[category];
  return <Icon aria-hidden="true" className={className} />;
}
