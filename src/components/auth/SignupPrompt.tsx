import React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Logo from '../Logo';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { GearIcon } from '@/components/ui/button';

const SignupPrompt: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            aria-label="Go to home"
          >
            <Logo />
          </button>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Settings"
                  className="text-gray-500 hover:text-gray-700 text-2xl h-8 w-8"
                >
                  <GearIcon className="w-full h-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/how-to-play')}>How to Play</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/contact')}>Contact Us</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/privacy-policy')}>Privacy Policy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/terms-of-service')}>Terms of Service</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/auth')}>Log in</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-md mx-auto shadow-lg border-0">
          <CardHeader className="space-y-1 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-center text-alike-navy mt-6">
              Want to see who thinks just like you?
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-alike-navy">
              View individuals' answers. Track your match percentage. Chat with groups.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              onClick={() => navigate('/auth', { state: { view: 'signup' } })}
              className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
            >
              Create a Free Account
            </Button>
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => navigate('/auth', { state: { view: 'login' } })}
                className="text-alike-teal"
              >
                Already Registered? Log In
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SignupPrompt; 