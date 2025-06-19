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
    if (!token || !recipient_user_id) {
      throw new Error('Missing required fields: token, recipient_user_id')
    }

    // 1. Fetch the invite
    const { data: invite, error: inviteError } = await supabase
      .from('friend_invites')
      .select('*')
      .eq('token', token)
      .single()

    // Handle various invite states
    if (inviteError || !invite) {
      return new Response(JSON.stringify({ 
        error: 'Invalid invite token',
        code: 'INVALID_TOKEN'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (invite.status !== 'pending') {
      return new Response(JSON.stringify({ 
        error: 'Invite already used',
        code: 'ALREADY_USED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        error: 'Invite has expired',
        code: 'EXPIRED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (invite.from_user_id === recipient_user_id) {
      // Silently succeed if user clicks their own invite
      return new Response(JSON.stringify({ 
        success: true,
        code: 'SELF_INVITE'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Check if already friends
    const { data: alreadyFriends } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', invite.from_user_id)
      .eq('friend_id', recipient_user_id)
      .maybeSingle()
    
    if (alreadyFriends) {
      // Mark invite as accepted and return success
      await supabase
        .from('friend_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id)
      
      return new Response(JSON.stringify({ 
        success: true,
        code: 'ALREADY_FRIENDS'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Add each user to the other's friends list
    const { error: friend1Error } = await supabase
      .from('friends')
      .insert({ user_id: invite.from_user_id, friend_id: recipient_user_id })
    if (friend1Error) throw friend1Error

    const { error: friend2Error } = await supabase
      .from('friends')
      .insert({ user_id: recipient_user_id, friend_id: invite.from_user_id })
    if (friend2Error) throw friend2Error

    // 4. Mark invite as accepted
    await supabase
      .from('friend_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return new Response(JSON.stringify({ 
      success: true,
      code: 'FRIEND_ADDED'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error accepting friend invite:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      code: 'UNKNOWN_ERROR'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 