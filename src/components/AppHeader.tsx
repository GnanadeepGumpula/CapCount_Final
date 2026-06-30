import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Film, LayoutGrid, LogOut, Menu, Settings, UserCircle2, Info } from 'lucide-react';
import { formatINR } from '../lib/format';
import { useAuth } from '../lib/auth';
import { getStoredUserRole } from '../lib/projectAccess';
import { useToast } from '../lib/toast';

interface AppHeaderProps {
  onHome: () => void;
  summary?: { totalInflow: number; totalOutflow: number; remainingBalance: number };
  onOpenAnalytics?: () => void;
  onExportPdf?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
}

export function AppHeader({ onHome, summary, onOpenAnalytics, onExportPdf, onOpenSettings, onOpenProfile }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const toast = useToast();

  const roleLabel = getStoredUserRole();
  const isLeader = /leader/i.test(roleLabel);
  const initials = useMemo(() => (user?.email ?? '?').slice(0, 2).toUpperCase(), [user?.email]);

  useEffect(() => {
    if (!menuOpen && !summaryOpen) return;
    const onPointerDown = () => {
      setMenuOpen(false);
      setSummaryOpen(false);
    };
    window.addEventListener('click', onPointerDown);
    return () => window.removeEventListener('click', onPointerDown);
  }, [menuOpen, summaryOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    toast.info('Signed out', 'You have been securely signed out.');
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Left Brand Area — Styled with a larger prominent logo image wrapper */}
          <button onClick={onHome} className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80">
            <img 
              src="/logo.png" 
              alt="CapCount logo" 
              className="h-11 w-11 rounded-xl object-contain shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
              <Film className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-left">
              <p className="font-display text-base font-bold leading-none text-ink-900">CapCount</p>
              <p className="truncate text-[11px] text-ink-500 mt-1 leading-none">{roleLabel}</p>
            </div>
          </button>

          {/* Central Summary Metrics Section (Desktop View Context Only) */}
          {summary && (
            <div className="hidden md:flex items-center gap-6 rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-1.5">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-ink-400">Inflow</p>
                <p className="font-mono text-xs font-bold text-brand-700">{formatINR(summary.totalInflow)}</p>
              </div>
              <div className="h-6 w-px bg-ink-200" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-ink-400">Outflow</p>
                <p className="font-mono text-xs font-bold text-accent-700">{formatINR(summary.totalOutflow)}</p>
              </div>
              <div className="h-6 w-px bg-ink-200" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-ink-400">Remaining</p>
                <p className="font-mono text-sm font-black text-ink-900">{formatINR(summary.remainingBalance)}</p>
              </div>
            </div>
          )}

          {/* Right Layout Context Options Control Elements */}
          <div className="flex items-center gap-2">
            
            {/* Mobile View Interactive Balance Pill -> Triggers Dropdown On Click */}
            {summary && (
              <div className="relative md:hidden">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSummaryOpen((cur) => !cur);
                    setMenuOpen(false); // Close profile drawer to avoid layout conflicts
                  }}
                  className="flex flex-col items-end px-3 py-1 rounded-xl bg-ink-900 text-white font-mono text-xs font-bold transition-all active:scale-95 shadow-sm"
                >
                  <span className="text-[8px] uppercase tracking-widest text-ink-400 font-sans font-medium">Remaining:</span>
                  {formatINR(summary.remainingBalance)}
                </button>

                {summaryOpen && (
                  <div 
                    className="absolute right-0 top-full z-50 mt-2 w-64 animate-scale-in rounded-2xl border border-ink-200 bg-white p-4 shadow-pop"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-ink-100 mb-3">
                      <h4 className="text-xs font-bold text-ink-900 flex items-center gap-1">
                        <Info className="h-3.5 w-3.5 text-brand-600" /> Capital Pool Breakdown
                      </h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-brand-700">
                        <span>Total Inflow</span>
                        <span className="font-mono font-semibold">{formatINR(summary.totalInflow)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                        <span>Total Outflow</span>
                        <span className="font-mono font-semibold">{formatINR(summary.totalOutflow)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Menu Toggle Wrapper Control */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((cur) => !cur);
                  setSummaryOpen(false); // Close metrics context to isolate navigation flow
                }}
                className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-2.5 py-1.5 shadow-soft transition-all active:scale-95"
                aria-label="Open menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
                  {initials}
                </div>
                {summary && (
                  <span className="hidden text-sm font-semibold text-ink-700 md:inline">
                    {formatINR(summary.remainingBalance)}
                  </span>
                )}
                <Menu className="h-4 w-4 text-ink-600" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Account Metadata Identity Block */}
                  <div className="border-b border-ink-100 bg-ink-50/70 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">{user?.email ?? 'Signed in'}</p>
                        <p className="truncate text-xs text-ink-500 capitalize">{roleLabel}</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Route Actions Context List */}
                  <div className="p-2">
                    {onHome && (
                      <button type="button" onClick={() => { setMenuOpen(false); onHome(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                        <LayoutGrid className="h-4 w-4 text-brand-600" />
                        All projects
                      </button>
                    )}
                    {onOpenAnalytics && (
                      <button type="button" onClick={() => { setMenuOpen(false); onOpenAnalytics(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                        <BarChart3 className="h-4 w-4 text-brand-600" />
                        Analytics Dashboard
                      </button>
                    )}
                    {onExportPdf && (
                      <button type="button" onClick={() => { setMenuOpen(false); onExportPdf(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                        <Download className="h-4 w-4 text-brand-600" />
                        Export PDF Report
                      </button>
                    )}
                    {isLeader && onOpenSettings && (
                      <button type="button" onClick={() => { setMenuOpen(false); onOpenSettings(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                        <Settings className="h-4 w-4 text-brand-600" />
                        Administrative Settings
                      </button>
                    )}
                    {onOpenProfile ? (
                      <button type="button" onClick={() => { setMenuOpen(false); onOpenProfile(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                        <UserCircle2 className="h-4 w-4 text-brand-600" />
                        User Profile
                      </button>
                    ) : (
                      <button type="button" className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-400" disabled>
                        <UserCircle2 className="h-4 w-4 text-brand-400" />
                        User Profile (coming soon)
                      </button>
                    )}
                  </div>

                  {/* Sign Out Action Area */}
                  <div className="border-t border-ink-100 p-2">
                    <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-danger-700 hover:bg-danger-50">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}