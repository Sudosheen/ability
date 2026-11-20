import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Bouton shadcn adapté à Ability : cibles de 44 px au moins, texte encre sur
// fond soleil pour l'action principale, focus géré par l'anneau global.
// Un libellé long passe à la ligne au lieu de faire déborder la page sur mobile.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-transparent max-w-full text-center font-bold whitespace-normal transition-colors select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-sun-500",
        outline: "border-ink-400 bg-white text-ink-900 hover:bg-butter-100",
        secondary: "bg-butter-100 text-ink-900 hover:bg-butter-300",
        ghost: "text-ink-900 hover:bg-butter-100",
        dark: "bg-ink-900 text-white hover:bg-ink-700",
        link: "rounded-none p-0 text-ink-900 underline underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "min-h-11 px-5 py-2 text-base",
        sm: "min-h-11 px-4 py-2 text-sm",
        lg: "min-h-14 px-7 py-2 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
