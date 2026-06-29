import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, UserRound } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { setStoredUserRole, getStoredUserRole } from '../../lib/projectAccess';
import { addProjectAccessEntry, deleteProjectAccessEntry, fetchProjectAccess } from '../../lib/api';
import type { ProjectAccessEntry } from '../../lib/types';

interface ProjectAccessModalProps {
  open: boolean;
  projectId: string;
  projectTitle: string;
  onClose: () => void;
}

export function ProjectAccessModal({ open, projectId, projectTitle, onClose }: ProjectAccessModalProps) {
  const [entries, setEntries] = useState<ProjectAccessEntry[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [access, setAccess] = useState<'View' | 'Edit' | 'Admin'>('View');
  const [managerRole, setManagerRole] = useState(getStoredUserRole());
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntries() {
      setLoadingEntries(true);
      setError(null);
      try {
        const next = await fetchProjectAccess(projectId);
        setEntries(next);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not load shared access entries.';
        setError(msg);
      } finally {
        setLoadingEntries(false);
      }
    }

    if (open) {
      loadEntries();
      setManagerRole(getStoredUserRole());
    }
  }, [open, projectId]);

  const isLeader = useMemo(() => /leader/i.test(managerRole), [managerRole]);

  async function addEntry() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedRole = role.trim();
    if (!trimmedName || !trimmedEmail || !trimmedRole) return;
    try {
      const entry = await addProjectAccessEntry(projectId, {
        name: trimmedName,
        email: trimmedEmail,
        role: trimmedRole,
        access,
      });
      setEntries((cur) => [entry, ...cur]);
      setName('');
      setEmail('');
      setRole('');
      setAccess('View');
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add access entry.';
      setError(msg);
    }
  }

  async function removeEntry(id: string) {
    try {
      await deleteProjectAccessEntry(id);
      setEntries((cur) => cur.filter((entry) => entry.id !== id));
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove access entry.';
      setError(msg);
    }
  }

  function saveManagerRole() {
    setStoredUserRole(managerRole.trim() || 'Production Leader');
  }

  return (
    <Modal open={open} onClose={onClose} title="Project settings" description={`Manage access for ${projectTitle}`} size="lg">
      <div className="space-y-6">
        <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <Field label="Your position" htmlFor="mgr-role" info="This controls the label shown in the header and access controls for this workspace.">
              <input id="mgr-role" value={managerRole} onChange={(e) => setManagerRole(e.target.value)} className="input" placeholder="Production Leader" />
            </Field>
            <button className="btn-secondary" onClick={saveManagerRole}>Save role</button>
          </div>
          <p className="mt-3 text-sm text-ink-500">{isLeader ? 'Production leader controls are active for this workspace.' : 'Only a production leader can manage shared access.'}</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-ink-900">Shared access</h3>
              <p className="text-sm text-ink-500">Grant view, edit, or admin rights to teammates.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.3fr,1fr,0.7fr,auto]">
            <Field label="Name" htmlFor="access-name">
              <input id="access-name" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Nikhil" disabled={!isLeader} />
            </Field>
            <Field label="Email" htmlFor="access-email">
              <input id="access-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="name@email.com" disabled={!isLeader} />
            </Field>
            <Field label="Access" htmlFor="access-level">
              <select id="access-level" value={access} onChange={(e) => setAccess(e.target.value as 'View' | 'Edit' | 'Admin')} className="input" disabled={!isLeader}>
                <option value="View">View</option>
                <option value="Edit">Edit</option>
                <option value="Admin">Admin</option>
              </select>
            </Field>
            <div className="flex items-end">
              <button type="button" className="btn-primary" onClick={addEntry} disabled={!isLeader}>
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Field label="Role" htmlFor="access-role">
              <input id="access-role" value={role} onChange={(e) => setRole(e.target.value)} className="input" placeholder="e.g. Assistant Director" disabled={!isLeader} />
            </Field>
            {loadingEntries ? (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
                Loading collaborators…
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
                No shared collaborators yet.
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900">{entry.name}</p>
                      <p className="text-sm text-ink-500">{entry.email} · {entry.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">{entry.access}</span>
                    <button type="button" onClick={() => removeEntry(entry.id)} className="rounded-lg p-2 text-danger-600 hover:bg-danger-50" disabled={!isLeader}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {error ? (
            <div className="rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
