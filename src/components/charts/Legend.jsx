export function Legend({ series }) {
  return (
    <div className="flex flex-wrap gap-4">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-2 text-xs text-ink-secondary">
          <span className="h-[3px] w-3 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
