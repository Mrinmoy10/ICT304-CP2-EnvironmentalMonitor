import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { api } from "../lib/api.js";
import { METRICS, visibleLocations } from "../lib/data.js";
import { cn } from "../lib/utils.js";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { Segmented } from "../components/ui/segmented.jsx";
import { LineChart } from "../components/charts/LineChart.jsx";

const RANGES = [
  { value: "6", label: "6 h", points: 12 },
  { value: "24", label: "24 h", points: 48 },
  { value: "48", label: "48 h", points: 48 },
];

/** FR6 — historical environmental data trends. */
export default function Trends({ user, selected, setSelected }) {
  const locations = visibleLocations(user);
  const [range, setRange] = useState("24");
  const [data, setData] = useState(null);
  const [activeMetrics, setActiveMetrics] = useState(["temperature", "humidity", "air_quality"]);

  useEffect(() => {
    setData(null);
    api.getHistory(selected).then((history) => {
      setData(history.slice(-RANGES.find((r) => r.value === range).points));
    });
  }, [selected, range]);

  const series = Object.values(METRICS)
    .filter((m) => activeMetrics.includes(m.key))
    .map((m) => ({ key: m.key, label: m.label, color: m.accent }));

  // At least one series must remain visible, or the chart has nothing to draw.
  const toggleMetric = (key) =>
    setActiveMetrics((active) =>
      active.includes(key)
        ? active.length > 1
          ? active.filter((k) => k !== key)
          : active
        : [...active, key]
    );

  const summary = data
    ? Object.values(METRICS).map((m) => {
        const values = data.map((d) => d[m.key]);
        return {
          ...m,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
        };
      })
    : null;

  return (
    <>
      <div className="shell-gutter border-b border-line bg-surface-base/60 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MapPin size={15} className="text-ink-secondary" />
            <Segmented
              value={selected}
              onValueChange={(v) => setSelected(Number(v))}
              ariaLabel="Select a location"
              options={locations.map((l) => ({ value: l.location_id, label: l.name }))}
            />
          </div>
          <Segmented value={range} onValueChange={setRange} ariaLabel="Select date range" options={RANGES} />
        </div>
      </div>

      <div className="shell-gutter py-8">
        <div className="mb-6">
          <h1 className="text-page">Historical trends</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            How conditions have changed over time in the selected space.
          </p>
        </div>

        {/* Summary statistics sit above the chart so the reader does not have
            to estimate a range by eye (Shneiderman's eighth rule). */}
        <div className="mb-5 grid gap-5 sm:grid-cols-3">
          {summary
            ? summary.map((m) => (
                <Card key={m.key} accent={m.accent}>
                  <CardContent className="py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-ink-secondary">{m.label}</p>
                    <p className="mt-2 text-xl font-bold" style={{ color: m.accent }}>
                      {m.avg.toFixed(m.decimals)}
                      <span className="ml-1 text-xs font-medium text-ink-secondary">{m.unit} average</span>
                    </p>
                    <p className="mt-1.5 text-xs text-ink-secondary">
                      Range {m.min.toFixed(m.decimals)} – {m.max.toFixed(m.decimals)} {m.unit}
                    </p>
                  </CardContent>
                </Card>
              ))
            : [0, 1, 2].map((i) => <div key={i} className="skeleton h-[116px] rounded-xl" />)}
        </div>

        <Card>
          <CardHeader className="pb-0">
            <div>
              <h2 className="text-section">Measurement history</h2>
              <p className="mt-1 text-xs text-ink-secondary">Select a series to show or hide it</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.values(METRICS).map((m) => {
                const on = activeMetrics.includes(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleMetric(m.key)}
                    aria-pressed={on}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity",
                      on
                        ? "border-line bg-surface-raised text-ink-primary"
                        : "border-line/60 text-ink-secondary/60 hover:text-ink-secondary"
                    )}
                  >
                    <span
                      className="h-[3px] w-3 rounded-full"
                      style={{ background: m.accent, opacity: on ? 1 : 0.35 }}
                    />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent>
            {data ? (
              <LineChart series={series} data={data} height={340} />
            ) : (
              <div className="skeleton h-[340px] rounded-lg" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
