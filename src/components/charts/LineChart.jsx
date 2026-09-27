import { useState } from "react";
import { clock } from "../../lib/data.js";

/**
 * Multi-series line chart with a hover readout.
 *
 * Drawn by hand rather than pulled from a charting library so the axes,
 * series colours and interaction all follow the Assessment 1 design system,
 * and so the production bundle carries no charting dependency.
 */
export function LineChart({
  series,
  data,
  xKey = "recorded_at",
  height = 300,
  viewWidth = 1000,        // narrower for charts that sit in a one-third column
  maxLabels = 7,           // time labels along the x-axis
  formatTime = clock,
  bands = [],              // reference lines, e.g. the normal band [{ value, label }]
  unit = "",
}) {
  const [hover, setHover] = useState(null);

  if (!data || data.length < 2) return <div className="skeleton" style={{ height }} />;

  const W = viewWidth;
  const H = height;
  const pad = { top: 20, right: 20, bottom: 34, left: 48 };

  const keys = series.map((s) => s.key);
  let min = Infinity;
  let max = -Infinity;
  data.forEach((d) => keys.forEach((k) => {
    min = Math.min(min, d[k]);
    max = Math.max(max, d[k]);
  }));
  // Reference lines are included in the scale so the band is always visible
  // and the reader can see how far the reading sits from it.
  bands.forEach((b) => { min = Math.min(min, b.value); max = Math.max(max, b.value); });
  const span = max - min || 1;
  const nonNegative = min >= 0;
  min -= span * 0.15;
  max += span * 0.15;
  // Humidity and AQI cannot be negative, so padding never pushes the axis below zero.
  if (nonNegative) min = Math.max(0, min);

  const px = (i) => pad.left + (i / (data.length - 1)) * (W - pad.left - pad.right);
  const py = (v) => pad.top + (1 - (v - min) / (max - min)) * (H - pad.top - pad.bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));
  const labelEvery = Math.ceil(data.length / maxLabels);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * W - pad.left) / (W - pad.left - pad.right) * (data.length - 1);
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(index))));
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        style={{ height: "auto", aspectRatio: `${W} / ${H}` }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`${series.map((s) => s.label).join(", ")} over time`}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={py(t)} y2={py(t)}
                  stroke="hsl(var(--line))" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "3 5"} />
            <text x={pad.left - 10} y={py(t) + 4} textAnchor="end" fontSize="11" fill="hsl(var(--ink-secondary))">
              {t.toFixed(0)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={px(i)} y={H - 10} fontSize="11" fill="hsl(var(--ink-secondary))"
                  textAnchor={i === 0 ? "start" : i >= data.length - labelEvery ? "end" : "middle"}>
              {formatTime(d[xKey])}
            </text>
          ) : null
        )}

        {bands.map((b) => (
          <g key={b.label}>
            <line x1={pad.left} x2={W - pad.right} y1={py(b.value)} y2={py(b.value)}
                  stroke="hsl(var(--state-good))" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="6 4" />
            <text x={W - pad.right} y={py(b.value) - 5} textAnchor="end" fontSize="10" fill="hsl(var(--state-good))">
              {b.label}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(d[s.key]).toFixed(1)}`).join(" ");
          return (
            <g key={s.key}>
              <path d={`${line} L${px(data.length - 1)},${H - pad.bottom} L${px(0)},${H - pad.bottom} Z`}
                    fill={s.color} opacity="0.06" />
              <path d={line} fill="none" stroke={s.color} strokeWidth="2.25"
                    strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <circle cx={px(data.length - 1)} cy={py(data[data.length - 1][s.key])} r="3.5" fill={s.color} />
            </g>
          );
        })}

        {hover !== null && (
          <g>
            <line x1={px(hover)} x2={px(hover)} y1={pad.top} y2={H - pad.bottom}
                  stroke="hsl(var(--ink-secondary))" strokeWidth="1" strokeDasharray="3 3" />
            {series.map((s) => (
              <circle key={s.key} cx={px(hover)} cy={py(data[hover][s.key])} r="4"
                      fill="hsl(var(--surface-card))" stroke={s.color} strokeWidth="2.5" />
            ))}
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-line bg-surface-raised px-3 py-2 shadow-xl"
          style={{
            left: `${(px(hover) / W) * 100}%`,
            transform: px(hover) > W / 2 ? "translateX(-108%)" : "translateX(8%)",
          }}
        >
          <p className="mb-1.5 text-[11px] font-medium text-ink-secondary">{formatTime(data[hover][xKey])}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2 text-xs text-ink-primary">
              <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              {s.label}
              <span className="ml-auto font-semibold">{data[hover][s.key].toFixed(1)}{unit}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
