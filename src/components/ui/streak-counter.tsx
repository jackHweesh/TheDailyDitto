import React from 'react';
import { Flame } from 'lucide-react';

interface StreakCounterProps {
  count: number;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({ count }) => {
  return (
    <div className="flex items-center">
      <Flame className="w-6 h-6 text-alike-teal mr-0.5" />
      <span className="text-lg font-semibold text-alike-teal">
        {count}
      </span>
    </div>
  );
}; 