import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const FriendInvite = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const processInvite = async () => {
      // If no token, go home
      if (!token) {
        navigate('/');
        return;
      }

      // If not logged in, save token and go to auth
      if (!user) {
        localStorage.setItem('pendingFriendInvite', token);
        navigate('/auth');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        // Set a timeout for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch('https://clvtxmkpsmacvhvyhwob.supabase.co/functions/v1/accept-friend-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            token: token,
            recipient_user_id: user.id,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Only proceed if component is still mounted
        if (mounted) {
          // Always navigate home, regardless of response
          navigate('/');
        }
      } catch (error) {
        // If component is still mounted, navigate home
        if (mounted) {
          navigate('/');
        }
      }
    };

    processInvite();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [token, user, navigate]);

  // Return null - no loading state needed
  return null;
};

export default FriendInvite; 