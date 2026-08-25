import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils.js";

const TooltipProvider = TooltipPrimitive.Provider;

/** Icon-only controls need an accessible name and a visible hint on hover. */
export function Tooltip({ label, children, side = "top" }) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-50 rounded-md border border-line bg-surface-raised px-2.5 py-1.5",
            "text-xs font-medium text-ink-primary shadow-xl"
          )}
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { TooltipProvider };
