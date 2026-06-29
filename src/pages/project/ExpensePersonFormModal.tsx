import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { AmountInput } from '../../components/AmountInput';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../lib/toast';
import { addExpensePerson, addInstallment, updateExpensePerson, type ExpensePersonInput, type InstallmentInput } from '../../lib/api';
import { todayISO } from '../../lib/format';
import type { ExpensePerson, Installment } from '../../lib/types';

interface ExpensePersonFormModalProps {
  open: boolean;
  projectId: string;
  editing?: ExpensePerson;
  onClose: () => void;
  onSaved: (p: ExpensePerson, wasEdit: boolean, initialPaid?: number, initialInstallment?: Installment) => void;
}

export function ExpensePersonFormModal({ open, projectId, editing, onClose, onSaved }: ExpensePersonFormModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [contract, setContract] = useState('');
  const [initialPaid, setInitialPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setRole(editing?.role ?? '');
      setContract(editing ? String(editing.agreed_total_contract) : '');
      setInitialPaid('');
      setNotes(editing?.notes ?? '');
      setErrors({});
    }
  }, [open, editing]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required.';
    if (!role.trim()) next.role = 'Role is required.';
    const amt = Number(contract);
    const paid = Number(initialPaid);
    if (!contract || Number.isNaN(amt)) next.contract = 'Enter a valid contract amount.';
    else if (amt < 0) next.contract = 'Contract amount cannot be negative.';
    if (initialPaid && Number.isNaN(paid)) next.initialPaid = 'Enter a valid paid amount.';
    else if (paid < 0) next.initialPaid = 'Paid amount cannot be negative.';
    else if (initialPaid && paid > amt + 0.0001) next.initialPaid = 'Paid amount cannot exceed the contract amount.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload: ExpensePersonInput = {
      name: name.trim(),
      role: role.trim(),
      agreed_total_contract: Number(contract),
      notes: notes.trim() || null,
    };
    try {
      if (editing) {
        await updateExpensePerson(editing.id, payload);
        onSaved({ ...editing, ...payload, agreed_total_contract: Number(contract) }, true);
      } else {
        const p = await addExpensePerson(projectId, payload);
        let initialInstallment: Installment | undefined;
        if (Number(initialPaid) > 0) {
          const installmentPayload: InstallmentInput = {
            amount_paid: Number(initialPaid),
            date: todayISO(),
            payment_method: 'Cash',
            proof_url: null,
            notes: 'Initial payment recorded while adding person.',
          };
          initialInstallment = await addInstallment(p.id, projectId, installmentPayload);
        }
        onSaved(p, false, Number(initialPaid) || 0, initialInstallment);
      }
      toast.success(editing ? 'Person updated' : 'Person added', `${payload.name} — ${payload.role}`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save person.';
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
      title={editing ? 'Edit person' : 'Add person'}
      description="Add talent or crew with a contracted total. You can log milestone installments against this contract."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving}>
            {saving && <Spinner />}
            {editing ? 'Save changes' : 'Add person'}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="ep-name" required info="The person's full name — e.g. 'Raj Kumar', 'Priya Sharma'." error={errors.name}>
            <input
              id="ep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="e.g. Raj Kumar"
              autoFocus
            />
          </Field>
          <Field label="Role" htmlFor="ep-role" required info="Their role on the production — e.g. 'Hero', 'Director', 'Cinematographer', 'Makeup Artist'." error={errors.role}>
            <input
              id="ep-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`input ${errors.role ? 'input-error' : ''}`}
              placeholder="e.g. Director"
            />
          </Field>
        </div>

        <Field label="Agreed total contract" htmlFor="ep-contract" required
          info="The full amount agreed with this person for the entire engagement. Installments are tracked against this total. The remaining owed is calculated automatically."
          error={errors.contract}>
          <AmountInput id="ep-contract" value={contract} onChange={setContract} error={!!errors.contract} />
        </Field>

        <Field label="Paid so far" htmlFor="ep-paid" info="Optional amount already paid to this person. This is added as an initial installment and updates the paid total immediately." error={errors.initialPaid}>
          <AmountInput id="ep-paid" value={initialPaid} onChange={setInitialPaid} error={!!errors.initialPaid} />
        </Field>

        <Field label="Notes" htmlFor="ep-notes" info="Optional context — contract reference, agent contact, etc.">
          <textarea
            id="ep-notes"
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
