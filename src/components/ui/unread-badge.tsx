import React from 'react';
import { cn } from '@/lib/utils';

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count, className }) => {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium text-white bg-red-500",
        count > 99 && "min-w-[24px]",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
}; 