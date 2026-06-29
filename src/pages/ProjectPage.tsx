import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Filter,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../lib/toast';
import {
  deleteExpenseObject,
  deleteExpensePerson,
  deleteFundingSource,
  fetchProjectLedger,
  getCurrentUserId,
} from '../lib/api';
import type {
  ExpenseObject,
  ExpensePerson,
  ExpensePersonWithInstallments,
  FundingSource,
  Installment,
  ProjectLedger,
} from '../lib/types';
import { FundingCard } from './project/FundingCard';
import { ExpenseObjectCard } from './project/ExpenseObjectCard';
import { ExpensePersonCard } from './project/ExpensePersonCard';
import { FundingFormModal } from './project/FundingFormModal';
import { ExpenseObjectFormModal } from './project/ExpenseObjectFormModal';
import { ExpensePersonFormModal } from './project/ExpensePersonFormModal';
import { InstallmentFormModal } from './project/InstallmentFormModal';
import { OnboardingModal } from './project/OnboardingModal';
import { ProjectAccessModal } from './project/ProjectAccessModal';
import { exportProjectPdf } from '../lib/pdf';

interface ProjectPageProps {
  projectId: string;
  onBack: () => void;
  onOpenAnalytics: (projectId: string) => void;
  onOpenProfile: () => void;
}

type FilterKind = 'all' | 'people' | 'objects' | 'funding';

