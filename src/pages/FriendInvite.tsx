import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const FriendInvite = () => {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'self' | 'already_friends'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const inviteProcessedRef = useRef(false);

  useEffect(() => {
    const handleInvite = async () => {
      if (inviteProcessedRef.current) return;
      inviteProcessedRef.current = true;
      
      console.log('🔍 handleInvite function started');
      
      if (!token) {
        console.log('🔍 No token provided, setting error');
        setStatus('error');
        setErrorMessage('Invalid invite link');
        setIsLoading(false);
        return;
      }

      try {
        if (!user) {
          console.log('🔍 User not logged in, storing token and redirecting to auth');
          localStorage.setItem('pendingFriendInvite', token);
          navigate('/auth');
          setIsLoading(false);
          return;
        }

        console.log('🔍 User is logged in, processing invite...');
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        const response = await fetch('https://clvtxmkpsmacvhvyhwob.functions.supabase.co/functions/v1/accept-friend-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ token, recipient_user_id: user.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.error === 'Cannot invite yourself') {
            setStatus('self');
          } else if (errorData.error === 'Already friends with this user') {
            setStatus('already_friends');
          } else if (errorData.error?.includes('expired')) {
            setStatus('expired');
          } else {
            setStatus('error');
            setErrorMessage(errorData.error || 'Failed to accept friend request');
          }
        } else {
          setStatus('success');
          toast({
            title: "Friend request accepted!",
            description: "You are now friends with this user.",
          });
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (error: any) {
        console.error('🔍 Friend invite fetch error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAuthLoading) {
      handleInvite();
    }
  }, [isAuthLoading, user, token, navigate, toast]);

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
        <CardContent className="flex flex-col items-center space-y-4 py-6">
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <h2 className="text-xl font-semibold text-green-600 mb-2">Success!</h2>
                <p className="text-gray-600">You are now friends with this user.</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
              </div>
            </>
          )}

          {status === 'self' && (
            <>
              <ArrowRight className="h-16 w-16 text-alike-teal" />
              <div className="text-center">
                <h2 className="text-xl font-semibold text-alike-teal mb-2">This is your invite link</h2>
                <p className="text-gray-600">Share this link with friends you want to invite to Ditto!</p>
                <Button 
                  onClick={() => navigate('/')}
                  className="mt-4 bg-alike-teal hover:bg-alike-teal/90 text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === 'already_friends' && (
            <>
              <CheckCircle className="h-16 w-16 text-alike-teal" />
              <div className="text-center">
                <h2 className="text-xl font-semibold text-alike-teal mb-2">Already Friends</h2>
                <p className="text-gray-600">You are already friends with this user.</p>
                <Button 
                  onClick={() => navigate('/')}
                  className="mt-4 bg-alike-teal hover:bg-alike-teal/90 text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <div className="text-center">
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
              <XCircle className="h-16 w-16 text-orange-500" />
              <div className="text-center">
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