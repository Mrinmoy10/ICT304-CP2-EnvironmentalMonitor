import { Leaf, LogOut, Search, Bell, Command } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { Tooltip } from "./ui/tooltip.jsx";
import { cn } from "../lib/utils.js";

/**
 * Application shell: a slim identity bar above a context bar.
 *
 * Separating the two means the top row never changes as the user navigates,
 * while the second row always names where they are and what is happening
 * there. Consistent placement of navigation is Shneiderman's first rule; the
 * persistent location and connection state address the seventh, keeping the
 * user in control by never leaving them guessing about system status.
 */
export function AppShell({ user, route, tabs, onNavigate, onSignOut, onOpenCommand, contextBar, unreadAlerts, children }) {
  const initials = user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-surface-card/95 backdrop-blur">
        <div className="shell-gutter flex h-14 items-center gap-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-metric-humidity to-brand text-surface-base">
              <Leaf size={15} />
            </span>
            <span className="hidden font-semibold tracking-tight sm:block">Environmental Monitor</span>
          </div>

          <nav aria-label="Main" className="flex flex-1 items-center gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onNavigate(t.id)}
                aria-current={route === t.id ? "page" : undefined}
                className={cn(
                  "h-9 shrink-0 rounded-lg px-3.5 text-[13px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity",
                  route === t.id
                    ? "bg-surface-raised text-ink-primary"
                    : "text-ink-secondary hover:bg-surface-raised/60 hover:text-ink-primary"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <Tooltip label="Search — Ctrl K">
              <Button variant="ghost" size="icon-sm" onClick={onOpenCommand} aria-label="Open command palette">
                <Search size={15} />
              </Button>
            </Tooltip>

            <Tooltip label={unreadAlerts ? `${unreadAlerts} unacknowledged alerts` : "No open alerts"}>
              <Button variant="ghost" size="icon-sm" className="relative" aria-label="Alerts">
                <Bell size={15} />
                {unreadAlerts > 0 && (
                  <span className="absolute right-1 top-1 flex h-1.5 w-1.5 rounded-full bg-state-critical" />
                )}
              </Button>
            </Tooltip>

            <Tooltip label={`${user.full_name} · ${user.role}`}>
              <span className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-raised text-[11px] font-semibold">
                {initials}
              </span>
            </Tooltip>

            <Tooltip label="Sign out">
              <Button variant="ghost" size="icon-sm" onClick={onSignOut} aria-label="Sign out">
                <LogOut size={15} />
              </Button>
            </Tooltip>
          </div>
        </div>

        {contextBar && (
          <div className="shell-gutter flex h-12 items-center justify-between gap-4 border-t border-line/60 bg-surface-base/40">
            {contextBar}
          </div>
        )}
      </header>

      <main id="main">{children}</main>

      <footer className="shell-gutter border-t border-line py-5 text-xs text-ink-secondary">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Environmental Monitor — ICT304 Capstone Project 2 prototype</span>
          <span className="flex items-center gap-1.5">
            <Command size={12} />
            Press Ctrl K to search
          </span>
        </div>
      </footer>
    </div>
  );
}
