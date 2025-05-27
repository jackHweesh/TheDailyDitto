-- Modify votes table to support anonymous votes
ALTER TABLE votes
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN browser_fingerprint text;

-- Add unique constraint for anonymous votes
CREATE UNIQUE INDEX IF NOT EXISTS votes_question_fingerprint_unique 
ON votes (question_id, browser_fingerprint) 
WHERE browser_fingerprint IS NOT NULL;

-- Add unique constraint for user votes
CREATE UNIQUE INDEX IF NOT EXISTS votes_question_user_unique 
ON votes (question_id, user_id) 
WHERE user_id IS NOT NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can insert their own votes" ON votes;
DROP POLICY IF EXISTS "Users can view all votes" ON votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON votes;
DROP POLICY IF EXISTS "Anyone can insert votes" ON votes;
DROP POLICY IF EXISTS "Anyone can view votes" ON votes;

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert votes (for anonymous voting)
CREATE POLICY "Anyone can insert votes"
ON votes FOR INSERT
WITH CHECK (true);

-- Allow anyone to view votes
CREATE POLICY "Anyone can view votes"
ON votes FOR SELECT
USING (true);

-- Allow users to update their own votes
CREATE POLICY "Users can update their own votes"
ON votes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow updating anonymous votes to user votes during signup
CREATE POLICY "Allow vote transfer during signup"
ON votes FOR UPDATE
USING (
  browser_fingerprint IS NOT NULL 
  AND user_id IS NULL
)
WITH CHECK (
  auth.uid() = user_id 
  AND browser_fingerprint IS NULL
); 