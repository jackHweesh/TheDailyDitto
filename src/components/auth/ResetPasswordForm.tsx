import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Logo from '../Logo';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ResetPasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  // Get recovery session from URL on mount
  useEffect(() => {
    const handlePasswordReset = async () => {
      setIsCheckingSession(true);
      
      try {
        // Check if we have URL parameters that indicate a password recovery
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        
        const hasRecoveryParams = urlParams.has('access_token') || 
                                 urlParams.has('refresh_token') || 
                                 hashParams.has('access_token') || 
                                 hashParams.has('refresh_token');
        
        if (!hasRecoveryParams) {
          setError('Invalid or expired password reset link');
          setIsValidSession(false);
          return;
        }
        
        // Try to get the current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data.session) {
          setError('Invalid or expired password reset link');
          setIsValidSession(false);
          return;
        }
        
        setIsValidSession(true);
      } catch (err) {
        setError('Invalid or expired password reset link');
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    handlePasswordReset();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Update the password using the AuthContext method
      await updatePassword(password);
      
      toast({
        title: 'Password reset successful',
        description: 'You can now log in with your new password.',
      });
      
      // Redirect to login page immediately
      navigate('/auth');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while resetting your password.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
  if (isCheckingSession) {
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
  if (error && !isValidSession) {
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
    </Card>
  );
};

export default ResetPasswordForm; 