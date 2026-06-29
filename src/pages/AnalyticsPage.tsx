import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { DonutChart } from '../components/DonutChart';
import { BurnRateChart } from '../components/BurnRateChart';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { fetchProjectLedger } from '../lib/api';
import { formatINR } from '../lib/format';
import type { ProjectLedger } from '../lib/types';

interface AnalyticsPageProps {
  projectId: string;
  onBack: () => void;
  onOpenProfile: () => void;
}

export function AnalyticsPage({ projectId, onBack, onOpenProfile }: AnalyticsPageProps) {
  const [ledger, setLedger] = useState<ProjectLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectLedger(projectId);
      setLedger(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const analytics = useMemo(() => {
    if (!ledger) return null;
    const peoplePaid = ledger.expensePeople.reduce((s, p) => s + p.total_paid, 0);
    const objectsTotal = ledger.expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
    const peopleContracted = ledger.expensePeople.reduce((s, p) => s + Number(p.agreed_total_contract), 0);

    const timeline = buildTimeline(ledger);

    const methodBreakdown: Record<string, number> = {};
    for (const f of ledger.fundingSources) {
      methodBreakdown[f.payment_method] = (methodBreakdown[f.payment_method] ?? 0) + Number(f.amount);
    }
    for (const o of ledger.expenseObjects) {
      methodBreakdown[o.payment_method] = (methodBreakdown[o.payment_method] ?? 0) + Number(o.amount);
    }
    for (const p of ledger.expensePeople) {
      for (const i of p.installments) {
        methodBreakdown[i.payment_method] = (methodBreakdown[i.payment_method] ?? 0) + Number(i.amount_paid);
      }
    }

    return {
      peoplePaid,
      objectsTotal,
      peopleContracted,
      timeline,
      methodBreakdown,
    };
  }, [ledger]);

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader onHome={onBack} onOpenProfile={onOpenProfile} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <button onClick={onBack} className="btn-ghost mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to project
        </button>

        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-8 w-1/3" />
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card h-28 p-5"><div className="skeleton h-4 w-1/2" /><div className="skeleton mt-4 h-7 w-2/3" /></div>
              ))}
            </div>
            <div className="card h-80 p-5"><div className="skeleton h-full w-full" /></div>
          </div>
        ) : error || !ledger || !analytics ? (
          <EmptyState
            icon={<BarChart3 className="h-7 w-7" />}
            title="Could not load analytics"
            description={error ?? 'Please try again.'}
            action={<button className="btn-primary" onClick={load}>Retry</button>}
          />
        ) : (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">{ledger.project.title}</h1>
              <p className="mt-1 text-sm text-ink-500">Analytics & reporting dashboard</p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Total Inflow"
                value={ledger.totalInflow}
                kind="inflow"
                info="Sum of all funding sources."
              />
              <StatCard
                label="Total Outflow"
                value={ledger.totalOutflow}
                kind="outflow"
                info="Object expenses + installments paid to people."
              />
              <StatCard
                label="Remaining Balance"
                value={ledger.remainingBalance}
                kind="balance"
                info="Inflow minus outflow."
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-5">
              <section className="card p-5 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-base font-semibold text-ink-900">Expenditure Breakdown</h2>
                    <p className="text-xs text-ink-500">People vs. Objects</p>
                  </div>
                </div>
                <DonutChart
                  slices={[
                    { label: 'Talent / People (paid)', value: analytics.peoplePaid, color: '#1fa15f' },
                    { label: 'Physical Goods / Objects', value: analytics.objectsTotal, color: '#f97316' },
                  ]}
                  centerLabel="Outflow"
                  centerValue={formatINR(ledger.totalOutflow)}
                />
                {ledger.totalOutflow === 0 && (
                  <p className="mt-4 text-center text-xs text-ink-400">Add expenses and installments to populate this chart.</p>
                )}
              </section>

              <section className="card p-5 lg:col-span-3">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-base font-semibold text-ink-900">Burn Rate Timeline</h2>
                    <p className="text-xs text-ink-500">How the remaining balance has moved over time</p>
                  </div>
                  <div className="hidden items-center gap-3 text-xs sm:flex">
                    <span className="inline-flex items-center gap-1 text-brand-700"><TrendingUp className="h-3.5 w-3.5" /> Inflow</span>
                    <span className="inline-flex items-center gap-1 text-accent-700"><TrendingDown className="h-3.5 w-3.5" /> Outflow</span>
                  </div>
                </div>
                <BurnRateChart points={analytics.timeline} totalInflow={ledger.totalInflow} />
              </section>
            </div>

            <section className="mt-6 card p-5">
              <div className="mb-4">
                <h2 className="font-display text-base font-semibold text-ink-900">Payment Method Distribution</h2>
                <p className="text-xs text-ink-500">Total volume moved through each method (inflow + outflow)</p>
              </div>
              <MethodBars breakdown={analytics.methodBreakdown} />
            </section>

            <section className="mt-6 card p-5">
              <div className="mb-4">
                <h2 className="font-display text-base font-semibold text-ink-900">Talent Contract Status</h2>
                <p className="text-xs text-ink-500">Outstanding obligations to people</p>
              </div>
              {ledger.expensePeople.length === 0 ? (
                <p className="text-sm text-ink-400">No people added yet.</p>
              ) : (
                <div className="space-y-3">
                  {ledger.expensePeople.map((p) => {
                    const pct = p.agreed_total_contract > 0 ? Math.min(100, (p.total_paid / Number(p.agreed_total_contract)) * 100) : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="w-32 shrink-0">
                          <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                          <p className="text-xs text-ink-400">{p.role}</p>
                        </div>
                        <div className="flex-1">
                          <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="w-40 shrink-0 text-right text-xs">
                          <span className="font-mono font-semibold tabular-nums text-ink-900">{formatINR(p.total_paid)}</span>
                          <span className="text-ink-400"> / {formatINR(Number(p.agreed_total_contract))}</span>
                        </div>
                        <div className="w-24 shrink-0 text-right">
                          <span className={`text-xs font-medium ${p.remaining > 0 ? 'text-accent-700' : 'text-brand-700'}`}>
                            {p.remaining > 0 ? `${formatINR(p.remaining)} owed` : 'Settled'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function buildTimeline(ledger: ProjectLedger) {
  type Event = { date: string; inflow: number; outflow: number };
  const events: Event[] = [];
  for (const f of ledger.fundingSources) events.push({ date: f.date, inflow: Number(f.amount), outflow: 0 });
  for (const o of ledger.expenseObjects) events.push({ date: o.date, inflow: 0, outflow: Number(o.amount) });
  for (const p of ledger.expensePeople) {
    for (const i of p.installments) events.push({ date: i.date, inflow: 0, outflow: Number(i.amount_paid) });
  }
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let cumIn = 0;
  let cumOut = 0;
  const points = events.map((e) => {
    cumIn += e.inflow;
    cumOut += e.outflow;
    return { date: e.date, inflow: cumIn, outflow: cumOut, balance: cumIn - cumOut };
  });

  if (points.length === 0) return [];
  if (points.length === 1) {
    return [
      { date: points[0].date, inflow: 0, outflow: 0, balance: 0 },
      points[0],
    ];
  }
  return points;
}

function MethodBars({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="text-sm text-ink-400">No transactions yet.</p>;
  }
  const max = Math.max(...entries.map(([, v]) => v));
  const colors = ['#1fa15f', '#f97316', '#3b82f6', '#a855f7', '#eab308', '#14b8a6', '#636e80'];
  return (
    <div className="space-y-2.5">
      {entries.map(([method, value], i) => {
        const pct = (value / max) * 100;
        return (
          <div key={method} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-sm font-medium text-ink-700">{method}</div>
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
              </div>
            </div>
            <div className="w-32 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-ink-900">{formatINR(value)}</div>
          </div>
        );
      })}
    </div>
  );
}
