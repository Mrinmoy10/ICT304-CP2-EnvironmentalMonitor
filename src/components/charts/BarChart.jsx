/** Grouped bar chart comparing the same metrics across locations. */
export function BarChart({ rows, series, height = 300 }) {
  const W = 1000;
  const H = height;
  const pad = { top: 20, right: 20, bottom: 44, left: 48 };

  const max = Math.max(...rows.flatMap((r) => series.map((s) => r[s.key]))) * 1.18 || 1;
  const groupW = (W - pad.left - pad.right) / rows.length;
  const barW = Math.min(42, (groupW - 28) / series.length);
  const py = (v) => pad.top + (1 - v / max) * (H - pad.top - pad.bottom);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img"
         aria-label="Metric comparison across monitored locations">
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1={pad.left} x2={W - pad.right} y1={py(max * f)} y2={py(max * f)}
                stroke="hsl(var(--line))" strokeDasharray={i === 0 ? "0" : "3 5"} />
          <text x={pad.left - 10} y={py(max * f) + 4} textAnchor="end" fontSize="11" fill="hsl(var(--ink-secondary))">
            {(max * f).toFixed(0)}
          </text>
        </g>
      ))}

      {rows.map((r, ri) => {
        const gx = pad.left + ri * groupW;
        const total = series.length * barW + (series.length - 1) * 8;
        const start = gx + (groupW - total) / 2;

        return (
          <g key={r.name}>
            {series.map((s, si) => {
              const x = start + si * (barW + 8);
              const y = py(r[s.key]);
              return (
                <rect key={s.key} x={x} y={y} width={barW} height={Math.max(H - pad.bottom - y, 2)}
                      rx="4" fill={s.color} opacity="0.9">
                  <title>{`${r.name} — ${s.label}: ${r[s.key].toFixed(1)}`}</title>
                </rect>
              );
            })}
            <text x={gx + groupW / 2} y={H - 16} textAnchor="middle" fontSize="12" fill="hsl(var(--ink-secondary))">
              {r.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
