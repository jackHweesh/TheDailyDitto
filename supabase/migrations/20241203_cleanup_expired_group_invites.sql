-- Extend the existing cleanup function to also delete expired group invites
create or replace function public.delete_expired_invites()
returns void
language plpgsql
as $$
begin
  -- Delete expired friend invites regardless of status (pending or accepted)
  delete from public.friend_invites
  where expires_at < now();
  
  -- Delete expired group invites regardless of status (pending or accepted)
  delete from public.group_invites
  where expires_at < now();
end;
$$;

-- The existing cron job 'daily-expired-invite-cleanup' will automatically use the updated function
-- No need to reschedule since we're just updating the function it calls 