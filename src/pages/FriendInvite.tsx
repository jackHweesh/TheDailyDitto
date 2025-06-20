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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'self'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Add ref to track if invite has been processed to prevent infinite loops
  const inviteProcessedRef = useRef(false);

  useEffect(() => {
    console.log('🔍 FriendInvite useEffect triggered');
    console.log('🔍 Token:', token);
    console.log('🔍 User:', user ? { id: user.id, email: user.email } : 'null');
    console.log('🔍 inviteProcessedRef.current:', inviteProcessedRef.current);

    // Prevent multiple processing attempts
    if (inviteProcessedRef.current) {
      console.log('🔍 Invite already processed, returning early');
      return;
    }
    inviteProcessedRef.current = true;

    const handleInvite = async () => {
      console.log('🔍 handleInvite function started');
      
      if (!token) {
        console.log('🔍 No token provided, setting error');
        setStatus('error');
        setErrorMessage('Invalid invite link');
        setIsLoading(false);
        return;
      }

      try {
        // If user is not logged in, redirect to auth
        if (!user) {
          console.log('🔍 User not logged in, storing token and redirecting to auth');
          // Store the invite token in localStorage to process after login
          localStorage.setItem('pendingFriendInvite', token);
          navigate('/auth');
          return;
        }

        console.log('🔍 User is logged in, processing invite');
        console.log('🔍 User ID:', user.id);
        console.log('🔍 User email:', user.email);

        // User is logged in, process the invite
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        console.log('🔍 Session retrieved:', !!session);
        console.log('🔍 Access token exists:', !!accessToken);
        console.log('🔍 Access token length:', accessToken?.length || 0);

        const requestBody = {
          token: token,
          recipient_user_id: user.id,
        };
        
        console.log('🔍 Request body:', requestBody);
        console.log('🔍 Making fetch request to accept-friend-invite...');

        const response = await fetch('https://clvtxmkpsmacvhvyhwob.supabase.co/functions/v1/accept-friend-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(requestBody),
        });

        console.log('🔍 Response received');
        console.log('🔍 Response status:', response.status);
        console.log('🔍 Response ok:', response.ok);
        console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));

        // Add timeout protection and better error handling
        if (!response.ok) {
          console.log('🔍 Response not ok, handling error');
          const errorText = await response.text();
          console.log('🔍 Error response text:', errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
            console.log('🔍 Parsed error data:', errorData);
          } catch {
            errorData = { error: 'Invalid response from server' };
            console.log('🔍 Failed to parse error response as JSON');
          }

          // Special handling for self-invite case
          if (errorData.error === 'Cannot invite yourself') {
            console.log('🔍 Self-invite detected, setting status to self');
            setStatus('self');
          } else if (errorData.error && errorData.error.includes('expired')) {
            console.log('🔍 Expired invite detected');
            setStatus('expired');
          } else {
            console.log('🔍 Generic error, setting error status');
            setStatus('error');
            setErrorMessage(errorData.error || 'Failed to accept friend request');
          }
        } else {
          console.log('🔍 Response ok, parsing success data');
          const data = await response.json();
          console.log('🔍 Success data:', data);
          setStatus('success');
          toast({
            title: "Friend request accepted!",
            description: "You are now friends with this user.",
          });
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            console.log('🔍 Redirecting to dashboard');
            navigate('/');
          }, 2000);
        }
      } catch (error: any) {
        console.error('🔍 Friend invite error:', error);
        console.error('🔍 Error name:', error.name);
        console.error('🔍 Error message:', error.message);
        console.error('🔍 Error stack:', error.stack);
        setStatus('error');
        setErrorMessage(error.message || 'An error occurred');
      } finally {
        console.log('🔍 Finally block executed, setting isLoading to false');
        // Always ensure loading state is cleared
        setIsLoading(false);
      }
    };

    // Add timeout protection for the entire operation
    const timeoutId = setTimeout(() => {
      console.log('🔍 Timeout triggered after 30 seconds');
      if (isLoading) {
        setStatus('error');
        setErrorMessage('Request timed out. Please try again.');
        setIsLoading(false);
      }
    }, 30000); // 30 second timeout

    handleInvite();

    return () => {
      console.log('🔍 Cleanup function called');
      clearTimeout(timeoutId);
    };
  }, [token, user, navigate, toast]); // Removed isLoading from dependencies

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