import { useState } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal, Pencil, Plus, Trash2, User } from 'lucide-react';
import { MethodBadge } from '../../components/MethodBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDate, formatINR } from '../../lib/format';
import type { ExpensePersonWithInstallments, Installment } from '../../lib/types';

interface ExpensePersonCardProps {
  person: ExpensePersonWithInstallments;
  onEdit: () => void;
  onDelete: () => void;
  onAddInstallment: () => void;
  onDeleteInstallment: (inst: Installment) => void;
}

export function ExpensePersonCard({ person, onEdit, onDelete, onAddInstallment, onDeleteInstallment }: ExpensePersonCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [instToDelete, setInstToDelete] = useState<Installment | null>(null);

  const contract = Number(person.agreed_total_contract);
  const paid = person.total_paid;
  const remaining = person.remaining;
  const pct = contract > 0 ? Math.min(100, (paid / contract) * 100) : 0;
  const overpaid = paid > contract + 0.01;

  return (
    <div className="card flex flex-col p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink-900">{person.name}</h3>
            <p className="mt-0.5 text-xs text-ink-400">{person.role}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            aria-label="Person actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-pop">
                <button onClick={() => { onEdit(); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => { onDelete(); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-700 hover:bg-danger-50">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini label="Contract" value={formatINR(contract)} />
        <Mini label="Paid" value={formatINR(paid)} tone="brand" />
        <Mini label="Owed" value={formatINR(remaining)} tone={remaining > 0 ? 'accent' : 'muted'} />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-500">Progress</span>
          <span className={`font-medium ${overpaid ? 'text-danger-600' : 'text-ink-700'}`}>
            {pct.toFixed(0)}%{overpaid ? ' · overpaid' : ''}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${overpaid ? 'bg-danger-500' : 'bg-brand-500'}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex items-center justify-between rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
      >
        <span>{person.installments.length} installment{person.installments.length === 1 ? '' : 's'}</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="animate-fade-in mt-2 space-y-2">
          {person.installments.length === 0 ? (
            <p className="rounded-lg bg-ink-50 px-3 py-3 text-center text-xs text-ink-500">
              No installments yet. Click below to log the first payment.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {person.installments.map((inst) => (
                <li key={inst.id} className="group flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold tabular-nums text-ink-900">{formatINR(Number(inst.amount_paid))}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-ink-400">{formatDate(inst.date)}</span>
                      <MethodBadge method={inst.payment_method} size="xs" />
                    </div>
                  </div>
                  <button
                    onClick={() => setInstToDelete(inst)}
                    className="rounded-md p-1 text-ink-300 opacity-0 transition-all hover:bg-danger-50 hover:text-danger-600 group-hover:opacity-100"
                    aria-label="Delete installment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={onAddInstallment} className="btn-secondary w-full">
            <Plus className="h-4 w-4" />
            Add installment
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!instToDelete}
        title="Delete installment?"
        message="This will remove this installment from the person's payment history. The contract total stays the same."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (instToDelete) onDeleteInstallment(instToDelete);
        }}
        onClose={() => setInstToDelete(null)}
      />
    </div>
  );
}

function Mini({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'brand' | 'accent' | 'muted' }) {
  const tones = {
    default: 'text-ink-900',
    brand: 'text-brand-700',
    accent: 'text-accent-700',
    muted: 'text-ink-400',
  };
  return (
    <div className="rounded-lg bg-ink-50 px-2 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  );
}
