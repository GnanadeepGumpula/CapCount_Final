import { ArrowLeft } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../lib/auth';

interface ProfilePageProps {
  onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader onHome={onBack} />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="mt-8 rounded-3xl border border-ink-200 bg-white p-8 shadow-soft">
          <h1 className="font-display text-2xl font-bold text-ink-900">User Profile</h1>
          <p className="mt-2 text-sm text-ink-500">Account details and preferences for your CapCount workspace.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-ink-100 bg-ink-50 p-6">
              <h2 className="text-sm font-semibold text-ink-900">Account</h2>
              <dl className="mt-4 space-y-4 text-sm text-ink-600">
                <div>
                  <dt className="font-medium text-ink-800">Email</dt>
                  <dd className="mt-1 truncate">{user?.email ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink-800">User ID</dt>
                  <dd className="mt-1 truncate">{user?.id ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink-800">Provider</dt>
                  <dd className="mt-1 truncate">{user?.app_metadata?.provider ?? 'email'}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-3xl border border-ink-100 bg-ink-50 p-6">
              <h2 className="text-sm font-semibold text-ink-900">Preferences</h2>
              <p className="mt-4 text-sm text-ink-600">This page is currently a placeholder for future profile settings. You can return to the dashboard to manage projects and ledger entries.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
