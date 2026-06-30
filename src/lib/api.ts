import { supabase } from './supabase';
import type {
  ExpenseObject,
  ExpensePerson,
  ExpensePersonWithInstallments,
  FundingSource,
  Installment,
  PaymentMethod,
  Project,
  ProjectLedger,
  ProjectAccessEntry,
} from './types';

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(humanizePgError(error));
  return (data ?? []) as Project[];
}

export async function getCurrentUserId(): Promise<string> {
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const userId = userData.user?.id ?? sessionData.session?.user?.id;
  if (import.meta.env.DEV) {
    console.log('Supabase auth debug:', {
      user: userData.user,
      session: sessionData.session,
      userId,
    });
  }

  if (!userId) throw new Error('Not authenticated. Please sign in and try again.');
  return userId;
}

export async function createProject(title: string, description: string | null): Promise<Project> {
  const user_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('projects')
    .insert({ title, description, user_id })
    .select()
    .maybeSingle();
  if (error) throw new Error(humanizePgError(error));
  if (!data) throw new Error('Could not create project. Please try again.');
  return data as Project;
}

export async function updateProject(id: string, patch: { title?: string; description?: string | null }): Promise<void> {
  const { error } = await supabase.from('projects').update(patch).eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export async function fetchProjectLedger(projectId: string): Promise<ProjectLedger> {
  const [proj, funding, objects, people, installments] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
    supabase.from('funding_sources').select('*').eq('project_id', projectId).order('date', { ascending: false }),
    supabase.from('expense_objects').select('*').eq('project_id', projectId).order('date', { ascending: false }),
    supabase.from('expense_people').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('installments').select('*').eq('project_id', projectId).order('date', { ascending: false }),
  ]);

  if (proj.error) throw new Error(humanizePgError(proj.error));
  if (!proj.data) throw new Error('Project not found or you do not have access to it.');

  const fundingSources = (funding.data ?? []) as FundingSource[];
  const expenseObjects = (objects.data ?? []) as ExpenseObject[];
  const expensePeopleRaw = (people.data ?? []) as ExpensePerson[];
  const installmentsRaw = (installments.data ?? []) as Installment[];

  const expensePeople: ExpensePersonWithInstallments[] = expensePeopleRaw.map((p) => {
    const personInstallments = installmentsRaw.filter((i) => i.expense_person_id === p.id);
    const totalPaid = personInstallments.reduce((s, i) => s + Number(i.amount_paid), 0);
    return {
      ...p,
      installments: personInstallments,
      total_paid: totalPaid,
      remaining: Math.max(0, Number(p.agreed_total_contract) - totalPaid),
    };
  });

  const totalInflow = fundingSources.reduce((s, f) => s + Number(f.amount), 0);
  const objectsTotal = expenseObjects.reduce((s, o) => s + Number(o.amount), 0);
  const installmentsTotal = installmentsRaw.reduce((s, i) => s + Number(i.amount_paid), 0);
  const totalOutflow = objectsTotal + installmentsTotal;
  const remainingBalance = totalInflow - totalOutflow;

  return {
    project: proj.data as Project,
    fundingSources,
    expenseObjects,
    expensePeople,
    totalInflow,
    totalOutflow,
    remainingBalance,
  };
}

export interface FundingInput {
  source_name: string;
  amount: number;
  payment_method: PaymentMethod;
  date: string;
  notes?: string | null;
}

export interface ProjectAccessCreateInput {
  name: string;
  email: string;
  role: string;
  role_label: string;
  access: 'View' | 'Edit' | 'Admin';
}

export async function fetchProjectAccess(projectId: string): Promise<ProjectAccessEntry[]> {
  const { data, error } = await supabase
    .from('project_access')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(humanizePgError(error));
  return (data ?? []) as ProjectAccessEntry[];
}

