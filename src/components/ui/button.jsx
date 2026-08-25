import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

/**
 * Variants are declared once here so every button in the application is
 * consistent by construction — Shneiderman's first rule, enforced in code
 * rather than by convention.
 *
 * Minimum height is 44px on the default size, meeting the WCAG 2.2 target
 * size recorded in Assessment 1 section 4.4.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold " +
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base " +
    "disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-strong",
        secondary: "border border-line bg-transparent text-ink-primary hover:bg-surface-raised",
        ghost: "bg-transparent text-ink-secondary hover:bg-surface-raised hover:text-ink-primary",
        danger: "border border-state-critical/40 bg-transparent text-state-critical hover:bg-state-critical/10",
        link: "bg-transparent text-metric-humidity underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-[13px]",
        icon: "h-11 w-11",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

const Button = forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
