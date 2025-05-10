
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Logo from '../Logo';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // This would connect to Supabase in a real implementation
    toast({
      title: "Login attempt",
      description: "In the full app, this would connect to Supabase authentication.",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <Logo />
        <p className="text-sm text-center text-muted-foreground mt-4">
          Sign in to this platform<br/>to see what others think, share your opinion, and interact
        </p>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md h-12"
                required
              />
            </div>
            <Button 
              type="button" 
              variant="link" 
              className="text-xs text-right w-full p-0 h-auto text-muted-foreground"
              onClick={onForgotPassword}
            >
              Forgot your password?
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button 
            type="submit" 
            className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
          >
            Log In
          </Button>
          <div className="mt-4 text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Button variant="link" onClick={onSwitchToSignup} className="p-0 text-alike-teal">
              Sign up
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;
