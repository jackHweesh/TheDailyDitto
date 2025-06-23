import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const GroupInvite = () => {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'already_member' | 'pending'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [groupName, setGroupName] = useState('');
  
  const inviteProcessedRef = useRef(false);

  useEffect(() => {
    const handleInvite = async () => {
      if (inviteProcessedRef.current) return;
      inviteProcessedRef.current = true;
      
      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid invite link');
        setIsLoading(false);
        return;
      }

      try {
        if (!user) {
          localStorage.setItem('pendingGroupInvite', token);
          navigate('/auth');
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        const response = await fetch('https://clvtxmkpsmacvhvyhwob.functions.supabase.co/functions/v1/accept-group-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ token, recipient_user_id: user.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.error?.includes('already a member')) {
            setStatus('already_member');
            setGroupName(errorData.group_name || 'this group');
          } else if (errorData.error?.includes('pending')) {
            setStatus('pending');
            setGroupName(errorData.group_name || 'this group');
          } else if (errorData.error?.includes('expired')) {
            setStatus('expired');
          } else {
            setStatus('error');
            setErrorMessage(errorData.error || 'Failed to accept group invite');
          }
        } else {
          const data = await response.json();
          setStatus('success');
          setGroupName(data.group_name);
          toast({
            title: "Group invite accepted!",
            description: `You have successfully joined "${data.group_name}"`,
          });
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (error: any) {
        console.error('Group invite error:', error);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-auto shadow-lg border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-alike-teal mb-4" />
            <p className="text-lg font-medium text-alike-navy">Processing group invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <h1 className="text-2xl font-bold text-alike-navy">Group Invite</h1>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 py-6">
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <h2 className="text-xl font-semibold text-green-600 mb-2">Success!</h2>
                <p className="text-gray-600">You have successfully joined "{groupName}".</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
              </div>
            </>
          )}

          {status === 'already_member' && (
            <>
              <CheckCircle className="h-16 w-16 text-alike-teal" />
              <div className="text-center">
                <h2 className="text-xl font-semibold text-alike-teal mb-2">Already a Member</h2>
                <p className="text-gray-600">You are already a member of {groupName}.</p>
                <Button 
                  onClick={() => navigate('/')}
                  className="mt-4 bg-alike-teal hover:bg-alike-teal/90 text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <Loader2 className="h-16 w-16 text-orange-500" />
              <div className="text-center">
                <h2 className="text-xl font-semibold text-orange-600 mb-2">Request Pending</h2>
                <p className="text-gray-600">Your request to join {groupName} is pending approval from the group owner.</p>
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
                <p className="text-gray-600">This group invite has expired.</p>
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

export default GroupInvite; 