interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}

export function DonutChart({ slices, centerLabel, centerValue, size = 200 }: DonutChartProps) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = size / 2 - 12;
  const inner = radius * 0.62;
  const cx = size / 2;
  const cy = size / 2;

  let angle = -Math.PI / 2;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = total > 0 ? s.value / total : 0;
      const start = angle;
      const end = angle + frac * Math.PI * 2;
      angle = end;
      const large = end - start > Math.PI ? 1 : 0;
      const x1 = cx + radius * Math.cos(start);
      const y1 = cy + radius * Math.sin(start);
      const x2 = cx + radius * Math.cos(end);
      const y2 = cy + radius * Math.sin(end);
      const ix1 = cx + inner * Math.cos(end);
      const iy1 = cy + inner * Math.sin(end);
      const ix2 = cx + inner * Math.cos(start);
      const iy2 = cy + inner * Math.sin(start);
      const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${inner} ${inner} 0 ${large} 0 ${ix2} ${iy2} Z`;
      return { d, color: s.color, label: s.label, value: s.value, frac };
    });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Expenditure breakdown donut chart">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#eceef2" strokeWidth={radius - inner} />
          ) : (
            arcs.map((a, i) => (
              <path key={i} d={a.d} fill={a.color} stroke="#fff" strokeWidth={2}>
                <title>{`${a.label}: ${(a.frac * 100).toFixed(1)}%`}</title>
              </path>
            ))
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{centerLabel}</p>
          <p className="mt-0.5 font-display text-lg font-bold text-ink-900">{centerValue}</p>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {slices.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
                <span className="text-sm text-ink-700">{s.label}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold tabular-nums text-ink-900">{formatCompact(s.value)}</span>
                <span className="ml-2 text-xs text-ink-400">{pct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
        {total === 0 && <p className="text-sm text-ink-400">No data to display yet.</p>}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}
