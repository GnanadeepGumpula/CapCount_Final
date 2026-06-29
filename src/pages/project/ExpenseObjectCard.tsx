import { Calendar, ExternalLink, MoreHorizontal, Pencil, Receipt, Trash2 } from 'lucide-react';
import { MethodBadge } from '../../components/MethodBadge';
import { formatDate, formatINR } from '../../lib/format';
import type { ExpenseObject } from '../../lib/types';

interface ExpenseObjectCardProps {
  item: ExpenseObject;
  onEdit: () => void;
  onDelete: () => void;
}

export function ExpenseObjectCard({ item, onEdit, onDelete }: ExpenseObjectCardProps) {
  return (
    <div className="card group flex flex-col p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
            <Receipt className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink-900">{item.item_name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
              <Calendar className="h-3 w-3" />
              {formatDate(item.date)}
            </p>
          </div>
        </div>
        <CardMenu onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="mt-3 flex items-end justify-between">
        <p className="font-display text-xl font-bold tabular-nums text-ink-900">{formatINR(Number(item.amount))}</p>
        <MethodBadge method={item.payment_method} />
      </div>

      {item.notes && <p className="mt-2 line-clamp-2 text-xs text-ink-500">{item.notes}</p>}

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Object</span>
        {item.proof_url ? (
          <a
            href={item.proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            <ExternalLink className="h-3 w-3" />
            View receipt
          </a>
        ) : (
          <span className="text-xs text-ink-300">No receipt</span>
        )}
      </div>
    </div>
  );
}

function CardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          const el = e.currentTarget.nextElementSibling as HTMLElement | null;
          el?.classList.toggle('hidden');
        }}
        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        aria-label="Card actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <div
        className="hidden absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onEdit} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
          <Pencil className="h-4 w-4" /> Edit
        </button>
        <button onClick={onDelete} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-700 hover:bg-danger-50">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  );
}
