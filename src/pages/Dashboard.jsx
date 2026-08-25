import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Check, RefreshCw, MapPin } from "lucide-react";
import { api } from "../lib/api.js";
import { LOCATIONS, METRICS, evaluate, visibleLocations, fmt } from "../lib/data.js";
import { relativeTime } from "../lib/utils.js";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card.jsx";
import { StatusBadge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import { Segmented } from "../components/ui/segmented.jsx";
import { Tooltip } from "../components/ui/tooltip.jsx";
import { Sparkline } from "../components/charts/Sparkline.jsx";
import { Gauge } from "../components/charts/Gauge.jsx";
import { LineChart } from "../components/charts/LineChart.jsx";
import { Legend } from "../components/charts/Legend.jsx";

/** FR3 real-time visualisation, FR4 location selection, FR5 threshold alerts. */
export default function Dashboard({ user, thresholds, alerts, onAcknowledge, toast, selected, setSelected }) {
  const locations = visibleLocations(user);
  const [readings, setReadings] = useState(null);
  const [trend, setTrend] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [, forceTick] = useState(0);
  const previousStatus = useRef({});

  useEffect(() => {
    let active = true;

    const poll = async () => {
      const next = await api.getReadings();
      if (!active) return;

      setReadings(next);
      setUpdatedAt(Date.now());
      setTrend((t) => [...t.slice(-39), { recorded_at: Date.now(), ...next[selected] }]);

      // An alert is raised on transition into Warning or Critical, not on every
      // poll, so a sustained breach reports once rather than every five seconds.
      Object.keys(METRICS).forEach((metric) => {
        const status = evaluate(next[selected][metric], thresholds[selected][metric]);
        const key = `${selected}:${metric}`;

        if (status !== previousStatus.current[key] && status !== "good") {
          const location = LOCATIONS.find((l) => l.location_id === Number(selected));
          toast({
            tone: status,
            title: `${status === "critical" ? "Critical" : "Warning"} — ${METRICS[metric].label}`,
            description: `${location.name} reported ${fmt(next[selected][metric], metric)}${METRICS[metric].unit}, outside the configured band.`,
            severity: status,
            metric,
            location: location.name,
          });
        }
        previousStatus.current[key] = status;
      });
    };

    poll();
    const pollId = setInterval(poll, 5000);          // five-second poll (A1 2.4)
    const clockId = setInterval(() => forceTick((n) => n + 1), 15000); // refresh "x ago"
    return () => {
      active = false;
      clearInterval(pollId);
      clearInterval(clockId);
    };
  }, [selected, thresholds, toast]);

  useEffect(() => setTrend([]), [selected]);

  const openCritical = alerts.filter((a) => !a.acknowledged && a.severity === "critical");
  const series = Object.values(METRICS).map((m) => ({ key: m.key, label: m.label, color: m.accent }));
  const location = LOCATIONS.find((l) => l.location_id === Number(selected));

  return (
    <>
      {/* Context bar content is rendered by the shell; the pills live here so
          the current location is always visible while scrolling. */}
      <div className="shell-gutter border-b border-line bg-surface-base/60 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MapPin size={15} className="text-ink-secondary" />
            <Segmented
              value={selected}
              onValueChange={(v) => setSelected(Number(v))}
              ariaLabel="Select a monitoring location"
              options={locations.map((l) => ({ value: l.location_id, label: l.name }))}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-secondary">
            <span className="flex h-1.5 w-1.5 animate-pulse-dot rounded-full bg-state-good" />
            {updatedAt ? `Updated ${relativeTime(updatedAt)}` : "Connecting…"}
            <Tooltip label="Refresh now">
              <Button variant="ghost" size="icon-sm" aria-label="Refresh readings"
                      onClick={() => api.getReadings().then((r) => { setReadings(r); setUpdatedAt(Date.now()); })}>
                <RefreshCw size={13} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="shell-gutter py-8">
        {openCritical.length > 0 && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-state-critical/40 bg-state-critical/10 px-5 py-4"
          >
            <AlertTriangle size={19} className="shrink-0 text-state-critical" />
            <div className="min-w-[12rem] flex-1">
              <p className="font-semibold">
                {openCritical.length} unacknowledged critical alert{openCritical.length > 1 ? "s" : ""}
              </p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {openCritical[0].location} · {METRICS[openCritical[0].metric].label} · raised {relativeTime(openCritical[0].created_at)}
              </p>
            </div>
            {/* Only an Administrator may acknowledge a critical alert (A1 Table 1) */}
            {user.role === "Administrator" ? (
              <Button variant="secondary" size="sm" onClick={() => onAcknowledge(openCritical[0].alert_id)}>
                <Check size={14} />
                Acknowledge
              </Button>
            ) : (
              <span className="text-xs text-ink-secondary">Only an administrator can acknowledge</span>
            )}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {Object.values(METRICS).map((m) => {
            if (!readings) return <div key={m.key} className="skeleton h-[188px] rounded-xl" />;

            const value = readings[selected][m.key];
            const band = thresholds[selected][m.key];
            const status = evaluate(value, band);
            const points = trend.map((t) => t[m.key]);
            const delta = points.length > 1 ? value - points[0] : 0;

            return (
              <Card key={m.key} accent={m.accent}>
                <CardHeader>
                  <CardTitle>{m.label}</CardTitle>
                  <StatusBadge status={status} />
                </CardHeader>

                <CardContent className="pb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-metric" style={{ color: m.accent }}>{fmt(value, m.key)}</span>
                    <span className="text-base font-medium text-ink-secondary">{m.unit}</span>
                    {points.length > 1 && (
                      <span className="ml-auto text-xs text-ink-secondary">
                        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} this session
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <Sparkline points={points} color={m.accent} />
                  </div>
                </CardContent>

                <CardFooter>
                  <span>Normal {band.warn_min}–{band.warn_max}{m.unit}</span>
                  <span>{location?.name}</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
          <Card>
            <CardHeader className="pb-0">
              <div>
                <h2 className="text-section">Live readings</h2>
                <p className="mt-1 text-xs text-ink-secondary">This session, sampled every five seconds</p>
              </div>
              <Legend series={series} />
            </CardHeader>
            <CardContent>
              {trend.length < 2 ? (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3">
                  <div className="skeleton h-full w-full rounded-lg" />
                </div>
              ) : (
                <LineChart series={series} data={trend} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <h2 className="text-section">Air quality index</h2>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-6">
              {readings ? (
                <>
                  <Gauge
                    value={readings[selected].air_quality}
                    min={0}
                    max={150}
                    unit="AQI"
                    status={evaluate(readings[selected].air_quality, thresholds[selected].air_quality)}
                  />
                  <p className="mt-4 text-center text-xs leading-relaxed text-ink-secondary">
                    Values above {thresholds[selected].air_quality.warn_max} raise a warning;
                    above {thresholds[selected].air_quality.crit_max} raise a critical alert.
                  </p>
                </>
              ) : (
                <div className="skeleton h-[132px] w-[132px] rounded-full" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
