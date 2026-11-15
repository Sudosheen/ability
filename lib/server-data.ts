/** Lecture des données au moment du build (composants serveur uniquement). */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Commune } from "./data";
import type { AccessStatus, Category, SourceId } from "./types";

export type Meta = {
  genereLe: string;
  sources: {
    id: SourceId;
    titre: string;
    licence: string;
    attribution: string;
    recupereLe: string;
    fiches: number;
    note: string | null;
  }[];
  total: number;
  parCouche: Record<"places" | "services" | "equipements", number>;
  parCategorie: Record<Category, number>;
  parStatut: Record<AccessStatus, number>;
  hebergements: { total: number; parStatut: Partial<Record<AccessStatus, number>> };
  fictifs: number;
  fusions: number;
  divergences: number;
};

function read<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "public/data", file), "utf8")) as T;
  } catch {
    throw new Error(`public/data/${file} est introuvable : lancez « pnpm etl » avant le build.`);
  }
}

export const getMeta = () => read<Meta>("meta.json");
export const getCommuneList = () => read<Commune[]>("communes.json");
