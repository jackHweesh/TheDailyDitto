// deno-lint-ignore-file
// This file is for Supabase Edge Functions (Deno runtime). Linter errors about imports can be ignored.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔍 accept-friend-invite function called');
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request URL:', req.url);
  console.log('🔍 Request headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    console.log('🔍 OPTIONS request, returning CORS headers');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Creating Supabase client');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Parsing request body');
    const requestBody = await req.json();
    console.log('🔍 Request body:', requestBody);
    
    const { token, recipient_user_id } = requestBody;
    
    console.log('🔍 Extracted token:', token);
    console.log('🔍 Extracted recipient_user_id:', recipient_user_id);
    
    // Validate inputs
    if (!token || !recipient_user_id) {
      console.log('🔍 Missing required fields');
      throw new Error('Missing required fields: token, recipient_user_id')
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recipient_user_id)) {
      console.log('🔍 Invalid UUID format for recipient_user_id');
      throw new Error('Invalid recipient user ID format')
    }

    console.log('🔍 Step 1: Fetching invite from database');
    // 1. Fetch the invite with better error handling
    const { data: invite, error: inviteError } = await supabase
      .from('friend_invites')
      .select('*')
      .eq('token', token)
      .single()
    
    console.log('🔍 Invite query result - data:', invite);
    console.log('🔍 Invite query result - error:', inviteError);
    
    if (inviteError) {
      console.log('🔍 Invite error code:', inviteError.code);
      if (inviteError.code === 'PGRST116') {
        throw new Error('Invalid or expired invite token')
      }
      throw new Error('Database error while fetching invite')
    }
    
    if (!invite) {
      console.log('🔍 No invite found');
      throw new Error('Invalid or expired invite token')
    }
    
    console.log('🔍 Invite found:', {
      id: invite.id,
      from_user_id: invite.from_user_id,
      status: invite.status,
      expires_at: invite.expires_at
    });
    
    if (invite.status !== 'pending') {
      console.log('🔍 Invite status is not pending:', invite.status);
      throw new Error('Invite already used or expired')
    }
    
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      console.log('🔍 Invite has expired');
      throw new Error('Invite has expired')
    }
    
    if (invite.from_user_id === recipient_user_id) {
      console.log('🔍 Self-invite detected');
      throw new Error('Cannot invite yourself')
    }

    console.log('🔍 Step 2: Validating user profiles exist');
    // 2. Validate that both users exist
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', invite.from_user_id)
      .single()
    
    console.log('🔍 Sender profile query - data:', senderProfile);
    console.log('🔍 Sender profile query - error:', senderError);
    
    if (senderError || !senderProfile) {
      console.log('🔍 Sender profile not found');
      throw new Error('Sender profile not found')
    }
    
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipient_user_id)
      .single()
    
    console.log('🔍 Recipient profile query - data:', recipientProfile);
    console.log('🔍 Recipient profile query - error:', recipientError);
    
    if (recipientError || !recipientProfile) {
      console.log('🔍 Recipient profile not found');
      throw new Error('Recipient profile not found')
    }

    console.log('🔍 Step 3: Checking if already friends');
    // 3. Check if already friends (both directions)
    const { data: alreadyFriends1 } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', invite.from_user_id)
      .eq('friend_id', recipient_user_id)
      .maybeSingle()
    
    const { data: alreadyFriends2 } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', recipient_user_id)
      .eq('friend_id', invite.from_user_id)
      .maybeSingle()
    
    console.log('🔍 Already friends check 1:', alreadyFriends1);
    console.log('🔍 Already friends check 2:', alreadyFriends2);
    
    if (alreadyFriends1 || alreadyFriends2) {
      console.log('🔍 Users are already friends, marking invite as accepted');
      // Already friends, just mark invite as accepted
      const { error: updateError } = await supabase
        .from('friend_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id)
      
      console.log('🔍 Update invite status error:', updateError);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already friends with this user' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('🔍 Step 4: Creating friendships');
    // 4. Create friendships atomically using a transaction-like approach
    // First, try to create both friendship records
    const { error: friend1Error } = await supabase
      .from('friends')
      .insert({ user_id: invite.from_user_id, friend_id: recipient_user_id })
    
    console.log('🔍 First friendship creation error:', friend1Error);
    
    if (friend1Error) {
      // Check if it's a duplicate key error (race condition)
      if (friend1Error.code === '23505') {
        console.log('🔍 First friendship already exists (duplicate key)');
        // Friendship already exists, continue
      } else {
        console.log('🔍 First friendship creation failed:', friend1Error.message);
        throw new Error('Failed to create friendship: ' + friend1Error.message)
      }
    }

    const { error: friend2Error } = await supabase
      .from('friends')
      .insert({ user_id: recipient_user_id, friend_id: invite.from_user_id })
    
    console.log('🔍 Second friendship creation error:', friend2Error);
    
    if (friend2Error) {
      // If second friendship fails, we need to clean up the first one
      if (friend2Error.code !== '23505') {
        console.log('🔍 Second friendship failed, cleaning up first friendship');
        // Only delete if it wasn't a duplicate key error
        const { error: cleanupError } = await supabase
          .from('friends')
          .delete()
          .eq('user_id', invite.from_user_id)
          .eq('friend_id', recipient_user_id)
        
        console.log('🔍 Cleanup error:', cleanupError);
        
        throw new Error('Failed to create reciprocal friendship: ' + friend2Error.message)
      } else {
        console.log('🔍 Second friendship already exists (duplicate key)');
      }
    }

    console.log('🔍 Step 5: Marking invite as accepted');
    // 5. Mark invite as accepted
    const { error: finalUpdateError } = await supabase
      .from('friend_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    console.log('🔍 Final update error:', finalUpdateError);

    console.log('🔍 Success! Returning success response');
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Friend request accepted successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('🔍 Error in accept-friend-invite function:', error);
    console.error('🔍 Error name:', error.name);
    console.error('🔍 Error message:', error.message);
    console.error('🔍 Error stack:', error.stack);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 