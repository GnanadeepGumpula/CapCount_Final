import { useEffect, useState } from 'react';
import { FolderPlus, LayoutGrid, MoreHorizontal, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { Field } from '../components/Field';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Spinner } from '../components/Spinner';
import { useToast } from '../lib/toast';
import { createProject, deleteProject, fetchProjects, updateProject } from '../lib/api';
import { formatDate } from '../lib/format';
import { getProjectAccess } from '../lib/projectAccess';
import type { Project } from '../lib/types';
import { ProjectAccessModal } from './project/ProjectAccessModal';

interface DashboardPageProps {
  onOpenProject: (id: string) => void;
}

export function DashboardPage({ onOpenProject }: DashboardPageProps) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [accessModalProjectId, setAccessModalProjectId] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (e) {
      toast.error('Could not load projects', e instanceof Error ? e.message : undefined);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader onHome={() => {}} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">Your Projects</h1>
            <p className="mt-1 text-sm text-ink-500">
              Each project is a self-contained ledger. Click a card to open its dashboard.
            </p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        {loading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-44 p-5">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton mt-4 h-6 w-2/3" />
                <div className="skeleton mt-3 h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : projects && projects.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={<LayoutGrid className="h-7 w-7" />}
              title="No projects yet"
              description="Create your first project to start tracking inflows, expenses, and talent installments."
              action={
                <button onClick={() => setCreateOpen(true)} className="btn-primary">
                  <FolderPlus className="h-4 w-4" />
                  Create your first project
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects!.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => onOpenProject(p.id)}
                onEdit={() => {
                  setEditTarget(p);
                  setMenuOpenId(null);
                }}
                onDelete={() => {
                  setDeleteTarget(p);
                  setMenuOpenId(null);
                }}
                menuOpen={menuOpenId === p.id}
                onToggleMenu={() => setMenuOpenId((cur) => (cur === p.id ? null : p.id))}
                onOpenAccess={() => setAccessModalProjectId(p.id)}
              />
            ))}
            <button
              onClick={() => setCreateOpen(true)}
              className="group flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-white/50 text-ink-500 transition-all hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-500 transition-colors group-hover:bg-brand-100 group-hover:text-brand-700">
                <Plus className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold">Add New Project</p>
            </button>
          </div>
        )}
      </main>

      <ProjectFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(p) => {
          setProjects((cur) => (cur ? [p, ...cur] : [p]));
          toast.success('Project created', `"${p.title}" is ready. Open it to start logging funds.`);
        }}
      />

      <ProjectFormModal
        open={!!editTarget}
        project={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
        onSaved={(p) => {
          setProjects((cur) => (cur ? cur.map((x) => (x.id === p.id ? p : x)) : cur));
          toast.success('Project updated');
        }}
      />

      <ProjectAccessModal
        open={!!accessModalProjectId}
        projectId={accessModalProjectId ?? ''}
        projectTitle={projects?.find((p) => p.id === accessModalProjectId)?.title ?? 'Project'}
        onClose={() => setAccessModalProjectId(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete project?"
        message={`This permanently deletes "${deleteTarget?.title}" and all its funding sources, expenses, and installments. This cannot be undone.`}
        confirmLabel="Delete project"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteProject(deleteTarget.id);
            setProjects((cur) => (cur ?? []).filter((x) => x.id !== deleteTarget.id));
            toast.success('Project deleted');
          } catch (e) {
            toast.error('Could not delete project', e instanceof Error ? e.message : undefined);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpenAccess: () => void;
}

function ProjectCard({ project, onOpen, onEdit, onDelete, menuOpen, onToggleMenu, onOpenAccess }: ProjectCardProps) {
  const accessEntries = getProjectAccess(project.id);
  return (
    <div
      className="group card relative cursor-pointer p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            aria-label="Project actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => e.stopPropagation()} />
              <div
                className="animate-scale-in absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-pop"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-700 hover:bg-danger-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 className="mt-4 truncate font-display text-lg font-semibold text-ink-900">{project.title}</h3>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-ink-500">
        {project.description || 'No description added.'}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-400">Created {formatDate(project.created_at)}</span>
          {accessEntries.length > 0 ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">Shared project</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {accessEntries.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAccess();
              }}
              className="text-xs font-semibold text-brand-700"
            >
              View access
            </button>
          ) : null}
          <span className="text-xs font-medium text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
            Open →
          </span>
        </div>
      </div>
    </div>
  );
}

interface ProjectFormModalProps {
  open: boolean;
  project?: Project;
  onClose: () => void;
  onSaved: (p: Project) => void;
}

function ProjectFormModal({ open, project, onClose, onSaved }: ProjectFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setTitle(project?.title ?? '');
      setDescription(project?.description ?? '');
      setError(null);
    }
  }, [open, project]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required.');
      return;
    }
    setSaving(true);
    try {
      if (project) {
        await updateProject(project.id, { title: title.trim(), description: description.trim() || null });
        onSaved({ ...project, title: title.trim(), description: description.trim() || null });
      } else {
        const p = await createProject(title.trim(), description.trim() || null);
        onSaved(p);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save project.';
      setError(msg);
      toast.error('Save failed', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      description={project ? 'Update the project details.' : 'Name your production or event to begin.'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? <Spinner /> : null}
            {project ? 'Save changes' : 'Create project'}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Project title"
          htmlFor="project-title"
          required
          info="Give your production or event a clear name, e.g. 'Movie A' or 'Event Hara'. This appears on reports."
          error={error ?? undefined}
        >
          <input
            id="project-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`input ${error ? 'input-error' : ''}`}
            placeholder="e.g. Movie A"
            autoFocus
          />
        </Field>
        <Field
          label="Description"
          htmlFor="project-desc"
          info="Optional notes about the project — client, scope, dates, etc."
        >
          <textarea
            id="project-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[88px] resize-y"
            placeholder="Optional"
          />
        </Field>
      </form>
    </Modal>
  );
}
