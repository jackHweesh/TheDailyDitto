// deno-lint-ignore-file
// This file is for Supabase Edge Functions (Deno runtime). Linter errors about imports can be ignored.
// Only affects the new Send Friend Invite feature. No existing UI or logic is changed.

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
    if (inviteError || !invite) throw new Error('Invalid or expired invite token')
    if (invite.status !== 'pending') throw new Error('Invite already used or expired')
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error('Invite has expired')

    // 2. Fetch sender's Friends group
    const { data: senderGroup, error: senderGroupError } = await supabase
      .from('groups')
      .select('id')
      .eq('name', 'Friends')
      .eq('owner_id', invite.from_user_id)
      .single()
    if (senderGroupError || !senderGroup) throw new Error('Sender Friends group not found')

    // 3. Fetch recipient's Friends group
    const { data: recipientGroup, error: recipientGroupError } = await supabase
      .from('groups')
      .select('id')
      .eq('name', 'Friends')
      .eq('owner_id', recipient_user_id)
      .single()
    if (recipientGroupError || !recipientGroup) throw new Error('Recipient Friends group not found')

    // 4. Add each user to the other's Friends group (if not already friends)
    // Check if already friends
    const { data: alreadyFriends } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', invite.from_user_id)
      .eq('friend_id', recipient_user_id)
      .maybeSingle()
    if (!alreadyFriends) {
      // Add recipient to sender's friends
      await supabase.from('friends').insert({ user_id: invite.from_user_id, friend_id: recipient_user_id })
    }
    const { data: alreadyFriends2 } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', recipient_user_id)
      .eq('friend_id', invite.from_user_id)
      .maybeSingle()
    if (!alreadyFriends2) {
      // Add sender to recipient's friends
      await supabase.from('friends').insert({ user_id: recipient_user_id, friend_id: invite.from_user_id })
    }

    // 5. Mark invite as accepted
    await supabase
      .from('friend_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error redeeming friend invite:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 