import { Button } from "./button.jsx";

/**
 * An empty result is a moment for direction, not an apology. It says what
 * happened and offers the action that resolves it.
 */
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-raised text-ink-secondary">
          <Icon size={20} />
        </div>
      )}
      <p className="font-semibold text-ink-primary">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-secondary">{description}</p>}
      {actionLabel && (
        <Button variant="secondary" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
