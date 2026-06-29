import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { AmountInput } from '../../components/AmountInput';
import { MethodSelect } from '../../components/MethodSelect';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../lib/toast';
import { addExpenseObject, updateExpenseObject, type ExpenseObjectInput } from '../../lib/api';
import { todayISO } from '../../lib/format';
import { PAYMENT_METHODS, type ExpenseObject, type PaymentMethod } from '../../lib/types';

interface ExpenseObjectFormModalProps {
  open: boolean;
  projectId: string;
  remainingBalance: number;
  editing?: ExpenseObject;
  onClose: () => void;
  onSaved: (eo: ExpenseObject, wasEdit: boolean) => void;
}

export function ExpenseObjectFormModal({
  open,
  projectId,
  remainingBalance,
  editing,
  onClose,
  onSaved,
}: ExpenseObjectFormModalProps) {
  const [itemName, setItemName] = useState('');
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
      setItemName(editing?.item_name ?? '');
      setAmount(editing ? String(editing.amount) : '');
      setMethod(editing?.payment_method ?? 'UPI');
      setDate(editing?.date ?? todayISO());
      setProofUrl(editing?.proof_url ?? '');
      setNotes(editing?.notes ?? '');
      setErrors({});
    }
  }, [open, editing]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!itemName.trim()) next.itemName = 'Item name is required.';
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt)) next.amount = 'Enter a valid amount.';
    else if (amt <= 0) next.amount = 'Amount must be greater than zero.';
    if (!date) next.date = 'Date is required.';
    if (!PAYMENT_METHODS.includes(method)) next.method = 'Select a payment method.';
    if (proofUrl && !/^https?:\/\//i.test(proofUrl)) next.proofUrl = 'Enter a valid URL (https://…).';

    if (editing) {
      const prevAmt = Number(editing.amount);
      const delta = amt - prevAmt;
      if (delta > remainingBalance + 0.0001) {
        next.amount = `Insufficient funds. Adding ₹${delta.toLocaleString('en-IN')} exceeds the remaining balance of ₹${remainingBalance.toLocaleString('en-IN')}.`;
      }
    } else if (amt > remainingBalance + 0.0001) {
      next.amount = `Insufficient funds. This expense exceeds the remaining balance of ₹${remainingBalance.toLocaleString('en-IN')}.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload: ExpenseObjectInput = {
      item_name: itemName.trim(),
      amount: Number(amount),
      payment_method: method,
      date,
      proof_url: proofUrl.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (editing) {
        await updateExpenseObject(editing.id, payload);
        onSaved({ ...editing, ...payload, amount: Number(amount) }, true);
      } else {
        const eo = await addExpenseObject(projectId, payload);
        onSaved(eo, false);
      }
      toast.success(editing ? 'Expense updated' : 'Expense added', `${payload.item_name}`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save expense.';
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
      title={editing ? 'Edit expense' : 'Add expense object'}
      description="Log a physical good or asset — equipment, props, catering, location hire, etc."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving}>
            {saving && <Spinner />}
            {editing ? 'Save changes' : 'Add expense'}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Item name" htmlFor="eo-name" required info="What was purchased — e.g. 'Camera lens kit', 'Catering — Day 3', 'Props — period furniture'."
          error={errors.itemName}>
          <input
            id="eo-name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className={`input ${errors.itemName ? 'input-error' : ''}`}
            placeholder="e.g. Camera lens kit"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="eo-amount" required
            info="Cost in Indian Rupee. The expense is blocked if it exceeds the project's remaining balance."
            error={errors.amount}>
            <AmountInput id="eo-amount" value={amount} onChange={setAmount} error={!!errors.amount} />
          </Field>
          <Field label="Date" htmlFor="eo-date" required info="The date the expense was paid." error={errors.date}>
            <input
              id="eo-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`input ${errors.date ? 'input-error' : ''}`}
            />
          </Field>
        </div>

        <Field label="Payment method" required info="How the expense was paid. Used for analytics and audit trails.">
          <MethodSelect value={method} onChange={setMethod} />
        </Field>

        <Field label="Receipt URL" htmlFor="eo-proof" info="Optional link to a receipt or invoice image (https://…). Shown as a 'View receipt' link on the card."
          error={errors.proofUrl}>
          <input
            id="eo-proof"
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            className={`input ${errors.proofUrl ? 'input-error' : ''}`}
            placeholder="https://…"
          />
        </Field>

        <Field label="Notes" htmlFor="eo-notes" info="Optional context — vendor, invoice number, etc.">
          <textarea
            id="eo-notes"
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
