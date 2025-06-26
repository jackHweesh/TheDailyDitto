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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  // Check if we have a valid recovery session on mount and listen for PASSWORD_RECOVERY events
  useEffect(() => {
    const checkRecoverySession = async () => {
      setIsCheckingSession(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          setError('Invalid or expired password reset link');
          setIsValidSession(false);
          return;
        }
        
        // Check if this is a recovery session
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          setError('Invalid or expired password reset link');
          setIsValidSession(false);
          return;
        }
        
        setIsValidSession(true);
      } catch (err) {
        console.error('Session validation error:', err);
        setError('Invalid or expired password reset link');
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkRecoverySession();

    // Listen for PASSWORD_RECOVERY events locally
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setIsCheckingSession(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await updatePassword(password);
      
      toast({
        title: 'Password reset successful',
        description: 'You can now log in with your new password.',
      });
      
      // Redirect to login page
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
          <div className="space-y-2">
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
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-md h-12"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
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