import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const FriendInvite = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If no token, redirect to home
    if (!token) {
      navigate('/');
      return;
    }

    // If user is not logged in, save token and redirect to auth
    if (!user) {
      // Store both token and timestamp
      localStorage.setItem('pendingFriendInvite', JSON.stringify({
        token,
        timestamp: Date.now().toString()
      }));
      navigate('/auth');
      return;
    }

    // Process the invite and redirect
    const processInvite = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        await fetch('https://clvtxmkpsmacvhvyhwob.supabase.co/functions/v1/accept-friend-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            token: token,
            recipient_user_id: user.id,
          }),
        });
      } catch (error) {
        console.error('Error processing invite:', error);
      }

      // Always navigate to home after processing (or if error)
      navigate('/', { replace: true });
    };

    // Set a timeout to ensure we don't get stuck
    const timeoutId = setTimeout(() => {
      navigate('/', { replace: true });
    }, 5000); // 5 second maximum processing time

    // Process the invite
    processInvite();

    // Clean up timeout if we navigate away
    return () => clearTimeout(timeoutId);
  }, [token, user, navigate]);

  // Return null - no need to show anything during the brief processing time
  return null;
};

export default FriendInvite; 