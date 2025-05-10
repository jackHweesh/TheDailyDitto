
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Logo from '../Logo';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-alike-navy text-white">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <Logo />
        <h1 className="text-2xl font-bold mt-6">Join into a new<br/>way to share opinions</h1>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm opacity-80">
          Each day, a new question awaits your input. Your opinion matters and shapes how people understand each other.
          Join groups, see how friends think, and discuss your viewpoints in real-time.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col">
        <Button 
          onClick={onStart}
          className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
        >
          Let's Go!
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WelcomeScreen;
