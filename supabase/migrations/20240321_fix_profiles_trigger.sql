-- Create a function to handle new user profiles
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