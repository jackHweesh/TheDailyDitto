// deno-lint-ignore-file
// This file is for Supabase Edge Functions (Deno runtime). Linter errors about imports can be ignored.
// Only affects the new Send Friend Invite feature. No existing UI or logic is changed.
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

    const { from_user_id, to_email, sender_name } = await req.json()
    if (!from_user_id || !to_email || !sender_name) {
      throw new Error('Missing required fields: from_user_id, to_email, sender_name')
    }

    // Check for existing pending invite (optional: allow multiple)
    // Generate a unique token
    const token = generateToken(48)
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    // Insert invite into DB
    const { error: insertError } = await supabase.from('friend_invites').insert({
      from_user_id,
      to_email,
      token,
      expires_at,
      status: 'pending',
    })
    if (insertError) throw insertError

    // Compose invite link
    const inviteLink = `https://thedailyditto.com/friend-invite/${token}`
    const subject = `${sender_name} has sent you a friend request on Ditto!`
    const html = `<p>${sender_name} has sent you a friend request on Ditto!<br><br><a href="${inviteLink}">Click here to accept</a></p>`

    // Call the send-email Edge Function
    const emailRes = await fetch(Deno.env.get('SUPABASE_FUNCTIONS_URL') + '/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.get('Authorization') || '' },
      body: JSON.stringify({ to: to_email, subject, html })
    })
    if (!emailRes.ok) {
      const err = await emailRes.text()
      throw new Error('Failed to send invite email: ' + err)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error sending friend invite:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}) 