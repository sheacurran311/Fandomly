import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand-primary hover:bg-brand-primary/80 text-white hover:scale-[1.02] focus-visible:ring-brand-primary",
        secondary: "bg-brand-secondary hover:bg-brand-secondary/80 text-black hover:scale-[1.02] focus-visible:ring-brand-secondary",
        accent: "bg-brand-accent hover:bg-brand-accent/80 text-white hover:scale-[1.02] focus-visible:ring-brand-accent",
        destructive: "bg-red-500 hover:bg-red-600 text-white hover:scale-[1.02] focus-visible:ring-red-500",
        outline: "border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white focus-visible:ring-brand-primary",
        "outline-secondary": "border-2 border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-black focus-visible:ring-brand-secondary",
        "outline-destructive": "border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white focus-visible:ring-red-500",
        ghost: "text-gray-300 hover:text-white hover:bg-brand-primary/20 focus-visible:ring-brand-primary",
        link: "text-brand-primary underline-offset-4 hover:underline focus-visible:ring-brand-primary",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        default: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
