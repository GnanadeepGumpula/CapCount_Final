import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { AmountInput } from '../../components/AmountInput';
import { MethodSelect } from '../../components/MethodSelect';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../lib/toast';
import { addFundingSource, updateFundingSource, type FundingInput } from '../../lib/api';
import { todayISO } from '../../lib/format';
import { PAYMENT_METHODS, type FundingSource, type PaymentMethod } from '../../lib/types';

interface FundingFormModalProps {
  open: boolean;
  projectId: string;
  editing?: FundingSource;
  onClose: () => void;
  onSaved: (fs: FundingSource, wasEdit: boolean) => void;
}

export function FundingFormModal({ open, projectId, editing, onClose, onSaved }: FundingFormModalProps) {
  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setSourceName(editing?.source_name ?? '');
      setAmount(editing ? String(editing.amount) : '');
      setMethod(editing?.payment_method ?? 'UPI');
      setDate(editing?.date ?? todayISO());
      setNotes(editing?.notes ?? '');
      setErrors({});
    }
  }, [open, editing]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!sourceName.trim()) next.sourceName = 'Source name is required.';
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt)) next.amount = 'Enter a valid amount.';
    else if (amt <= 0) next.amount = 'Amount must be greater than zero.';
    if (!date) next.date = 'Date is required.';
    if (!PAYMENT_METHODS.includes(method)) next.method = 'Select a payment method.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload: FundingInput = {
      source_name: sourceName.trim(),
      amount: Number(amount),
      payment_method: method,
      date,
      notes: notes.trim() || null,
    };
    try {
      if (editing) {
        await updateFundingSource(editing.id, payload);
        onSaved({ ...editing, ...payload, amount: Number(amount) }, true);
      } else {
        const fs = await addFundingSource(projectId, payload);
        onSaved(fs, false);
      }
      toast.success(editing ? 'Funding updated' : 'Funding added', `${payload.source_name} — ₹${Number(amount).toLocaleString('en-IN')}`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save funding source.';
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
      title={editing ? 'Edit funding source' : 'Add funding source'}
      description="Log an inflow — an investor, sponsor, advance, or any cash coming into the project."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving}>
            {saving && <Spinner />}
            {editing ? 'Save changes' : 'Add funding'}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Source name" htmlFor="fs-name" required info="The person or organization that sent the funds — e.g. 'Studio X', 'Investor Anil', 'Sponsor Y'."
          error={errors.sourceName}>
          <input
            id="fs-name"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className={`input ${errors.sourceName ? 'input-error' : ''}`}
            placeholder="e.g. Investor Anil"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="fs-amount" required info="The amount received in Indian Rupee. Use the Indian numbering system — e.g. 3,50,000."
            error={errors.amount}>
            <AmountInput id="fs-amount" value={amount} onChange={setAmount} error={!!errors.amount} />
          </Field>
          <Field label="Date" htmlFor="fs-date" required info="The date the funds were received." error={errors.date}>
            <input
              id="fs-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`input ${errors.date ? 'input-error' : ''}`}
            />
          </Field>
        </div>

        <Field label="Payment method" required info="How the funds were received. Used for analytics and audit trails.">
          <MethodSelect value={method} onChange={setMethod} />
        </Field>

        <Field label="Notes" htmlFor="fs-notes" info="Optional context — agreement reference, milestone, etc.">
          <textarea
            id="fs-notes"
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
