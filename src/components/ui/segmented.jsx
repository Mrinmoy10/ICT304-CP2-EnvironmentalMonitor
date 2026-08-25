import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { cn } from "../../lib/utils.js";

/**
 * Segmented control for small, mutually exclusive choices.
 *
 * Every option stays visible, so the user recognises rather than recalls
 * what is available — Shneiderman's eighth rule. Radix ToggleGroup provides
 * roving focus, so arrow keys move between options.
 */
export function Segmented({ value, onValueChange, options, ariaLabel, className }) {
  return (
    <ToggleGroup.Root
      type="single"
      value={String(value)}
      onValueChange={(v) => v && onValueChange(v)}
      aria-label={ariaLabel}
      className={cn("inline-flex gap-1 rounded-lg border border-line bg-surface-sunken p-1", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={String(o.value)}
          className={cn(
            "h-9 rounded-md px-3.5 text-[13px] font-medium text-ink-secondary transition-colors",
            "hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity",
            "data-[state=on]:bg-surface-raised data-[state=on]:text-ink-primary data-[state=on]:shadow-sm"
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
