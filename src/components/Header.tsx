import React from 'react';
import Logo from '@/components/Logo';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button, GearIcon } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  hasVoted: boolean;
  onLogoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ hasVoted, onLogoClick }) => {
  const navigate = useNavigate();
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => { if (hasVoted) onLogoClick(); }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: hasVoted ? 'pointer' : 'default' }}
          aria-label="Go to global results"
          tabIndex={hasVoted ? 0 : -1}
          disabled={!hasVoted}
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
  );
};

export default Header; 