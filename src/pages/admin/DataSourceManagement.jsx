import { useState } from "react";
import { DATA_SOURCES } from "../../lib/data.js";
import { StatusBadge, Badge } from "../../components/ui/badge.jsx";
import { Switch } from "../../components/ui/switch.jsx";

const TYPE_TONE = {
  "IoT Sensor": "text-metric-humidity",
  "Public API": "text-metric-air",
  Simulated: "text-ink-secondary",
};

/** FR1, FR8 — control which sensors, APIs and generators contribute readings. */
export default function DataSourceManagement({ toast }) {
  const [sources, setSources] = useState(DATA_SOURCES);

  const setActive = (sourceId, value) =>
    setSources((list) => list.map((s) => (s.source_id === sourceId ? { ...s, is_active: value } : s)));

  const toggle = (source) => {
    const wasActive = source.is_active;
    setActive(source.source_id, !wasActive);

    toast({
      tone: wasActive ? "warning" : "good",
      title: wasActive ? "Data source disabled" : "Data source enabled",
      description: `${source.name} will ${wasActive ? "stop" : "resume"} contributing readings from the next collection cycle.`,
      undo: () => {
        setActive(source.source_id, wasActive);
        toast({ tone: "info", title: "Change reverted", description: `${source.name} is ${wasActive ? "streaming" : "disabled"} again.` });
      },
    });
  };

  const activeCount = sources.filter((s) => s.is_active).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-page">Data source management</h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          Control which sensors, APIs and generators are contributing readings.
          {" "}
          <span className="text-ink-primary">{activeCount} of {sources.length}</span> are currently streaming.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface-card">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[46rem]">
            <caption className="sr-only">Configured data sources</caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Type</th>
                <th scope="col">Endpoint</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source_id}>
                  <td className="font-medium">{s.name}</td>
                  <td>
                    <Badge tone="neutral">
                      <span className={`h-1.5 w-1.5 rounded-full bg-current ${TYPE_TONE[s.source_type]}`} />
                      {s.source_type}
                    </Badge>
                  </td>
                  <td className="font-mono text-xs text-ink-secondary">{s.endpoint}</td>
                  <td>
                    <StatusBadge status={s.is_active ? "good" : "neutral"} outline={!s.is_active}>
                      {s.is_active ? "Streaming" : "Disabled"}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="flex justify-end">
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={() => toggle(s)}
                        aria-label={`${s.is_active ? "Disable" : "Enable"} ${s.name}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
