import Image from "next/image";
import { cn } from "cn";
import logo from "@/assets/brand/ability-logo.png";
import logoFondFonce from "@/assets/brand/ability-logo-fond-fonce.png";
import nom from "@/assets/brand/ability-nom.png";
import soleil from "@/assets/brand/ability-soleil.png";

/**
 * Logo Ability. Les fichiers d'origine sont dans assets/brand/ :
 * - ability-logo.png : logo complet (soleil, nom, « Le monde est à vous »), fonds clairs ;
 * - ability-logo-fond-fonce.png : la même chose avec le texte en blanc, fonds foncés ;
 * - ability-logo-blanc.png : tout en blanc, sur photo ou couleur ;
 * - ability-soleil.png : le soleil seul (icône, décor) ;
 * - ability-nom.png et ability-nom-blanc.png : le mot ABILITY seul, pour la version horizontale.
 * Les images importées passent par Next : le chemin de base de GitHub Pages est ajouté tout seul.
 */

export const SLOGAN = "Le monde est à vous";

/**
 * Version horizontale (soleil + nom), pour l'en-tête. Purement visuelle :
 * le lien qui l'entoure porte le nom accessible.
 */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Image src={soleil} alt="" className="h-11 w-auto" priority />
      <Image src={nom} alt="" className="h-[1.1rem] w-auto" priority />
    </span>
  );
}

/** Logo complet avec le slogan. Sur fond foncé, utiliser `fondFonce`. */
export function LogoFull({ fondFonce = false, className }: { fondFonce?: boolean; className?: string }) {
  return (
    <Image
      src={fondFonce ? logoFondFonce : logo}
      alt={`Ability, ${SLOGAN.toLowerCase()}`}
      className={cn("h-auto", className)}
    />
  );
}

/** Le soleil seul, en décor : ignoré par les lecteurs d'écran. */
export function SunMark({ className }: { className?: string }) {
  return <Image src={soleil} alt="" aria-hidden="true" className={className} />;
}
