import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        good: "border-state-good/35 bg-state-good/10 text-state-good",
        warning: "border-state-warning/35 bg-state-warning/10 text-state-warning",
        critical: "border-state-critical/35 bg-state-critical/10 text-state-critical",
        neutral: "border-line bg-surface-raised text-ink-secondary",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({ tone, className, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}

/**
 * Status is carried by three signals at once: a word, a dot shape and a
 * colour. Colour alone would fail for a reader with a colour-vision
 * deficiency, so a filled dot marks an active or normal state and an
 * outlined dot marks an inactive or pending one (A1 section 4.6).
 */
export function StatusBadge({ status, outline = false, children }) {
  const word = { good: "Normal", warning: "Warning", critical: "Critical", neutral: "Inactive" }[status];
  return (
    <Badge tone={status}>
      <span
        className={cn(
          "shrink-0 rounded-full",
          outline ? "h-2 w-2 border-[1.5px] border-current" : "h-1.5 w-1.5 bg-current"
        )}
      />
      {children || word}
    </Badge>
  );
}
