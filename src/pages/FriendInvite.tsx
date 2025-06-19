import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const FriendInvite = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleInvite = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid invite link');
        setIsLoading(false);
        return;
      }

      try {
        // If user is not logged in, redirect to auth
        if (!user) {
          // Store the invite token in localStorage to process after login
          localStorage.setItem('pendingFriendInvite', token);
          navigate('/auth');
          return;
        }

        // User is logged in, process the invite
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

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
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          toast({
            title: "Friend request accepted!",
            description: "You are now friends with this user.",
          });
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Failed to accept friend request');
        }
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    handleInvite();
  }, [token, user, navigate, toast]);

  const handleSignup = () => {
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-auto shadow-lg border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-alike-teal mb-4" />
            <p className="text-lg font-medium text-alike-navy">Processing invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <h1 className="text-2xl font-bold text-alike-navy">Friend Invite</h1>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold text-green-600 mb-2">Success!</h2>
                <p className="text-gray-600">You are now friends with this user.</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
                <p className="text-gray-600">{errorMessage}</p>
                <Button 
                  onClick={() => navigate('/')}
                  className="mt-4 bg-alike-teal hover:bg-alike-teal/90 text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === 'expired' && (
            <>
              <XCircle className="h-16 w-16 text-orange-500 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold text-orange-600 mb-2">Invite Expired</h2>
                <p className="text-gray-600">This friend invite has expired.</p>
                <Button 
                  onClick={() => navigate('/')}
                  className="mt-4 bg-alike-teal hover:bg-alike-teal/90 text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FriendInvite; 