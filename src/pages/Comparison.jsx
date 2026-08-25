import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { METRICS, evaluate, visibleLocations, fmt } from "../lib/data.js";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { StatusBadge } from "../components/ui/badge.jsx";
import { Segmented } from "../components/ui/segmented.jsx";
import { BarChart } from "../components/charts/BarChart.jsx";
import { Legend } from "../components/charts/Legend.jsx";

/** Side-by-side comparison of every location the account is permitted to see. */
export default function Comparison({ user, thresholds }) {
  const locations = visibleLocations(user);
  const [readings, setReadings] = useState(null);
  const [metricFilter, setMetricFilter] = useState("all");

  useEffect(() => {
    const poll = () => api.getReadings().then(setReadings);
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const filterOptions = [
    { value: "all", label: "All" },
    ...Object.values(METRICS).map((m) => ({ value: m.key, label: m.label })),
  ];

  const series = Object.values(METRICS)
    .filter((m) => metricFilter === "all" || m.key === metricFilter)
    .map((m) => ({ key: m.key, label: m.label, color: m.accent }));

  const worstOf = (reading, locationId) => {
    const statuses = Object.keys(METRICS).map((m) => evaluate(reading[m], thresholds[locationId][m]));
    return statuses.includes("critical") ? "critical" : statuses.includes("warning") ? "warning" : "good";
  };

  return (
    <div className="shell-gutter py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page">Location comparison</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Current readings across every space you monitor, side by side.
          </p>
        </div>
        <Segmented value={metricFilter} onValueChange={setMetricFilter} ariaLabel="Filter by metric" options={filterOptions} />
      </div>

      {!readings ? (
        <div className="space-y-5">
          <div className="skeleton h-[380px] rounded-xl" />
          <div className="skeleton h-[220px] rounded-xl" />
        </div>
      ) : (
        <>
          <Card className="mb-5">
            <CardHeader className="pb-0">
              <h2 className="text-section">Current values by location</h2>
              <Legend series={series} />
            </CardHeader>
            <CardContent>
              <BarChart rows={locations.map((l) => ({ name: l.name, ...readings[l.location_id] }))} series={series} />
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-xl border border-line bg-surface-card">
            <div className="overflow-x-auto">
              <table className="data-table min-w-[42rem]">
                <caption className="sr-only">Current status of each monitored location</caption>
                <thead>
                  <tr>
                    <th scope="col">Location</th>
                    {Object.values(METRICS).map((m) => (
                      <th key={m.key} scope="col" className="text-right">{m.label}</th>
                    ))}
                    <th scope="col">Overall status</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((l) => {
                    const reading = readings[l.location_id];
                    return (
                      <tr key={l.location_id}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-medium">{l.name}</span>
                            <span className="text-xs text-ink-secondary">{l.type}</span>
                          </div>
                        </td>
                        {Object.keys(METRICS).map((m) => (
                          <td key={m} className="text-right font-semibold" style={{ color: METRICS[m].accent }}>
                            {fmt(reading[m], m)}
                            <span className="ml-1 text-xs font-normal text-ink-secondary">{METRICS[m].unit}</span>
                          </td>
                        ))}
                        <td>
                          {/* The most severe metric determines the overall state */}
                          <StatusBadge status={worstOf(reading, l.location_id)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
