-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for inserting profiles (users can only insert their own profile)
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- Policy for selecting profiles (profiles are readable by all authenticated users)
CREATE POLICY "Profiles are viewable by all users"
ON profiles FOR SELECT
USING (true);

-- Policy for updating profiles (users can only update their own profile)
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for deleting profiles (users can only delete their own profile)
CREATE POLICY "Users can delete their own profile"
ON profiles FOR DELETE
USING (auth.uid() = id); 