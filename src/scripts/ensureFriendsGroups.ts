const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureFriendsGroups() {
  console.log('Starting Friends group creation check...');
  
  try {
    // 1. Get all users from profiles table
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');
      
    if (usersError) throw usersError;
    
    if (!users || users.length === 0) {
      console.log('No users found in the database.');
      return;
    }
    
    console.log(`Found ${users.length} users. Checking for Friends groups...`);
    
    // 2. Get all existing Friends groups
    const { data: existingGroups, error: groupsError } = await supabase
      .from('groups')
      .select('id, owner_id')
      .eq('name', 'Friends');
      
    if (groupsError) throw groupsError;
    
    // Create a set of user IDs who already have Friends groups
    const usersWithFriendsGroups = new Set(existingGroups?.map(g => g.owner_id) || []);
    
    // 3. Create Friends groups for users who don't have one
    const usersWithoutGroups = users.filter(user => !usersWithFriendsGroups.has(user.id));
    
    if (usersWithoutGroups.length === 0) {
      console.log('All users already have Friends groups.');
      return;
    }
    
    console.log(`Creating Friends groups for ${usersWithoutGroups.length} users...`);
    
    // 4. Create groups in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < usersWithoutGroups.length; i += batchSize) {
      const batch = usersWithoutGroups.slice(i, i + batchSize);
      
      // Create groups for this batch
      const groupPromises = batch.map(async (user) => {
        try {
          // Create the Friends group
          const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .insert({
              name: 'Friends',
              owner_id: user.id,
              created_by: user.id,
              invite_code: nanoid(8) // Still need an invite code for database consistency
            })
            .select()
            .single();
            
          if (groupError) {
            console.error(`Error creating Friends group for user ${user.id}:`, groupError);
            return null;
          }
          
          // Add user as owner of their Friends group
          const { error: memberError } = await supabase
            .from('group_members')
            .insert({
              group_id: groupData.id,
              user_id: user.id,
              status: 'owner'
            });
            
          if (memberError) {
            console.error(`Error adding user ${user.id} as owner of their Friends group:`, memberError);
            return null;
          }
          
          console.log(`Successfully created Friends group for user ${user.id}`);
          return groupData;
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
          return null;
        }
      });
      
      // Wait for all groups in this batch to be created
      const results = await Promise.all(groupPromises);
      const successfulCreations = results.filter(r => r !== null).length;
      console.log(`Created ${successfulCreations} Friends groups in this batch.`);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < usersWithoutGroups.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Finished creating Friends groups.');
    
  } catch (error) {
    console.error('Error in ensureFriendsGroups:', error);
    throw error;
  }
}

// Run the script
ensureFriendsGroups()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 