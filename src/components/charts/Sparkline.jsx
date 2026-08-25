/**
 * Compact trend line drawn inside a metric card.
 *
 * A single number tells the reader the present value but not the direction of
 * travel. The sparkline supplies that context without a second panel or a
 * second glance.
 */
export function Sparkline({ points, color, height = 36 }) {
  if (!points || points.length < 2) {
    return <div className="skeleton" style={{ height }} aria-hidden="true" />;
  }

  const W = 120;
  const H = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const x = (i) => (i / (points.length - 1)) * W;
  const y = (v) => H - 3 - ((v - min) / span) * (H - 6);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      aria-hidden="true"
    >
      <path d={area} fill={color} opacity="0.1" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}
