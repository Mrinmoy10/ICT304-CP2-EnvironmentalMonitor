import { useState, useEffect, useMemo } from "react";
import { Download, ArrowUpDown, Inbox } from "lucide-react";
import { api } from "../lib/api.js";
import { METRICS, evaluate, visibleLocations, stamp } from "../lib/data.js";
import { cn } from "../lib/utils.js";
import { StatusBadge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select.jsx";
import { EmptyState } from "../components/ui/empty-state.jsx";

const PER_PAGE = 12;

/** Full tabular record of measurements, with sorting, filtering and CSV export. */
export default function Readings({ user, thresholds, toast }) {
  const locations = visibleLocations(user);
  const allowedIds = locations.map((l) => l.location_id);

  const [rows, setRows] = useState(null);
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState({ key: "recorded_at", dir: "desc" });
  const [page, setPage] = useState(1);

  useEffect(() => { api.getAllReadings().then(setRows); }, []);

  const worstOf = (r) => {
    const statuses = Object.keys(METRICS).map((m) => evaluate(r[m], thresholds[r.location_id][m]));
    return statuses.includes("critical") ? "critical" : statuses.includes("warning") ? "warning" : "good";
  };

  const filtered = useMemo(() => {
    if (!rows) return [];
    const list = rows
      .filter((r) => allowedIds.includes(r.location_id))
      .filter((r) => locationFilter === "all" || String(r.location_id) === locationFilter)
      .filter((r) => statusFilter === "all" || worstOf(r) === statusFilter);

    return [...list].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const av = sort.key === "location" ? a.location : a[sort.key];
      const bv = sort.key === "location" ? b.location : b[sort.key];
      return av > bv ? dir : av < bv ? -dir : 0;
    });
  }, [rows, locationFilter, statusFilter, sort, user, thresholds]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const resetFilters = () => {
    setLocationFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const exportCsv = () => {
    const header = ["recorded_at", "location", "temperature_c", "humidity_pct", "air_quality_aqi", "status"];
    const body = filtered.map((r) => [
      new Date(r.recorded_at).toISOString(),
      r.location,
      r.temperature.toFixed(1),
      r.humidity.toFixed(0),
      r.air_quality.toFixed(0),
      worstOf(r),
    ]);

    const csv = [header, ...body].map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "sensor_readings.csv";
    link.click();
    URL.revokeObjectURL(url);

    toast({
      tone: "good",
      title: "Export complete",
      description: `${filtered.length} readings written to sensor_readings.csv.`,
    });
  };

  if (!rows) {
    return <div className="shell-gutter py-8"><div className="skeleton h-[520px] rounded-xl" /></div>;
  }

  const SortHeader = ({ label, sortKey, align = "left" }) => (
    <th scope="col" className={align === "right" ? "text-right" : undefined}>
      <button
        onClick={() => toggleSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded transition-colors hover:text-ink-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity",
          sort.key === sortKey && "text-ink-primary"
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <ArrowUpDown size={11} className={sort.key === sortKey ? "opacity-100" : "opacity-40"} />
      </button>
    </th>
  );

  return (
    <div className="shell-gutter py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page">All sensor readings</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Complete tabular record of measurements taken across your spaces.
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download size={15} />
          Export CSV
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by location">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.location_id} value={String(l.location_id)}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="good">Normal</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-ink-secondary">
          {filtered.length} of {rows.filter((r) => allowedIds.includes(r.location_id)).length} readings
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No readings match these filters"
            description="Nothing was recorded for that combination of location and status. Clearing the filters will show the full record."
            actionLabel="Clear filters"
            onAction={resetFilters}
          />
        ) : (
          <>
            <div className="max-h-[34rem] overflow-auto">
              <table className="data-table min-w-[46rem]">
                <caption className="sr-only">Environmental measurements</caption>
                <thead>
                  <tr>
                    <SortHeader label="Recorded at" sortKey="recorded_at" />
                    <SortHeader label="Location" sortKey="location" />
                    <SortHeader label="Temperature" sortKey="temperature" align="right" />
                    <SortHeader label="Humidity" sortKey="humidity" align="right" />
                    <SortHeader label="Air quality" sortKey="air_quality" align="right" />
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => (
                    <tr key={`${r.location_id}-${r.recorded_at}-${i}`}>
                      <td className="whitespace-nowrap text-ink-secondary">{stamp(r.recorded_at)}</td>
                      <td className="font-medium">{r.location}</td>
                      <td className="text-right font-semibold text-metric-temperature">{r.temperature.toFixed(1)} °C</td>
                      <td className="text-right font-semibold text-metric-humidity">{r.humidity.toFixed(0)} %</td>
                      <td className="text-right font-semibold text-metric-air">{r.air_quality.toFixed(0)} AQI</td>
                      <td><StatusBadge status={worstOf(r)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <span className="text-xs text-ink-secondary">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    aria-current={page === i + 1}
                    aria-label={`Page ${i + 1}`}
                    className={cn(
                      "h-9 min-w-9 rounded-lg border px-2 text-[13px] transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metric-humidity",
                      page === i + 1
                        ? "border-metric-humidity bg-surface-raised text-ink-primary"
                        : "border-line text-ink-secondary hover:text-ink-primary"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
