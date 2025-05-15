-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by all users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies with proper permissions
CREATE POLICY "Profiles are viewable by all users"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
ON profiles FOR DELETE
USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create the function that will handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    gender,
    age,
    country,
    state,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'first_name')::text, ''),
    (new.raw_user_meta_data->>'last_name')::text,
    (new.raw_user_meta_data->>'gender')::text,
    (new.raw_user_meta_data->>'age')::int,
    (new.raw_user_meta_data->>'country')::text,
    (new.raw_user_meta_data->>'state')::text,
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 