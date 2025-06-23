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
      .from('group_invites')
      .select('*')
      .eq('token', token)
      .single()
    if (inviteError || !invite) throw new Error('Invalid or expired invite token')
    if (invite.status !== 'pending') throw new Error('Invite already used or expired')
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error('Invite has expired')

    // 2. Fetch the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, owner_id')
      .eq('id', invite.group_id)
      .single()
    if (groupError || !group) throw new Error('Group not found')

    // 3. Check if user is already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id, status')
      .eq('group_id', group.id)
      .eq('user_id', recipient_user_id)
      .maybeSingle()

    if (existingMember) {
      if (existingMember.status === 'pending') {
        throw new Error('Request to join this group is already pending')
      } else {
        throw new Error('You are already a member of this group')
      }
    }

    // 4. Add user to group with appropriate status
    const status = group.owner_id === recipient_user_id ? 'owner' : 'pending'
    const { error: joinError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: recipient_user_id,
        status
      })

    if (joinError) throw joinError

    // 5. Mark invite as accepted
    await supabase
      .from('group_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return new Response(JSON.stringify({ 
      success: true, 
      group_name: group.name,
      status: status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error accepting group invite:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 