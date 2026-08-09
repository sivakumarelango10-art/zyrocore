'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string
  variant?: 'hero' | 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  icon?: LucideIcon | boolean
  iconPosition?: 'right' | 'left'
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
  className?: string
  fullWidth?: boolean
}

export const PrimaryButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, PrimaryButtonProps>(
  (
    {
      href,
      variant = 'default',
      size = 'default',
      icon = true,
      iconPosition = 'right',
      children,
      onClick,
      className,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const IconComponent = typeof icon === 'boolean' ? (icon ? ArrowRight : null) : icon

    const sizeClasses = {
      sm: 'h-10 px-5 py-2.5 text-xs rounded-xl tracking-[0.15em]',
      default: 'h-12 sm:h-[52px] px-7 sm:px-9 py-3.5 text-xs sm:text-sm rounded-xl sm:rounded-2xl tracking-[0.18em]',
      lg: 'h-14 px-9 sm:px-10 py-4 text-xs sm:text-sm rounded-2xl tracking-[0.2em]',
    }[size]

    const variantClasses = {
      // Dark hero background style (subtle blur + white border, smoothly inverts to solid white background with black text on hover)
      hero: 'bg-white/10 backdrop-blur-md border border-white/40 text-white hover:bg-white hover:text-black hover:border-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_35px_rgba(255,255,255,0.25)]',
      
      // Standard light section primary style (dark filled button with white text and subtle hover glow)
      default: 'bg-foreground text-background border border-foreground hover:bg-foreground/90 hover:border-foreground/90 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.3)]',
      
      // Outline style (crisp border with hover fill)
      outline: 'bg-transparent text-foreground border border-foreground/30 hover:border-foreground hover:bg-foreground hover:text-background shadow-xs hover:shadow-md',
      
      // Secondary soft style
      secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:border-border/80 shadow-xs hover:shadow-md',
    }[variant]

    const baseClasses = cn(
      'group inline-flex items-center justify-center gap-3 font-semibold uppercase',
      'transition-all duration-300 ease-out transform hover:-translate-y-0.5 active:scale-[0.98]',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'cursor-pointer select-none touch-manipulation min-h-[48px]',
      fullWidth && 'w-full',
      sizeClasses,
      variantClasses,
      className
    )

    const content = (
      <>
        {IconComponent && iconPosition === 'left' && (
          <IconComponent className="w-4 h-4 transition-transform duration-300 ease-out group-hover:-translate-x-1.5 shrink-0" />
        )}
        <span>{children}</span>
        {IconComponent && iconPosition === 'right' && (
          <IconComponent className="w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5 shrink-0" />
        )}
      </>
    )

    if (href) {
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          onClick={e => {
            if (onClick) onClick(e)
          }}
          className={baseClasses}
        >
          {content}
        </Link>
      )
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick as (e: React.MouseEvent<HTMLButtonElement>) => void}
        className={baseClasses}
        {...props}
      >
        {content}
      </button>
    )
  }
)

PrimaryButton.displayName = 'PrimaryButton'
