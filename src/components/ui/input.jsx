import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";

const Input = forwardRef(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      "h-11 w-full rounded-lg border bg-surface-base px-3.5 text-sm text-ink-primary",
      "placeholder:text-ink-secondary/60 focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-metric-humidity disabled:opacity-45",
      invalid ? "border-state-critical" : "border-line",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
