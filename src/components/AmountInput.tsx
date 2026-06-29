import { formatINR } from '../lib/format';

interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  placeholder?: string;
  error?: boolean;
  ariaLabel?: string;
}

export function AmountInput({ value, onChange, id, placeholder, error, ariaLabel }: AmountInputProps) {
  const numeric = Number(value || 0);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">
        ₹
      </span>
      <input
        id={id}
        aria-label={ariaLabel ?? 'Amount in Indian Rupee'}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '0.00'}
        className={`input pl-7 pr-28 font-mono tabular-nums ${error ? 'input-error' : ''}`}
      />
      {numeric > 0 && (
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-ink-400 sm:block">
          {formatINR(numeric)}
        </span>
      )}
    </div>
  );
}
