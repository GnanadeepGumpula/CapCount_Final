export type PaymentMethod = 'UPI' | 'Bank' | 'Check' | 'PhonePe' | 'GPay' | 'Cash' | 'Other';

export const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Bank', 'Check', 'PhonePe', 'GPay', 'Cash', 'Other'];

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface FundingSource {
  id: string;
  project_id: string;
  user_id: string;
  source_name: string;
  amount: number;
  payment_method: PaymentMethod;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface ExpenseObject {
  id: string;
  project_id: string;
  user_id: string;
  item_name: string;
  amount: number;
  payment_method: PaymentMethod;
  date: string;
  proof_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExpensePerson {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  role: string;
  agreed_total_contract: number;
  notes: string | null;
  created_at: string;
}

export interface Installment {
  id: string;
  expense_person_id: string;
  project_id: string;
  user_id: string;
  amount_paid: number;
  date: string;
  payment_method: PaymentMethod;
  proof_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExpensePersonWithInstallments extends ExpensePerson {
  installments: Installment[];
  total_paid: number;
  remaining: number;
}

export interface ProjectLedger {
  project: Project;
  fundingSources: FundingSource[];
  expenseObjects: ExpenseObject[];
  expensePeople: ExpensePersonWithInstallments[];
  totalInflow: number;
  totalOutflow: number;
  remainingBalance: number;
}
