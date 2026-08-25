import { useState, useEffect, useMemo } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog.jsx";
import { cn } from "../lib/utils.js";

/**
 * Command palette, opened with Ctrl+K or Cmd+K.
 *
 * Shneiderman's second rule asks for universal usability: the same interface
 * should serve a first-time user and a frequent one. Every action here is
 * also reachable by pointer from the navigation, so the shortcut is an
 * accelerator rather than the only route.
 */
export function CommandPalette({ open, onOpenChange, commands }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.group} ${c.keywords || ""}`.toLowerCase().includes(q));
  }, [query, commands]);

  const run = (command) => {
    onOpenChange(false);
    command.run();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      run(results[active]);
    }
  };

  let lastGroup = null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search for a screen or action, then press Enter to run it.
        </DialogDescription>

        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-ink-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search screens and actions…"
            aria-label="Search screens and actions"
            className="h-14 w-full bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-secondary/60"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-secondary sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-ink-secondary">
              Nothing matches “{query}”. Try a screen name such as Trends or Admin.
            </p>
          )}

          {results.map((c, i) => {
            const showGroup = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {showGroup && (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                    {c.group}
                  </p>
                )}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm",
                    i === active ? "bg-surface-raised text-ink-primary" : "text-ink-secondary"
                  )}
                >
                  {c.icon && <c.icon size={15} className="shrink-0" />}
                  <span className="flex-1">{c.label}</span>
                  {i === active && <CornerDownLeft size={13} className="text-ink-secondary" />}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
