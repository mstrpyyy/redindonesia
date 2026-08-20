import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0  outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive duration-200",
  {
    variants: {
      variant: {
        default: 
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border border-black bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        outlineSecondary:
          "rounded-full max-lg:h-8 text-base lg:text-lg gap-3 font-medium w-fit border border-black text-black bg-none shadow-xs hover:bg-black hover:text-white active:bg-black active:text-white",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline",
        glass:
          "bg-white/20 backdrop-blur-xs  hover:bg-white/40 text-white",
        transparent:
          "bg-transparent backdrop-blur-sm text-white hover:bg-white/20"
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
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
  const Comp = asChild ? Slot : "button"

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
