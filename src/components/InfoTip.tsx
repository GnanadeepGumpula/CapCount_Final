import { useId, useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTipProps {
  text: string;
  label?: string;
}

export function InfoTip({ text, label }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label ?? 'More information'}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="animate-fade-in absolute left-1/2 top-full z-50 mt-2 w-60 -translate-x-1/2 rounded-xl bg-ink-900 px-3 py-2 text-xs leading-relaxed text-white shadow-pop"
        >
          {text}
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink-900" />
        </span>
      )}
    </span>
  );
}
