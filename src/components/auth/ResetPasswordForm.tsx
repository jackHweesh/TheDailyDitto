import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Logo from '../Logo';
import { supabase } from '@/integrations/supabase/client';

const ResetPasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Get access token from URL hash or query
  let accessToken = '';
  if (window.location.hash) {
    const params = new URLSearchParams(window.location.hash.replace('#', '?'));
    accessToken = params.get('access_token') || '';
  } else if (window.location.search) {
    const params = new URLSearchParams(window.location.search);
    accessToken = params.get('access_token') || '';
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      // Set the session with the access token so updateUser works
      if (accessToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({
        title: 'Password reset successful',
        description: 'You can now log in with your new password.',
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while resetting your password.');
    } finally {
      setIsLoading(false);
    }
  };

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
                onClick={() => (window.location.href = '/')}
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