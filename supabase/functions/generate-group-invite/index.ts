// deno-lint-ignore-file
// This file is for Supabase Edge Functions (Deno runtime). Linter errors about imports can be ignored.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
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

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    const { group_id } = await req.json()
    if (!group_id) {
      throw new Error('Group ID is required')
    }

    // Verify user owns the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', group_id)
      .eq('owner_id', user.id)
      .single()

    if (groupError || !group) {
      throw new Error('Group not found or you do not have permission to invite to this group')
    }

    // Generate a unique token
    const token = generateToken(48)
    const expires_at = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months (180 days)

    // Insert invite into DB
    const { data: invite, error: insertError } = await supabase
      .from('group_invites')
      .insert({
        group_id,
        from_user_id: user.id,
        token,
        expires_at,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Compose invite link
    const inviteLink = `https://thedailyditto.com/invite/group/${token}`

    return new Response(JSON.stringify({ 
      success: true, 
      invite_link: inviteLink,
      token: token,
      expires_at: expires_at,
      group_name: group.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error generating group invite:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 