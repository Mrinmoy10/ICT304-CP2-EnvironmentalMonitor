import { forwardRef } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../../lib/utils.js";

/**
 * Radix Label wires the control association for us, so every field has a
 * programmatic label and a click on the text focuses the input.
 */
const Label = forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-xs font-medium text-ink-secondary", className)} {...props} />
));
Label.displayName = "Label";

export { Label };
