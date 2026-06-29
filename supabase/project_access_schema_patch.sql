-- Patch for live Supabase schema: bring project_access up to the migration schema.
-- Run this in the Supabase SQL editor or with a service role key.

BEGIN;

ALTER TABLE project_access
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS access text NOT NULL DEFAULT 'View';

UPDATE project_access SET name = '' WHERE name IS NULL;
UPDATE project_access SET role = '' WHERE role IS NULL;
UPDATE project_access SET access = 'View' WHERE access IS NULL;

ALTER TABLE project_access ALTER COLUMN name DROP DEFAULT;
ALTER TABLE project_access ALTER COLUMN role DROP DEFAULT;
ALTER TABLE project_access ALTER COLUMN access DROP DEFAULT;
ALTER TABLE project_access ALTER COLUMN name SET NOT NULL;
ALTER TABLE project_access ALTER COLUMN role SET NOT NULL;

ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_project_owner(p_uuid uuid) RETURNS boolean
  LANGUAGE SQL SECURITY DEFINER STABLE SET row_security = off AS $$
    SELECT EXISTS (
      SELECT 1
      FROM projects
      WHERE id = p_uuid
        AND user_id = auth.uid()
    );
  $$;

CREATE OR REPLACE FUNCTION project_access_email_is_valid(email_text text) RETURNS boolean
  LANGUAGE SQL STABLE AS $$
    SELECT email_text ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$';
  $$;

CREATE OR REPLACE FUNCTION project_access_email_not_duplicate(project_uuid uuid, email_text text, user_uuid uuid, exclude_id uuid) RETURNS boolean
  LANGUAGE SQL STABLE AS $$
    SELECT NOT EXISTS (
      SELECT 1
      FROM project_access
      WHERE project_id = project_uuid
        AND id IS DISTINCT FROM exclude_id
        AND (
          user_id IS NOT DISTINCT FROM user_uuid
          OR lower(trim(email)) = lower(trim(email_text))
        )
    );
  $$;

DROP POLICY IF EXISTS "select_project_access" ON project_access;
CREATE POLICY "select_project_access" ON project_access FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
    OR is_project_owner(project_id)
  );

DROP POLICY IF EXISTS "insert_project_access" ON project_access;
CREATE POLICY "insert_project_access" ON project_access FOR INSERT
  TO authenticated WITH CHECK (
    is_project_owner(project_id)
    AND project_access_email_is_valid(email)
    AND project_access_email_not_duplicate(project_id, email, user_id, NULL)
  );

DROP POLICY IF EXISTS "update_project_access" ON project_access;
CREATE POLICY "update_project_access" ON project_access FOR UPDATE
  TO authenticated USING (
    is_project_owner(project_id)
  ) WITH CHECK (
    is_project_owner(project_id)
    AND access IN ('View','Edit','Admin')
    AND project_access_email_is_valid(email)
    AND project_access_email_not_duplicate(project_id, email, user_id, id)
  );

DROP POLICY IF EXISTS "delete_project_access" ON project_access;
CREATE POLICY "delete_project_access" ON project_access FOR DELETE
  TO authenticated USING (
    is_project_owner(project_id)
  );

DROP POLICY IF EXISTS "select_own_projects" ON projects;
DROP POLICY IF EXISTS "select_owned_or_shared_projects" ON projects;
CREATE POLICY "select_owned_or_shared_projects" ON projects FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM project_access
      WHERE project_access.project_id = projects.id
        AND (project_access.user_id = auth.uid() OR lower(trim(project_access.email)) = lower(trim(auth.jwt() ->> 'email')))
        AND project_access.access IN ('View','Edit','Admin')
    )
  );
CREATE OR REPLACE FUNCTION project_access_add_owner_for_new_project() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER STABLE SET row_security = off AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM project_access
    WHERE project_id = NEW.id
      AND user_id = NEW.user_id
  ) THEN
    INSERT INTO project_access (project_id, user_id, email, name, role, access, created_at)
    VALUES (
      NEW.id,
      NEW.user_id,
      COALESCE(auth.jwt() ->> 'email', ''),
      COALESCE(auth.jwt() ->> 'email', ''),
      'Owner',
      'Admin',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insert_project_owner_access ON projects;
CREATE TRIGGER insert_project_owner_access
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION project_access_add_owner_for_new_project();
CREATE OR REPLACE FUNCTION can_view_project(p_uuid uuid) RETURNS boolean LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = p_uuid
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM project_access pa
          WHERE pa.project_id = p.id
            AND (pa.user_id = auth.uid() OR lower(trim(pa.email)) = lower(trim(auth.jwt() ->> 'email')))
            AND pa.access IN ('View','Edit','Admin')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION can_edit_project(p_uuid uuid) RETURNS boolean LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = p_uuid
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM project_access pa
          WHERE pa.project_id = p.id
            AND (pa.user_id = auth.uid() OR lower(trim(pa.email)) = lower(trim(auth.jwt() ->> 'email')))
            AND pa.access IN ('Edit','Admin')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION can_access_project(p_uuid uuid) RETURNS boolean LANGUAGE SQL STABLE AS $$
  SELECT can_view_project(p_uuid);
$$;

COMMIT;
