import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Logo from '../Logo';
import { useAuth } from '@/context/AuthContext';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const { resetPassword } = useAuth();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await resetPassword(email);
      setEmailSent(true);
      toast({
        title: "Password reset email sent",
        description: "If your email exists in our system, you'll receive a password reset link.",
      });
    } catch (error) {
      // Error is already handled in the resetPassword function
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message after email is sent
  if (emailSent) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <Logo />
          <h2 className="text-xl font-semibold text-center text-alike-navy">Check your inbox</h2>
          <p className="text-sm text-center text-muted-foreground">
            We've sent a password reset link to your email address.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Click the link in your email to reset your password. The link will expire in 24 hours.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button 
            onClick={onBackToLogin} 
            className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
          >
            Back to login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <Logo />
        <h2 className="text-xl font-semibold text-center text-alike-navy">Forgot your password?</h2>
        <p className="text-sm text-center text-muted-foreground">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </CardHeader>
      <form onSubmit={handleReset}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md h-12"
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button 
            type="submit" 
            className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send reset link"}
          </Button>
          <div className="mt-4 text-sm text-center text-muted-foreground">
            <Button 
              variant="link" 
              onClick={onBackToLogin} 
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

export default ForgotPasswordForm;
