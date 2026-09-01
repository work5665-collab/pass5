-- Create cards table for project-specific card data
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL, -- Unique identifier for the card type (e.g., 'purpose_and_problem')
  title TEXT NOT NULL,
  description TEXT,
  step_key TEXT NOT NULL, -- Which step this card belongs to (e.g., 'Input', 'Setup')
  fields JSONB DEFAULT '[]'::jsonb, -- Array of field objects
  position INTEGER DEFAULT 0, -- Position within the step
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by project_id
CREATE INDEX IF NOT EXISTS idx_cards_project_id ON cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_project_step ON cards(project_id, step_key);

-- Enable Row Level Security
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access cards for projects they are members of
CREATE POLICY "Users can view cards for their projects"
  ON cards FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cards for their projects"
  ON cards FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update cards for their projects"
  ON cards FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete cards for their projects"
  ON cards FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