export function ProjectPage({ projectId, onBack, onOpenAnalytics, onOpenProfile }: ProjectPageProps) {
  const [ledger, setLedger] = useState<ProjectLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const [fundingModal, setFundingModal] = useState<{ open: boolean; editing?: FundingSource }>({ open: false });
  const [objectModal, setObjectModal] = useState<{ open: boolean; editing?: ExpenseObject }>({ open: false });
  const [personModal, setPersonModal] = useState<{ open: boolean; editing?: ExpensePerson }>({ open: false });
  const [installmentModal, setInstallmentModal] = useState<{ open: boolean; person: ExpensePersonWithInstallments | null }>({ open: false, person: null });
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'funding'; id: string; title: string }
    | { kind: 'object'; id: string; title: string }
    | { kind: 'person'; id: string; title: string }
    | null
  >(null);

  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, userId] = await Promise.all([fetchProjectLedger(projectId), getCurrentUserId()]);
      setLedger(data);
      setCurrentUserId(userId);
      if (data.fundingSources.length === 0 && data.expenseObjects.length === 0 && data.expensePeople.length === 0) {
        setOnboardingOpen(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load project.';
      setError(msg);
      toast.error('Load failed', msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredFunding = useMemo<FundingSource[]>(() => {
    if (!ledger) return [];
    if (filter !== 'all' && filter !== 'funding') return [];
    const q = search.trim().toLowerCase();
    if (!q) return ledger.fundingSources;
    return ledger.fundingSources.filter(
      (f) => f.source_name.toLowerCase().includes(q) || f.payment_method.toLowerCase().includes(q),
    );
  }, [ledger, filter, search]);

  const filteredObjects = useMemo<ExpenseObject[]>(() => {
    if (!ledger) return [];
    if (filter !== 'all' && filter !== 'objects') return [];
    const q = search.trim().toLowerCase();
    if (!q) return ledger.expenseObjects;
    return ledger.expenseObjects.filter(
      (o) => o.item_name.toLowerCase().includes(q) || o.payment_method.toLowerCase().includes(q),
    );
  }, [ledger, filter, search]);

  const filteredPeople = useMemo<ExpensePersonWithInstallments[]>(() => {
    if (!ledger) return [];
    if (filter !== 'all' && filter !== 'people') return [];
    const q = search.trim().toLowerCase();
    if (!q) return ledger.expensePeople;
    return ledger.expensePeople.filter(
      (p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q),
    );
  }, [ledger, filter, search]);

  const totalCards = filteredFunding.length + filteredObjects.length + filteredPeople.length;

  function applyFunding(fs: FundingSource, wasEdit: boolean) {
    setLedger((cur) => {
      if (!cur) return cur;
      const fundingSources = wasEdit
        ? cur.fundingSources.map((f) => (f.id === fs.id ? fs : f))
        : [fs, ...cur.fundingSources];
      const totalInflow = fundingSources.reduce((s, f) => s + Number(f.amount), 0);
      return { ...cur, fundingSources, totalInflow, remainingBalance: totalInflow - cur.totalOutflow };
    });
  }

  function applyObject(eo: ExpenseObject, wasEdit: boolean) {
    setLedger((cur) => {
      if (!cur) return cur;
      const expenseObjects = wasEdit
        ? cur.expenseObjects.map((o) => (o.id === eo.id ? eo : o))
        : [eo, ...cur.expenseObjects];
      const objectsTotal = expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
      const totalOutflow = objectsTotal + cur.expensePeople.reduce((s, p) => s + p.total_paid, 0);
      return { ...cur, expenseObjects, totalOutflow, remainingBalance: cur.totalInflow - totalOutflow };
    });
  }

  function applyPerson(p: ExpensePerson, wasEdit: boolean, initialInstallment?: Installment) {
    setLedger((cur) => {
      if (!cur) return cur;
      const existing = cur.expensePeople.find((x) => x.id === p.id);
      const installments = initialInstallment ? [initialInstallment, ...(existing?.installments ?? [])] : (existing?.installments ?? []);
      const total_paid = installments.reduce((s, i) => s + Number(i.amount_paid), 0);
      const withInst: ExpensePersonWithInstallments = {
        ...p,
        installments,
        total_paid,
        remaining: Math.max(0, Number(p.agreed_total_contract) - total_paid),
      };
      const expensePeople = wasEdit
        ? cur.expensePeople.map((x) => (x.id === p.id ? withInst : x))
        : [withInst, ...cur.expensePeople];
      const installmentsTotal = expensePeople.reduce((s, x) => s + x.total_paid, 0);
      const objectsTotal = cur.expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
      const totalOutflow = objectsTotal + installmentsTotal;
      return { ...cur, expensePeople, totalOutflow, remainingBalance: cur.totalInflow - totalOutflow };
    });
  }

  function applyInstallment(inst: Installment) {
    setLedger((cur) => {
      if (!cur) return cur;
      const expensePeople = cur.expensePeople.map((p) => {
        if (p.id !== inst.expense_person_id) return p;
        const installments = [inst, ...p.installments];
        const total_paid = installments.reduce((s, i) => s + Number(i.amount_paid), 0);
        return { ...p, installments, total_paid, remaining: Math.max(0, Number(p.agreed_total_contract) - total_paid) };
      });
      const installmentsTotal = expensePeople.reduce((s, p) => s + p.total_paid, 0);
      const objectsTotal = cur.expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
      const totalOutflow = objectsTotal + installmentsTotal;
      return { ...cur, expensePeople, totalOutflow, remainingBalance: cur.totalInflow - totalOutflow };
    });
  }

  function removeInstallment(inst: Installment) {
    setLedger((cur) => {
      if (!cur) return cur;
      const expensePeople = cur.expensePeople.map((p) => {
        if (p.id !== inst.expense_person_id) return p;
        const installments = p.installments.filter((i) => i.id !== inst.id);
        const total_paid = installments.reduce((s, i) => s + Number(i.amount_paid), 0);
        return { ...p, installments, total_paid, remaining: Math.max(0, Number(p.agreed_total_contract) - total_paid) };
      });
      const installmentsTotal = expensePeople.reduce((s, p) => s + p.total_paid, 0);
      const objectsTotal = cur.expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
      const totalOutflow = objectsTotal + installmentsTotal;
      return { ...cur, expensePeople, totalOutflow, remainingBalance: cur.totalInflow - totalOutflow };
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'funding') {
        await deleteFundingSource(deleteTarget.id);
        setLedger((cur) => {
          if (!cur) return cur;
          const fundingSources = cur.fundingSources.filter((f) => f.id !== deleteTarget.id);
          const totalInflow = fundingSources.reduce((s, f) => s + Number(f.amount), 0);
          return { ...cur, fundingSources, totalInflow, remainingBalance: totalInflow - cur.totalOutflow };
        });
      } else if (deleteTarget.kind === 'object') {
        await deleteExpenseObject(deleteTarget.id);
        setLedger((cur) => {
          if (!cur) return cur;
          const expenseObjects = cur.expenseObjects.filter((o) => o.id !== deleteTarget.id);
          const objectsTotal = expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
          const totalOutflow = objectsTotal + cur.expensePeople.reduce((s, p) => s + p.total_paid, 0);
          return { ...cur, expenseObjects, totalOutflow, remainingBalance: cur.totalInflow - totalOutflow };
        });
      } else if (deleteTarget.kind === 'person') {
        await deleteExpensePerson(deleteTarget.id);
        setLedger((cur) => {
          if (!cur) return cur;
          const expensePeople = cur.expensePeople.filter((p) => p.id !== deleteTarget.id);
          const installmentsTotal = expensePeople.reduce((s, p) => s + p.total_paid, 0);
          const objectsTotal = cur.expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
          const totalOutflow = objectsTotal + installmentsTotal;
          return { ...cur, expensePeople, totalOutflow, remainingBalance: cur.totalInflow - totalOutflow };
        });
      }
      toast.success('Deleted');
    } catch (e) {
      toast.error('Could not delete', e instanceof Error ? e.message : undefined);
    }
  }

  async function handleExport() {
    if (!ledger) return;
    try {
      await exportProjectPdf(ledger);
      toast.success('Report exported', 'Your PDF report has been downloaded.');
    } catch (e) {
      toast.error('Export failed', e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader
        onHome={onBack}
        summary={ledger ? { totalInflow: ledger.totalInflow, totalOutflow: ledger.totalOutflow, remainingBalance: ledger.remainingBalance } : undefined}
        onOpenAnalytics={ledger ? () => onOpenAnalytics(ledger.project.id) : undefined}
        onExportPdf={ledger ? handleExport : undefined}
        onOpenSettings={ledger?.project.user_id === currentUserId ? () => setAccessModalOpen(true) : undefined}
        onOpenProfile={onOpenProfile}

      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <button onClick={onBack} className="btn-ghost mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          All projects
        </button>

        {loading ? (
          <ProjectSkeleton />
        ) : error || !ledger ? (
          <EmptyState
            icon={<Wallet className="h-7 w-7" />}
            title="Could not load project"
            description={error ?? 'Please try again.'}
            action={<button className="btn-primary" onClick={load}>Retry</button>}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">{ledger.project.title}</h1>
                {ledger.project.description && (
                  <p className="mt-1 max-w-2xl text-sm text-ink-500">{ledger.project.description}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {currentUserId && ledger?.project.user_id === currentUserId ? (
                  <button onClick={() => setAccessModalOpen(true)} className="btn-secondary">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-900">Ledger</h2>
                <p className="text-sm text-ink-500">All inflows, expenses, and talent for this project.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setFundingModal({ open: true })} className="btn-secondary">
                  <Plus className="h-4 w-4" />
                  Funding
                </button>
                <button onClick={() => setPersonModal({ open: true })} className="btn-secondary">
                  <Users className="h-4 w-4" />
                  Person
                </button>
                <button onClick={() => setObjectModal({ open: true })} className="btn-primary">
                  <Wallet className="h-4 w-4" />
                  Expense
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, role, method…"
                  className="input pl-10"
                  aria-label="Search ledger"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1 text-xs text-ink-400 sm:flex">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip label="All" count={ledger.fundingSources.length + ledger.expenseObjects.length + ledger.expensePeople.length} active={filter === 'all'} onClick={() => setFilter('all')} />
                  <FilterChip label="People" count={ledger.expensePeople.length} active={filter === 'people'} onClick={() => setFilter('people')} />
                  <FilterChip label="Objects" count={ledger.expenseObjects.length} active={filter === 'objects'} onClick={() => setFilter('objects')} />
                  <FilterChip label="Funding" count={ledger.fundingSources.length} active={filter === 'funding'} onClick={() => setFilter('funding')} />
                </div>
              </div>
            </div>

            <div className="mt-4">
              {totalCards === 0 ? (
                <EmptyState
                  icon={<Sparkles className="h-7 w-7" />}
                  title={search || filter !== 'all' ? 'No matching entries' : 'Start your ledger'}
                  description={
                    search || filter !== 'all'
                      ? 'Try a different search term or filter.'
                      : 'Add a funding source, an expense, or a person to begin tracking cash flow.'
                  }
                  action={
                    search || filter !== 'all' ? (
                      <button className="btn-secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</button>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-2">
                        <button className="btn-primary" onClick={() => setFundingModal({ open: true })}>Add funding</button>
                        <button className="btn-secondary" onClick={() => setObjectModal({ open: true })}>Add expense</button>
                        <button className="btn-secondary" onClick={() => setPersonModal({ open: true })}>Add person</button>
                      </div>
                    )
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredFunding.map((f) => (
                    <FundingCard
                      key={f.id}
                      item={f}
                      onEdit={() => setFundingModal({ open: true, editing: f })}
                      onDelete={() => setDeleteTarget({ kind: 'funding', id: f.id, title: f.source_name })}
                    />
                  ))}
                  {filteredObjects.map((o) => (
                    <ExpenseObjectCard
                      key={o.id}
                      item={o}
                      onEdit={() => setObjectModal({ open: true, editing: o })}
                      onDelete={() => setDeleteTarget({ kind: 'object', id: o.id, title: o.item_name })}
                    />
                  ))}
                  {filteredPeople.map((p) => (
                    <ExpensePersonCard
                      key={p.id}
                      person={p}
                      onEdit={() => setPersonModal({ open: true, editing: p })}
                      onDelete={() => setDeleteTarget({ kind: 'person', id: p.id, title: p.name })}
                      onAddInstallment={() => setInstallmentModal({ open: true, person: p })}
                      onDeleteInstallment={removeInstallment}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <OnboardingModal
        open={onboardingOpen}
        projectId={projectId}
        onClose={() => setOnboardingOpen(false)}
        onSkip={() => setOnboardingOpen(false)}
        onSaved={(fs) => {
          setOnboardingOpen(false);
          applyFunding(fs, false);
        }}
      />

      <FundingFormModal
        open={fundingModal.open}
        projectId={projectId}
        editing={fundingModal.editing}
        onClose={() => setFundingModal({ open: false })}
        onSaved={(fs, wasEdit) => {
          applyFunding(fs, wasEdit);
          setFundingModal({ open: false });
        }}
      />

      <ExpenseObjectFormModal
        open={objectModal.open}
        projectId={projectId}
        remainingBalance={ledger?.remainingBalance ?? 0}
        editing={objectModal.editing}
        onClose={() => setObjectModal({ open: false })}
        onSaved={(eo, wasEdit) => {
          applyObject(eo, wasEdit);
          setObjectModal({ open: false });
        }}
      />

      <ExpensePersonFormModal
        open={personModal.open}
        projectId={projectId}
        editing={personModal.editing}
        onClose={() => setPersonModal({ open: false })}
        onSaved={(p, wasEdit, _initialPaid, initialInstallment) => {
          applyPerson(p, wasEdit, initialInstallment);
          setPersonModal({ open: false });
        }}
      />

      <InstallmentFormModal
        open={installmentModal.open}
        person={installmentModal.person}
        projectId={projectId}
        remainingBalance={ledger?.remainingBalance ?? 0}
        onClose={() => setInstallmentModal({ open: false, person: null })}
        onSaved={(inst) => {
          applyInstallment(inst);
          setInstallmentModal({ open: false, person: null });
        }}
      />

      <ProjectAccessModal
        open={accessModalOpen}
        projectId={projectId}
        projectTitle={ledger?.project.title ?? 'Project'}
        canManageAccess={ledger?.project.user_id === currentUserId}
        onClose={() => setAccessModalOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete entry?"
        message={`This permanently deletes "${deleteTarget?.title}" and cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`chip ${active ? 'chip-on' : 'chip-off'}`} aria-pressed={active}>
      {label}
      <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-ink-100 text-ink-500'}`}>{count}</span>
    </button>
  );
}

function ProjectSkeleton() {
  return (
    <div>
      <div className="skeleton h-8 w-1/3" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-28 p-5">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton mt-4 h-7 w-2/3" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-40 p-4">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton mt-3 h-6 w-2/3" />
            <div className="skeleton mt-3 h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
