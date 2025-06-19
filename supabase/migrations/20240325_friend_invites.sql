-- Create friend_invites table for the new invite link system
CREATE TABLE IF NOT EXISTS friend_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_friend_invites_token ON friend_invites(token);
CREATE INDEX IF NOT EXISTS idx_friend_invites_from_user_id ON friend_invites(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_invites_status ON friend_invites(status);

-- Enable RLS
ALTER TABLE friend_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sent invites" ON friend_invites
  FOR SELECT USING (auth.uid() = from_user_id);

CREATE POLICY "Users can create invites" ON friend_invites
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their own invites" ON friend_invites
  FOR UPDATE USING (auth.uid() = from_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friend_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_friend_invites_updated_at
  BEFORE UPDATE ON friend_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_invites_updated_at(); 