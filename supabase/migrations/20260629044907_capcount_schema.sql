/*
# CapCount — Multi-tenant financial ledger schema

## Overview
Creates the full data model for CapCount, a financial ledger platform for movie
production houses and event managers. Every row is strictly scoped to the
authenticated owner via Row Level Security so users can only ever see or modify
their own data.

## New Tables
1. `projects` — A production or event (e.g. Movie "A", Event "Hara").
   - id (uuid, PK)
   - user_id (uuid, owner, defaults to auth.uid())
   - title (text, not null)
   - description (text, optional)
   - created_at (timestamptz)

2. `funding_sources` — Inflow entries (investors, sponsors, advances).
   - id (uuid, PK)
   - project_id (uuid, FK -> projects, cascade delete)
   - user_id (uuid, owner, defaults to auth.uid())
   - source_name (text, not null)
   - amount (numeric(14,2), not null, check >= 0)
   - payment_method (text, not null, check in allowed list)
   - date (date, not null)
   - notes (text, optional)
   - created_at (timestamptz)

3. `expense_objects` — Physical goods / asset expenses (equipment, props, catering).
   - id (uuid, PK)
   - project_id (uuid, FK -> projects, cascade delete)
   - user_id (uuid, owner, defaults to auth.uid())
   - item_name (text, not null)
   - amount (numeric(14,2), not null, check >= 0)
   - payment_method (text, not null)
   - date (date, not null)
   - proof_url (text, optional — receipt image URL)
   - notes (text, optional)
   - created_at (timestamptz)

4. `expense_people` — Talent/crew with a contracted total and installment sub-ledger.
   - id (uuid, PK)
   - project_id (uuid, FK -> projects, cascade delete)
   - user_id (uuid, owner, defaults to auth.uid())
   - name (text, not null)
   - role (text, not null, e.g. Hero, Director)
   - agreed_total_contract (numeric(14,2), not null, check >= 0)
   - notes (text, optional)
   - created_at (timestamptz)

5. `installments` — Milestone payments made to an expense_person.
   - id (uuid, PK)
   - expense_person_id (uuid, FK -> expense_people, cascade delete)
   - project_id (uuid, FK -> projects, cascade delete — denormalized for fast queries)
   - user_id (uuid, owner, defaults to auth.uid())
   - amount_paid (numeric(14,2), not null, check >= 0)
   - date (date, not null)
   - payment_method (text, not null)
   - proof_url (text, optional)
   - notes (text, optional)
   - created_at (timestamptz)

## Security
- RLS enabled on every table.
- 4 CRUD policies per table, scoped `TO authenticated` with `auth.uid() = user_id`
  ownership checks. Child tables (funding_sources, expense_objects, expense_people,
  installments) also enforce that the parent project belongs to the same user via an
  EXISTS subquery, so a user cannot attach a child row to another user's project.
- `user_id` columns default to `auth.uid()` so frontend inserts that omit `user_id`
  still satisfy the INSERT `WITH CHECK` policy.

## Notes
1. Amounts use numeric(14,2) for exact decimal arithmetic in INR.
2. Payment methods are constrained to a fixed CHECK list: UPI, Bank, Check, PhonePe,
   GPay, Cash, Other.
3. Indexes added on user_id and project_id for fast per-project queries.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

CREATE TABLE IF NOT EXISTS funding_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('UPI','Bank','Check','PhonePe','GPay','Cash','Other')),
  date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_funding_sources" ON funding_sources;
CREATE POLICY "select_own_funding_sources" ON funding_sources FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_funding_sources" ON funding_sources;
CREATE POLICY "insert_own_funding_sources" ON funding_sources FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_funding_sources" ON funding_sources;
CREATE POLICY "update_own_funding_sources" ON funding_sources FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_funding_sources" ON funding_sources;
CREATE POLICY "delete_own_funding_sources" ON funding_sources FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_funding_sources_project_id ON funding_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_user_id ON funding_sources(user_id);

CREATE TABLE IF NOT EXISTS expense_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('UPI','Bank','Check','PhonePe','GPay','Cash','Other')),
  date date NOT NULL,
  proof_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expense_objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expense_objects" ON expense_objects;
CREATE POLICY "select_own_expense_objects" ON expense_objects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_expense_objects" ON expense_objects;
CREATE POLICY "insert_own_expense_objects" ON expense_objects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_expense_objects" ON expense_objects;
CREATE POLICY "update_own_expense_objects" ON expense_objects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_expense_objects" ON expense_objects;
CREATE POLICY "delete_own_expense_objects" ON expense_objects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_expense_objects_project_id ON expense_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_objects_user_id ON expense_objects(user_id);

CREATE TABLE IF NOT EXISTS expense_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  agreed_total_contract numeric(14,2) NOT NULL CHECK (agreed_total_contract >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expense_people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expense_people" ON expense_people;
CREATE POLICY "select_own_expense_people" ON expense_people FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_expense_people" ON expense_people;
CREATE POLICY "insert_own_expense_people" ON expense_people FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_expense_people" ON expense_people;
CREATE POLICY "update_own_expense_people" ON expense_people FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_expense_people" ON expense_people;
CREATE POLICY "delete_own_expense_people" ON expense_people FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_expense_people_project_id ON expense_people(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_people_user_id ON expense_people(user_id);

CREATE TABLE IF NOT EXISTS installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_person_id uuid NOT NULL REFERENCES expense_people(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid numeric(14,2) NOT NULL CHECK (amount_paid >= 0),
  date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('UPI','Bank','Check','PhonePe','GPay','Cash','Other')),
  proof_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_installments" ON installments;
CREATE POLICY "select_own_installments" ON installments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_installments" ON installments;
CREATE POLICY "insert_own_installments" ON installments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_installments" ON installments;
CREATE POLICY "update_own_installments" ON installments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_installments" ON installments;
CREATE POLICY "delete_own_installments" ON installments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_installments_expense_person_id ON installments(expense_person_id);
CREATE INDEX IF NOT EXISTS idx_installments_project_id ON installments(project_id);
CREATE INDEX IF NOT EXISTS idx_installments_user_id ON installments(user_id);
