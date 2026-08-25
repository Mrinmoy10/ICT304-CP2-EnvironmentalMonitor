/**
 * Radial gauge showing a value against its configured band.
 *
 * The arc is coloured by state rather than by metric, so a glance at the
 * shape answers "is this acceptable?" before the number is read at all.
 */
export function Gauge({ value, min, max, unit, status, size = 132 }) {
  const clamped = Math.min(max, Math.max(min, value));
  const fraction = (clamped - min) / (max - min || 1);

  const stroke = 10;
  const radius = (size - stroke) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  // 270-degree arc, opening downwards
  const START = 135;
  const SWEEP = 270;

  const point = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  const arc = (fromDeg, toDeg) => {
    const [x1, y1] = point(fromDeg);
    const [x2, y2] = point(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${radius},${radius} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };

  const tone = {
    good: "hsl(var(--state-good))",
    warning: "hsl(var(--state-warning))",
    critical: "hsl(var(--state-critical))",
  }[status];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
         aria-label={`${value.toFixed(0)} ${unit}, ${status === "good" ? "normal" : status}`}>
      <path d={arc(START, START + SWEEP)} fill="none" stroke="hsl(var(--line))" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d={arc(START, START + Math.max(SWEEP * fraction, 0.5))}
        fill="none"
        stroke={tone}
        strokeWidth={stroke}
        strokeLinecap="round"
        style={{ transition: "stroke 0.4s ease" }}
      />
      <text x={cx} y={cy + 2} textAnchor="middle" className="fill-ink-primary" style={{ fontSize: 26, fontWeight: 700 }}>
        {value.toFixed(0)}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" className="fill-ink-secondary" style={{ fontSize: 11 }}>
        {unit}
      </text>
    </svg>
  );
}
