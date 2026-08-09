import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer select-none touch-manipulation min-h-[44px]",
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background hover:bg-foreground/90 hover:shadow-lg hover:-translate-y-0.5 border border-foreground',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-border bg-background shadow-xs hover:bg-foreground hover:text-background hover:border-foreground hover:shadow-md dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 hover:shadow-sm',
        link: 'text-primary underline-offset-4 hover:underline hover:opacity-80',
        hero: 'bg-white/10 backdrop-blur-md border border-white/40 text-white hover:bg-white hover:text-black hover:border-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_35px_rgba(255,255,255,0.25)] hover:-translate-y-0.5',
      },
      size: {
        default: 'h-11 px-6 py-2.5 rounded-xl',
        sm: 'h-9 rounded-lg gap-1.5 px-4 text-xs',
        lg: 'h-12 sm:h-[52px] rounded-xl sm:rounded-2xl px-8 sm:px-9 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.18em]',
        icon: 'size-10 rounded-xl',
        'icon-sm': 'size-8 rounded-lg',
        'icon-lg': 'size-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      suppressHydrationWarning
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
