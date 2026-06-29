import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  push: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...t, id }]);
      window.setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const api = {
    push,
    success: (title: string, message?: string) => push({ kind: 'success', title, message }),
    error: (title: string, message?: string) => push({ kind: 'error', title, message }),
    warning: (title: string, message?: string) => push({ kind: 'warning', title, message }),
    info: (title: string, message?: string) => push({ kind: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2.5">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: { icon: CheckCircle2, ring: 'border-success-200', bg: 'bg-success-50', iconColor: 'text-success-600', title: 'text-success-900' },
    error: { icon: XCircle, ring: 'border-danger-200', bg: 'bg-danger-50', iconColor: 'text-danger-600', title: 'text-danger-900' },
    warning: { icon: AlertTriangle, ring: 'border-warning-200', bg: 'bg-warning-50', iconColor: 'text-warning-600', title: 'text-warning-900' },
    info: { icon: Info, ring: 'border-ink-200', bg: 'bg-white', iconColor: 'text-ink-600', title: 'text-ink-900' },
  }[toast.kind];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl2 border ${config.ring} ${config.bg} p-3.5 shadow-pop`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${config.title}`}>{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-sm text-ink-600 break-words">{toast.message}</p>}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
