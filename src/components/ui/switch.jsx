import { forwardRef } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils.js";

/** Radix Switch renders role="switch" with correct aria-checked state. */
const Switch = forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
      "data-[state=checked]:border-state-good data-[state=checked]:bg-state-good/25",
      "data-[state=unchecked]:border-line data-[state=unchecked]:bg-surface-base",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full transition-transform",
        "data-[state=checked]:translate-x-6 data-[state=checked]:bg-state-good",
        "data-[state=unchecked]:translate-x-1 data-[state=unchecked]:bg-ink-secondary"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
