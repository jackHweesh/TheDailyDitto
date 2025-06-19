// deno-lint-ignore-file
// This file is for Supabase Edge Functions (Deno runtime). Linter errors about imports can be ignored.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { token, recipient_user_id } = await req.json()
    
    // Validate inputs
    if (!token || !recipient_user_id) {
      throw new Error('Missing required fields: token, recipient_user_id')
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recipient_user_id)) {
      throw new Error('Invalid recipient user ID format')
    }

    // 1. Fetch the invite with better error handling
    const { data: invite, error: inviteError } = await supabase
      .from('friend_invites')
      .select('*')
      .eq('token', token)
      .single()
    
    if (inviteError) {
      if (inviteError.code === 'PGRST116') {
        throw new Error('Invalid or expired invite token')
      }
      throw new Error('Database error while fetching invite')
    }
    
    if (!invite) {
      throw new Error('Invalid or expired invite token')
    }
    
    if (invite.status !== 'pending') {
      throw new Error('Invite already used or expired')
    }
    
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new Error('Invite has expired')
    }
    
    if (invite.from_user_id === recipient_user_id) {
      throw new Error('Cannot invite yourself')
    }

    // 2. Validate that both users exist
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', invite.from_user_id)
      .single()
    
    if (senderError || !senderProfile) {
      throw new Error('Sender profile not found')
    }
    
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipient_user_id)
      .single()
    
    if (recipientError || !recipientProfile) {
      throw new Error('Recipient profile not found')
    }

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
    
    if (alreadyFriends1 || alreadyFriends2) {
      // Already friends, just mark invite as accepted
      await supabase
        .from('friend_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id)
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already friends with this user' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Create friendships atomically using a transaction-like approach
    // First, try to create both friendship records
    const { error: friend1Error } = await supabase
      .from('friends')
      .insert({ user_id: invite.from_user_id, friend_id: recipient_user_id })
    
    if (friend1Error) {
      // Check if it's a duplicate key error (race condition)
      if (friend1Error.code === '23505') {
        // Friendship already exists, continue
      } else {
        throw new Error('Failed to create friendship: ' + friend1Error.message)
      }
    }

    const { error: friend2Error } = await supabase
      .from('friends')
      .insert({ user_id: recipient_user_id, friend_id: invite.from_user_id })
    
    if (friend2Error) {
      // If second friendship fails, we need to clean up the first one
      if (friend2Error.code !== '23505') {
        // Only delete if it wasn't a duplicate key error
        await supabase
          .from('friends')
          .delete()
          .eq('user_id', invite.from_user_id)
          .eq('friend_id', recipient_user_id)
        
        throw new Error('Failed to create reciprocal friendship: ' + friend2Error.message)
      }
    }

    // 5. Mark invite as accepted
    await supabase
      .from('friend_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Friend request accepted successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error accepting friend invite:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 