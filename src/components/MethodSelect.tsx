import { PAYMENT_METHODS, type PaymentMethod } from '../lib/types';
import { MethodBadge } from './MethodBadge';

interface MethodSelectProps {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  name?: string;
}

export function MethodSelect({ value, onChange, name }: MethodSelectProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PAYMENT_METHODS.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
              active
                ? 'border-ink-900 bg-ink-900 text-white shadow-soft'
                : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50'
            }`}
            aria-pressed={active}
          >
            {m}
          </button>
        );
      })}
      <input type="hidden" name={name} value={value} />
      <span className="sr-only">
        Selected: <MethodBadge method={value} size="xs" />
      </span>
    </div>
  );
}
