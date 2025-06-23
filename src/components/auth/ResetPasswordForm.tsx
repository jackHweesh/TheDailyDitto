import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Logo from '../Logo';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const ResetPasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for valid reset token on mount
  useEffect(() => {
    const checkResetToken = async () => {
      setIsCheckingToken(true);
      const hash = window.location.hash;
      const search = window.location.search;
      
      // If there's no token in the URL, show error
      if (!hash && !search) {
        setError('Invalid or expired password reset link');
        setIsCheckingToken(false);
        return;
      }

      // Extract the access token
      let accessToken = '';
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        accessToken = params.get('access_token') || '';
      } else if (search) {
        const params = new URLSearchParams(search);
        accessToken = params.get('access_token') || '';
      }

      // If no access token found, show error
      if (!accessToken) {
        setError('Invalid or expired password reset link');
        setIsCheckingToken(false);
        return;
      }

      // Validate the token by trying to get user info
      try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        if (error || !user) {
          setError('Invalid or expired password reset link');
          setIsCheckingToken(false);
          return;
        }
        setIsValidToken(true);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Invalid or expired password reset link';
        setError(errorMessage);
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkResetToken();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Get the access token from the URL
      const hash = window.location.hash;
      const search = window.location.search;
      let accessToken = '';
      
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        accessToken = params.get('access_token') || '';
      } else if (search) {
        const params = new URLSearchParams(search);
        accessToken = params.get('access_token') || '';
      }

      if (!accessToken) {
        throw new Error('Invalid or expired password reset link');
      }

      // Update the password using the access token
      const { error } = await supabase.auth.updateUser({ 
        password
      });

      if (error) throw error;

      // Sign out the user after password reset to clear the session
      await supabase.auth.signOut();
      
      setSuccess(true);
      toast({
        title: 'Password reset successful',
        description: 'You can now log in with your new password.',
      });
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while resetting your password.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking token
  if (isCheckingToken) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <Logo />
          <h2 className="text-xl font-semibold text-center text-alike-navy">Verifying reset link...</h2>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Please wait while we verify your password reset link.</p>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && !isValidToken) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <Logo />
          <h2 className="text-xl font-semibold text-center text-alike-navy">Invalid Reset Link</h2>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            onClick={() => navigate('/auth')}
            className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <Logo />
        <h2 className="text-xl font-semibold text-center text-alike-navy">Reset your password</h2>
        <p className="text-sm text-center text-muted-foreground">
          Enter your new password below.
        </p>
      </CardHeader>
      {success ? (
        <CardContent className="text-center text-green-600 font-semibold">
          Password reset! Redirecting to login...
        </CardContent>
      ) : (
        <form onSubmit={handleReset}>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md h-12"
              required
              minLength={6}
              disabled={isLoading}
            />
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <div className="mt-4 text-sm text-center text-muted-foreground">
              <Button
                variant="link"
                onClick={() => navigate('/auth')}
                className="p-0 text-alike-teal"
                disabled={isLoading}
              >
                Back to login
              </Button>
            </div>
          </CardFooter>
        </form>
      )}
    </Card>
  );
};

export default ResetPasswordForm; 