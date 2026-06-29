export interface ProjectAccessEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  access: 'View' | 'Edit' | 'Admin';
  createdAt: string;
}

const ACCESS_STORAGE_KEY = 'capcount_project_access';
const ROLE_STORAGE_KEY = 'capcount_user_role';

export function getProjectAccess(projectId: string): ProjectAccessEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${ACCESS_STORAGE_KEY}:${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectAccessEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProjectAccess(projectId: string, entries: ProjectAccessEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${ACCESS_STORAGE_KEY}:${projectId}`, JSON.stringify(entries));
}

export function getStoredUserRole(): string {
  if (typeof window === 'undefined') return 'Production Leader';
  return window.localStorage.getItem(ROLE_STORAGE_KEY) || 'Production Leader';
}

export function setStoredUserRole(role: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
}