export async function fetchProjectAccessCounts(projectIds: string[]): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};
  const { data, error } = await supabase
    .from('project_access')
    .select('project_id')
    .in('project_id', projectIds);
  if (error) throw new Error(humanizePgError(error));
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ project_id: string }>) {
    const id = row.project_id;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function addProjectAccessEntry(projectId: string, input: ProjectAccessCreateInput): Promise<ProjectAccessEntry> {
  const { data, error } = await supabase
    .from('project_access')
    .insert({
      project_id: projectId,
      name: input.name,
      email: input.email,
      role: input.role,
      access: input.access,
      access_level: input.access,
      role_label: input.role_label ?? input.role,
    })
    .select()
    .maybeSingle();
  if (error) throw new Error(humanizePgError(error));
  if (!data) throw new Error('Could not add project access entry.');
  return data as ProjectAccessEntry;
}

export async function deleteProjectAccessEntry(id: string): Promise<void> {
  const { error } = await supabase.from('project_access').delete().eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export async function addFundingSource(projectId: string, input: FundingInput): Promise<FundingSource> {
  const user_id = await getCurrentUserId();
  if (import.meta.env.DEV) {
    console.log('addFundingSource payload', { projectId, input, user_id });
  }
  const { data, error } = await supabase
    .from('funding_sources')
    .insert({ project_id: projectId, user_id, ...input })
    .select()
    .maybeSingle();
  if (error) throw new Error(humanizePgError(error));
  if (!data) throw new Error('Could not save funding source.');
  return data as FundingSource;
}

export async function updateFundingSource(id: string, input: FundingInput): Promise<void> {
  const { error } = await supabase.from('funding_sources').update(input).eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export async function deleteFundingSource(id: string): Promise<void> {
  const { error } = await supabase.from('funding_sources').delete().eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export interface ExpenseObjectInput {
  item_name: string;
  amount: number;
  payment_method: PaymentMethod;
  date: string;
  proof_url?: string | null;
  notes?: string | null;
}

export async function addExpenseObject(projectId: string, input: ExpenseObjectInput): Promise<ExpenseObject> {
  const user_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('expense_objects')
    .insert({ project_id: projectId, user_id, ...input })
    .select()
    .maybeSingle();
  if (error) throw new Error(humanizePgError(error));
  if (!data) throw new Error('Could not save expense.');
  return data as ExpenseObject;
}

export async function updateExpenseObject(id: string, input: ExpenseObjectInput): Promise<void> {
  const { error } = await supabase.from('expense_objects').update(input).eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export async function deleteExpenseObject(id: string): Promise<void> {
  const { error } = await supabase.from('expense_objects').delete().eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export interface ExpensePersonInput {
  name: string;
  role: string;
  agreed_total_contract: number;
  notes?: string | null;
}

export async function addExpensePerson(projectId: string, input: ExpensePersonInput): Promise<ExpensePerson> {
  const user_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('expense_people')
    .insert({ project_id: projectId, user_id, ...input })
    .select()
    .maybeSingle();
  if (error) throw new Error(humanizePgError(error));
  if (!data) throw new Error('Could not save person.');
  return data as ExpensePerson;
}

export async function updateExpensePerson(id: string, input: ExpensePersonInput): Promise<void> {
  const { error } = await supabase.from('expense_people').update(input).eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export async function deleteExpensePerson(id: string): Promise<void> {
  const { error } = await supabase.from('expense_people').delete().eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

export interface InstallmentInput {
  amount_paid: number;
  date: string;
  payment_method: PaymentMethod;
  proof_url?: string | null;
  notes?: string | null;
}

export async function addInstallment(expensePersonId: string, projectId: string, input: InstallmentInput): Promise<Installment> {
  const user_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('installments')
    .insert({ expense_person_id: expensePersonId, project_id: projectId, user_id, ...input })
    .select()
    .maybeSingle();
  if (error) throw new Error(humanizePgError(error));
  if (!data) throw new Error('Could not save installment.');
  return data as Installment;
}

export async function deleteInstallment(id: string): Promise<void> {
  const { error } = await supabase.from('installments').delete().eq('id', id);
  if (error) throw new Error(humanizePgError(error));
}

function humanizePgError(error: { message?: string; code?: string }): string {
  const msg = error.message ?? '';
  if (/network|fetch|Failed to fetch/i.test(msg)) {
    return 'Network error — please check your connection and try again.';
  }
  if (/timeout/i.test(msg)) {
    return 'The request timed out. Please try again.';
  }
  if (/violates row-level security/i.test(msg)) {
    return 'You do not have permission to perform this action.';
  }
  return msg || 'Something went wrong. Please try again.';
}
