-- First, identify and keep only the oldest Friends group for each user
WITH RankedFriendsGroups AS (
  SELECT 
    id,
    owner_id,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM groups 
  WHERE name = 'Friends'
),
DuplicatesToDelete AS (
  SELECT id 
  FROM RankedFriendsGroups 
  WHERE rn > 1
)
-- Delete group_members entries for duplicate Friends groups
DELETE FROM group_members 
WHERE group_id IN (SELECT id FROM DuplicatesToDelete);

-- Delete the duplicate Friends groups
DELETE FROM groups 
WHERE id IN (SELECT id FROM DuplicatesToDelete);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE groups 
ADD CONSTRAINT unique_friends_group_per_user 
UNIQUE (name, owner_id) 
WHERE name = 'Friends'; 