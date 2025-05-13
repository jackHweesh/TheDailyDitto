
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import Logo from '../Logo';
import { useAuth } from '@/context/AuthContext';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [state, setState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { signUp } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (parseInt(age) <= 0 || parseInt(age) > 120) {
        throw new Error('Please enter a valid age');
      }

      const userData = {
        first_name: firstName,
        last_name: lastName,
        gender,
        age: parseInt(age),
        state
      };

      await signUp(email, password, userData);
      toast({
        title: "Sign-up successful",
        description: "Welcome to Alike! Please check your email to confirm your account.",
      });
      onSwitchToLogin();
    } catch (error: any) {
      toast({
        title: "Sign-up error",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
    'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <Logo />
        <h2 className="text-xl font-semibold text-center text-alike-navy">Create An Account</h2>
      </CardHeader>
      <form onSubmit={handleSignup}>
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
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md h-12"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-md h-12"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-md h-12"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Select value={gender} onValueChange={setGender} disabled={isLoading}>
                <SelectTrigger className="rounded-md h-12">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="rounded-md h-12"
                required
                disabled={isLoading}
                min={1}
                max={120}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Select value={state} onValueChange={setState} disabled={isLoading}>
              <SelectTrigger className="rounded-md h-12">
                <SelectValue placeholder="US State" />
              </SelectTrigger>
              <SelectContent>
                {usStates.map((state) => (
                  <SelectItem key={state} value={state.toLowerCase()}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button 
            type="submit" 
            className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
            disabled={isLoading}
          >
            {isLoading ? "Signing up..." : "Sign up"}
          </Button>
          <div className="mt-4 text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Button 
              variant="link" 
              onClick={onSwitchToLogin} 
              className="p-0 text-alike-teal"
              disabled={isLoading}
            >
              Log in
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignupForm;
