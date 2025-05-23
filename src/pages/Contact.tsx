import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { GearIcon } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const Contact: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 flex items-center justify-between">
          <Logo />
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
                <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/how-to-play')}>How to Play</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/contact')}>Contact Us</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/privacy-policy')}>Privacy Policy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/terms-of-service')}>Terms of Service</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative pt-0">
        <Card className="w-full max-w-xl p-8 mt-8 text-center relative">
          <div className="absolute left-4 top-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-xl font-normal"
              aria-label="Back"
            >
              ←
            </Button>
          </div>
          <h1 className="text-2xl font-bold mb-6">Contact Us</h1>
          <p className="text-lg text-alike-navy">
            Need to contact us? <br />
            Email us at theofficialditto@gmail.com
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Contact; 