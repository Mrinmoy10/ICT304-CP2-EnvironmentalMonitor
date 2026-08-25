import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";

const Card = forwardRef(({ className, accent, ...props }, ref) => (
  <div
    ref={ref}
    style={accent ? { "--card-accent": accent } : undefined}
    className={cn(
      "relative overflow-hidden rounded-xl border border-line bg-surface-card",
      // A three-pixel rule in the metric's own accent colour ties the card to
      // its series in every chart on the page.
      accent && "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--card-accent)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-[13px] font-medium uppercase tracking-[0.06em] text-ink-secondary", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-5 py-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between gap-3 border-t border-line/70 px-5 py-3 text-xs text-ink-secondary", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
