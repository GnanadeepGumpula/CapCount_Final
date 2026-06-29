import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import { InfoTip } from './InfoTip';
import { formatINR } from '../lib/format';

interface StatCardProps {
  label: string;
  value: number;
  kind: 'inflow' | 'outflow' | 'balance';
  info: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, kind, info, icon }: StatCardProps) {
  const styles = {
    inflow: {
      ring: 'ring-brand-100',
      iconBg: 'bg-brand-50 text-brand-700',
      valueColor: 'text-brand-700',
      glow: 'from-brand-100/60',
      Icon: ArrowUpRight,
    },
    outflow: {
      ring: 'ring-accent-100',
      iconBg: 'bg-accent-50 text-accent-700',
      valueColor: 'text-accent-700',
      glow: 'from-accent-100/60',
      Icon: ArrowDownRight,
    },
    balance: {
      ring: value < 0 ? 'ring-danger-100' : 'ring-ink-100',
      iconBg: value < 0 ? 'bg-danger-50 text-danger-700' : 'bg-ink-900 text-white',
      valueColor: value < 0 ? 'text-danger-700' : 'text-ink-900',
      glow: value < 0 ? 'from-danger-100/60' : 'from-ink-100/60',
      Icon: Scale,
    },
  }[kind];

  const IconCmp = icon ? null : styles.Icon;

  return (
    <div className={`stat-card ring-1 ${styles.ring}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${styles.glow} to-transparent blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-ink-500">{label}</p>
            <InfoTip text={info} />
          </div>
          <p className={`mt-2 font-display text-2xl font-bold tabular-nums ${styles.valueColor} sm:text-[1.75rem]`}>
            {formatINR(value)}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.iconBg}`}>
          {icon ?? (IconCmp && <IconCmp className="h-5 w-5" />)}
        </div>
      </div>
    </div>
  );
}
