-- Create a function to delete old chat messages
CREATE OR REPLACE FUNCTION public.delete_old_chat_messages()
RETURNS void AS $$
BEGIN
  -- Delete messages older than 72 hours
  DELETE FROM public.chat_messages
  WHERE created_at < NOW() - INTERVAL '72 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to run the function every hour
SELECT cron.schedule(
  'delete-old-chat-messages',  -- job name
  '0 * * * *',                -- every hour at minute 0
  $$SELECT public.delete_old_chat_messages()$$
); 