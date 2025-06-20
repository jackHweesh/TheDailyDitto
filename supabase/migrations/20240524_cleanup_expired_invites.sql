-- Step 1: Create the function to delete expired invites (both pending and accepted)
create or replace function public.delete_expired_invites()
returns void
language plpgsql
as $$
begin
  -- Delete expired invites regardless of status (pending or accepted)
  delete from public.friend_invites
  where expires_at < now();
end;
$$;

-- Step 2: Schedule the function to run daily
-- Using pg_cron, which is available in Supabase.
-- This schedules the job to run once every day at midnight UTC.
select cron.schedule(
  'daily-expired-invite-cleanup', -- name for the cron job
  '0 0 * * *', -- cron pattern for midnight daily
  $$select public.delete_expired_invites()$$
); 