import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-50">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-pop">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}
