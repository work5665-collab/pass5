-- Fix project_members RLS policy to allow project creators to add themselves as owners
-- This fixes the issue where new project creators cannot insert their own owner record

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert project members for their owned projects" ON project_members;

-- Create a new policy that allows:
-- 1. Users to insert themselves as owner for projects they created (created_by)
-- 2. Existing owners to add other members to their projects
CREATE POLICY "Users can insert project members for their projects"
  ON project_members FOR INSERT
  WITH CHECK (
    -- Allow users to add themselves as owner for projects they created
    (
      auth.uid() = user_id 
      AND project_id IN (
        SELECT id FROM projects 
        WHERE created_by = auth.uid()
      )
    )
    OR
    -- Allow existing owners to add other members
    (
      auth.uid() IN (
        SELECT user_id FROM project_members
        WHERE project_id = project_members.project_id
        AND role = 'owner'
      )
    )
  );

-- Also ensure that users can insert when they are the project creator via created_by
-- This provides an additional fallback for new project creation
CREATE POLICY "Project creators can insert themselves as members"
  ON project_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_id 
      AND created_by = auth.uid()
    )
  );
