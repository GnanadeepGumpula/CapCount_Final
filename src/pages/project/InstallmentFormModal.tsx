import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { AmountInput } from '../../components/AmountInput';
import { MethodSelect } from '../../components/MethodSelect';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../lib/toast';
import { addInstallment, type InstallmentInput } from '../../lib/api';
import { formatINR, todayISO } from '../../lib/format';
import { PAYMENT_METHODS, type ExpensePersonWithInstallments, type Installment, type PaymentMethod } from '../../lib/types';

interface InstallmentFormModalProps {
  open: boolean;
  person: ExpensePersonWithInstallments | null;
  projectId: string;
  remainingBalance: number;
  onClose: () => void;
  onSaved: (inst: Installment) => void;
}

export function InstallmentFormModal({ open, person, projectId, remainingBalance, onClose, onSaved }: InstallmentFormModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState(todayISO());
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('UPI');
      setDate(todayISO());
      setProofUrl('');
      setNotes('');
      setErrors({});
    }
  }, [open]);

  if (!person) return null;

  const remainingOwed = Math.max(0, Number(person.agreed_total_contract) - person.total_paid);

  function validate(): boolean {
    const next: Record<string, string> = {};
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt)) next.amount = 'Enter a valid amount.';
    else if (amt <= 0) next.amount = 'Amount must be greater than zero.';
    if (!date) next.date = 'Date is required.';
    if (!PAYMENT_METHODS.includes(method)) next.method = 'Select a payment method.';
    if (proofUrl && !/^https?:\/\//i.test(proofUrl)) next.proofUrl = 'Enter a valid URL (https://…).';

    if (amt > remainingOwed + 0.0001) {
      next.amount = `This installment (₹${amt.toLocaleString('en-IN')}) exceeds the remaining owed to ${person!.name} (₹${remainingOwed.toLocaleString('en-IN')}).`;
    } else if (amt > remainingBalance + 0.0001) {
      next.amount = `Insufficient funds. The project's remaining balance is ₹${remainingBalance.toLocaleString('en-IN')}.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload: InstallmentInput = {
      amount_paid: Number(amount),
      date,
      payment_method: method,
      proof_url: proofUrl.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      const inst = await addInstallment(person!.id, projectId, payload);
      onSaved(inst);
      toast.success('Installment added', `${formatINR(Number(amount))} to ${person!.name}`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save installment.';
      setErrors({ form: msg });
      toast.error('Save failed', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pay ${person.name}`}
      description={`Installment for ${person.role} · Contract ${formatINR(Number(person.agreed_total_contract))}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving}>
            {saving && <Spinner />}
            Add installment
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-3 rounded-xl bg-ink-50 p-3.5 text-sm">
          <Row label="Contract" value={formatINR(Number(person.agreed_total_contract))} />
          <Row label="Paid so far" value={formatINR(person.total_paid)} />
          <Row label="Remaining owed" value={formatINR(remainingOwed)} strong />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Installment amount" htmlFor="in-amount" required
            info="The amount being paid in this milestone. Blocked if it exceeds the remaining owed or the project's remaining balance."
            error={errors.amount}>
            <AmountInput id="in-amount" value={amount} onChange={setAmount} error={!!errors.amount} />
          </Field>
          <Field label="Date" htmlFor="in-date" required info="The date the installment was paid." error={errors.date}>
            <input
              id="in-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`input ${errors.date ? 'input-error' : ''}`}
            />
          </Field>
        </div>

        <Field label="Payment method" required info="How this installment was paid.">
          <MethodSelect value={method} onChange={setMethod} />
        </Field>

        <Field label="Receipt URL" htmlFor="in-proof" info="Optional link to a payment receipt or transfer proof (https://…)." error={errors.proofUrl}>
          <input
            id="in-proof"
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            className={`input ${errors.proofUrl ? 'input-error' : ''}`}
            placeholder="https://…"
          />
        </Field>

        <Field label="Notes" htmlFor="in-notes" info="Optional context — milestone description, etc.">
          <textarea
            id="in-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[72px] resize-y"
            placeholder="Optional"
          />
        </Field>

        {errors.form && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
            {errors.form}
          </div>
        )}
      </form>
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>{value}</span>
    </div>
  );
}
