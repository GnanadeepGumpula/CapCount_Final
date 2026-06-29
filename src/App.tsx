import { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { FullPageLoader } from './components/Spinner';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

type Route =
  | { name: 'dashboard' }
  | { name: 'project'; projectId: string }
  | { name: 'analytics'; projectId: string };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h.startsWith('project/')) {
    const id = h.slice('project/'.length);
    if (id) return { name: 'project', projectId: id };
  }
  if (h.startsWith('analytics/')) {
    const id = h.slice('analytics/'.length);
    if (id) return { name: 'analytics', projectId: id };
  }
  return { name: 'dashboard' };
}

function routeToHash(r: Route): string {
  if (r.name === 'project') return `#/project/${r.projectId}`;
  if (r.name === 'analytics') return `#/analytics/${r.projectId}`;
  return '#/';
}

function Shell() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((r: Route) => {
    const hash = routeToHash(r);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      setRoute(r);
    }
    window.scrollTo({ top: 0 });
  }, []);

  if (loading) return <FullPageLoader label="Loading CapCount…" />;

  if (!user) return <AuthPage />;

  if (route.name === 'project') {
    return (
      <ProjectPage
        projectId={route.projectId}
        onBack={() => navigate({ name: 'dashboard' })}
        onOpenAnalytics={(id) => navigate({ name: 'analytics', projectId: id })}
      />
    );
  }

  if (route.name === 'analytics') {
    return <AnalyticsPage projectId={route.projectId} onBack={() => navigate({ name: 'project', projectId: route.projectId })} />;
  }

  return <DashboardPage onOpenProject={(id) => navigate({ name: 'project', projectId: id })} />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  );
}
