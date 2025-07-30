-- This migration will be run after the group_invites table is created
-- It ensures all existing groups have at least one invite link available

-- Create a function to generate invite links for existing groups
CREATE OR REPLACE FUNCTION migrate_existing_groups_to_invite_links()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    group_record RECORD;
    token_text TEXT;
    expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Loop through all existing groups
    FOR group_record IN 
        SELECT id, owner_id 
        FROM groups 
        WHERE name != 'Friends' -- Skip Friends groups as they use friend invites
    LOOP
        -- Generate a unique token
        token_text := encode(gen_random_bytes(24), 'base64');
        token_text := replace(token_text, '/', '_');
        token_text := replace(token_text, '+', '-');
        token_text := substr(token_text, 1, 32);
        
        -- Set expiration to 6 months from now
        expires_at := NOW() + INTERVAL '6 months';
        
        -- Insert invite record
        INSERT INTO group_invites (group_id, from_user_id, token, expires_at, status)
        VALUES (group_record.id, group_record.owner_id, token_text, expires_at, 'pending')
        ON CONFLICT DO NOTHING; -- Prevent duplicates
    END LOOP;
END;
$$;

-- Execute the migration
SELECT migrate_existing_groups_to_invite_links();

-- Clean up the function
DROP FUNCTION migrate_existing_groups_to_invite_links(); 