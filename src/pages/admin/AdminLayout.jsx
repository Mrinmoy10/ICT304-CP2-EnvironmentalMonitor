import { Users, SlidersHorizontal, Radio } from "lucide-react";
import { cn } from "../../lib/utils.js";
import UserManagement from "./UserManagement.jsx";
import ThresholdConfig from "./ThresholdConfig.jsx";
import DataSourceManagement from "./DataSourceManagement.jsx";

const SECTIONS = [
  { id: "users", label: "User management", icon: Users, hint: "Accounts, roles and location access" },
  { id: "thresholds", label: "Threshold configuration", icon: SlidersHorizontal, hint: "Warning and critical bands" },
  { id: "sources", label: "Data source management", icon: Radio, hint: "Sensors, APIs and generators" },
];

/** Administration shell: persistent sidebar beside the content pane (A1 Figure 7). */
export default function AdminLayout({ section, setSection, thresholds, setThresholds, toast }) {
  return (
    <div className="shell-gutter py-8">
      <div className="grid items-start gap-8 lg:grid-cols-[248px_1fr]">
        <nav aria-label="Administration" className="lg:sticky lg:top-[5.5rem]">
          <p className="mb-3 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary lg:block">
            Administration
          </p>

          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s) => {
              const current = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors lg:w-full lg:shrink",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity",
                    current
                      ? "border-line bg-surface-raised text-ink-primary"
                      : "border-transparent text-ink-secondary hover:bg-surface-raised/50 hover:text-ink-primary lg:border-transparent"
                  )}
                >
                  <s.icon size={15} className={cn("mt-0.5 shrink-0", current && "text-metric-humidity")} />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-[13px] font-medium lg:whitespace-normal">{s.label}</span>
                    <span className="mt-0.5 hidden text-[11px] leading-snug text-ink-secondary lg:block">{s.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0">
          {section === "users" && <UserManagement toast={toast} />}
          {section === "thresholds" && (
            <ThresholdConfig thresholds={thresholds} setThresholds={setThresholds} toast={toast} />
          )}
          {section === "sources" && <DataSourceManagement toast={toast} />}
        </div>
      </div>
    </div>
  );
}
