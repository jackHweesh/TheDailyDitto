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
      localStorage.setItem('pendingFriendInvite', token);
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
      
      // Always redirect to home, regardless of success/failure
      navigate('/');
    };

    processInvite();
  }, [token, user, navigate]);

  // No loading state needed - just show nothing while processing
  return null;
};

export default FriendInvite; 