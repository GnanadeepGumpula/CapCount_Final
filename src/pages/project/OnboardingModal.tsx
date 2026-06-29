import { useState } from 'react';
import { Rocket } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { AmountInput } from '../../components/AmountInput';
import { MethodSelect } from '../../components/MethodSelect';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../lib/toast';
import { addFundingSource, type FundingInput } from '../../lib/api';
import { todayISO } from '../../lib/format';
import { PAYMENT_METHODS, type FundingSource, type PaymentMethod } from '../../lib/types';

interface OnboardingModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: (fs: FundingSource) => void;
  onSkip: () => void;
}

export function OnboardingModal({ open, projectId, onClose, onSaved, onSkip }: OnboardingModalProps) {
  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

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
      notes: null,
    };
    try {
      const fs = await addFundingSource(projectId, payload);
      onSaved(fs);
      toast.success('First funding logged', 'Your project ledger is now live.');
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
      title="Log your first funding source"
      description="Every project starts with capital coming in. Add your first inflow to unlock the ledger."
      footer={
        <>
          <button className="btn-ghost" onClick={onSkip} disabled={saving}>Skip for now</button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving}>
            {saving && <Spinner />}
            <Rocket className="h-4 w-4" />
            Start ledger
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Rocket className="h-5 w-5" />
          </div>
          <p className="text-sm text-brand-900">
            <span className="font-semibold">Welcome aboard.</span> Record the first amount that came into this project — an investor, sponsor, advance, or your own capital.
          </p>
        </div>

        <Field label="Source name" htmlFor="ob-name" required info="Who sent the funds? e.g. 'Investor Anil', 'Studio X', 'Self-funded'."
          error={errors.sourceName}>
          <input
            id="ob-name"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className={`input ${errors.sourceName ? 'input-error' : ''}`}
            placeholder="e.g. Investor Anil"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="ob-amount" required info="The amount received in Indian Rupee." error={errors.amount}>
            <AmountInput id="ob-amount" value={amount} onChange={setAmount} error={!!errors.amount} />
          </Field>
          <Field label="Date" htmlFor="ob-date" required info="The date the funds were received." error={errors.date}>
            <input
              id="ob-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`input ${errors.date ? 'input-error' : ''}`}
            />
          </Field>
        </div>

        <Field label="Payment method" required info="How the funds were received.">
          <MethodSelect value={method} onChange={setMethod} />
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
