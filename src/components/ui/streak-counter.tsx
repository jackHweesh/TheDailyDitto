import React from 'react';
import { Flame } from 'lucide-react';

interface StreakCounterProps {
  count: number;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({ count }) => {
  return (
    <div className="relative flex items-center">
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 blur-sm">
          <Flame className="w-6 h-6 text-alike-navy/30" />
        </div>
        {/* Main flame */}
        <Flame className="w-6 h-6 text-alike-teal relative z-10" />
        {/* Streak count */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <span className="text-xs font-semibold text-white">
            {count}
          </span>
        </div>
      </div>
    </div>
  );
}; 