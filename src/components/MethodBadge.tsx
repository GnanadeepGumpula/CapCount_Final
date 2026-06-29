import { Banknote, CreditCard, Landmark, Smartphone, HelpCircle } from 'lucide-react';
import type { PaymentMethod } from '../lib/types';

const config: Record<PaymentMethod, { icon: typeof Smartphone; bg: string; fg: string; label: string }> = {
  UPI: { icon: Smartphone, bg: 'bg-brand-50', fg: 'text-brand-700', label: 'UPI' },
  Bank: { icon: Landmark, bg: 'bg-ink-100', fg: 'text-ink-700', label: 'Bank' },
  Check: { icon: CreditCard, bg: 'bg-accent-50', fg: 'text-accent-700', label: 'Check' },
  PhonePe: { icon: Smartphone, bg: 'bg-brand-50', fg: 'text-brand-700', label: 'PhonePe' },
  GPay: { icon: Smartphone, bg: 'bg-ink-100', fg: 'text-ink-700', label: 'GPay' },
  Cash: { icon: Banknote, bg: 'bg-success-50', fg: 'text-success-700', label: 'Cash' },
  Other: { icon: HelpCircle, bg: 'bg-ink-100', fg: 'text-ink-600', label: 'Other' },
};

export function MethodBadge({ method, size = 'sm' }: { method: PaymentMethod; size?: 'sm' | 'xs' }) {
  const c = config[method];
  const Icon = c.icon;
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-medium ${c.bg} ${c.fg} ${pad}`}>
      <Icon className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {c.label}
    </span>
  );
}

export function MethodIcon({ method }: { method: PaymentMethod }) {
  const c = config[method];
  const Icon = c.icon;
  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} ${c.fg}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
