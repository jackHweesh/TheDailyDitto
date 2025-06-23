-- Create group_invites table for the new invite link system
CREATE TABLE IF NOT EXISTS group_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_group_invites_token ON group_invites(token);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_from_user_id ON group_invites(from_user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON group_invites(status);

-- Enable RLS
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view invites for groups they own" ON group_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_invites.group_id 
      AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Group owners can create invites" ON group_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_invites.group_id 
      AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Group owners can update invites" ON group_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_invites.group_id 
      AND groups.owner_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_group_invites_updated_at
  BEFORE UPDATE ON group_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_group_invites_updated_at(); 