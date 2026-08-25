import { createContext, useContext, useState, useCallback, useRef } from "react";
import { X, Undo2 } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.jsx";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const TONE_BORDER = {
  good: "border-l-state-good",
  warning: "border-l-state-warning",
  critical: "border-l-state-critical",
  info: "border-l-metric-humidity",
};

/**
 * Feedback and reversal, in one component.
 *
 * Shneiderman's third rule asks for informative feedback after every action;
 * the sixth asks that actions be easy to reverse. A toast that reports what
 * happened and carries an Undo button satisfies both, and means a destructive
 * action does not need a confirmation dialog in front of it.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ tone = "info", title, description, undo, duration = 6000 }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((list) => [...list.slice(-2), { id, tone, title, description, undo }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* aria-live polite: announced without interrupting the current task */}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(24rem,calc(100vw-3rem))] flex-col gap-3"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto animate-slide-in-right rounded-lg border border-l-[3px] border-line",
              "bg-surface-raised p-4 shadow-2xl shadow-black/40",
              TONE_BORDER[t.tone]
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-primary">{t.title}</p>
                {t.description && <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{t.description}</p>}
                {t.undo && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => { t.undo(); dismiss(t.id); }}
                  >
                    <Undo2 size={13} />
                    Undo
                  </Button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-1 text-ink-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
