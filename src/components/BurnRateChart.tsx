import { useMemo, useState } from 'react';
import { formatINRCompact, formatDate } from '../lib/format';

interface TimelinePoint {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

interface BurnRateChartProps {
  points: TimelinePoint[];
  totalInflow: number;
}

export function BurnRateChart({ points, totalInflow }: BurnRateChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const w = 760;
  const h = 280;
  const padL = 56;
  const padR = 20;
  const padT = 20;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const { maxY, xScale, yScale, pathBalance, pathInflow, pathOutflow, areaBalance } = useMemo(() => {
    if (points.length === 0) {
      return {
        maxY: 1,
        xScale: (_: number) => 0,
        yScale: (_: number) => 0,
        pathBalance: '',
        pathInflow: '',
        pathOutflow: '',
        areaBalance: '',
      };
    }
    const xs = points.map((p) => new Date(p.date).getTime());
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const span = maxX - minX || 1;
    const maxY = Math.max(totalInflow, ...points.map((p) => p.balance), ...points.map((p) => p.inflow)) * 1.1 || 1;

    const xScale = (t: number) => padL + ((t - minX) / span) * innerW;
    const yScale = (v: number) => padT + innerH - (v / maxY) * innerH;

    const line = (key: 'balance' | 'inflow' | 'outflow') =>
      points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(new Date(p.date).getTime()).toFixed(1)} ${yScale(p[key]).toFixed(1)}`)
        .join(' ');

    const pathBalance = line('balance');
    const pathInflow = line('inflow');
    const pathOutflow = line('outflow');
    const lastX = xScale(new Date(points[points.length - 1].date).getTime());
    const firstX = xScale(new Date(points[0].date).getTime());
    const baseY = padT + innerH;
    const areaBalance = `${pathBalance} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;

    return { maxY, xScale, yScale, pathBalance, pathInflow, pathOutflow, areaBalance };
  }, [points, totalInflow, innerW, innerH]);

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/50 text-sm text-ink-400">
        No timeline data yet. Add funding and expenses to see the burn rate.
      </div>
    );
  }

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (maxY / ticks) * i);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[640px] w-full" role="img" aria-label="Burn rate timeline chart">
        <defs>
          <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1fa15f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1fa15f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {tickVals.map((tv, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={w - padR}
              y1={padT + innerH - (tv / maxY) * innerH}
              y2={padT + innerH - (tv / maxY) * innerH}
              stroke="#eceef2"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={padT + innerH - (tv / maxY) * innerH + 4}
              textAnchor="end"
              className="fill-ink-400"
              fontSize={10}
            >
              {formatINRCompact(tv)}
            </text>
          </g>
        ))}

        <path d={areaBalance} fill="url(#burnGrad)" />
        <path d={pathInflow} fill="none" stroke="#46bd7d" strokeWidth={2} strokeDasharray="4 4" opacity={0.7} />
        <path d={pathOutflow} fill="none" stroke="#f97316" strokeWidth={2} strokeDasharray="4 4" opacity={0.7} />
        <path d={pathBalance} fill="none" stroke="#1fa15f" strokeWidth={2.5} />

        {points.map((p, i) => {
          const x = xScale(new Date(p.date).getTime());
          const y = yScale(p.balance);
          const isHover = hover === i;
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={isHover ? 5 : 3}
                fill="#1fa15f"
                stroke="#fff"
                strokeWidth={1.5}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {isHover && (
                <g>
                  <line x1={x} x2={x} y1={padT} y2={padT + innerH} stroke="#1fa15f" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
                </g>
              )}
            </g>
          );
        })}

        {points.length <= 8 &&
          points.map((p, i) => {
            const x = xScale(new Date(p.date).getTime());
            return (
              <text
                key={`xl-${i}`}
                x={x}
                y={h - 12}
                textAnchor="middle"
                className="fill-ink-400"
                fontSize={10}
              >
                {formatDate(p.date)}
              </text>
            );
          })}
      </svg>

      {hover !== null && points[hover] && (
        <div className="pointer-events-none absolute top-2 right-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-pop">
          <p className="font-semibold text-ink-900">{formatDate(points[hover].date)}</p>
          <p className="mt-1 text-ink-600">Balance: <span className="font-mono font-semibold text-brand-700">{formatINRCompact(points[hover].balance)}</span></p>
          <p className="text-ink-600">Inflow: <span className="font-mono text-brand-600">{formatINRCompact(points[hover].inflow)}</span></p>
          <p className="text-ink-600">Outflow: <span className="font-mono text-accent-600">{formatINRCompact(points[hover].outflow)}</span></p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-500">
        <Legend color="#1fa15f" label="Remaining balance" />
        <Legend color="#46bd7d" label="Cumulative inflow" dashed />
        <Legend color="#f97316" label="Cumulative outflow" dashed />
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-4 rounded-sm"
        style={dashed ? { background: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)` } : { background: color }}
      />
      {label}
    </span>
  );
}
