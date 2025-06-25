-- Create table to track when users last visited each group
CREATE TABLE IF NOT EXISTS group_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  last_visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_visits_user_id ON group_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_group_visits_group_id ON group_visits(group_id);
CREATE INDEX IF NOT EXISTS idx_group_visits_last_visited ON group_visits(last_visited_at);

-- Enable RLS
ALTER TABLE group_visits ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own group visits" ON group_visits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own group visits" ON group_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own group visits" ON group_visits
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_group_visits_updated_at
  BEFORE UPDATE ON group_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_group_visits_updated_at(); 