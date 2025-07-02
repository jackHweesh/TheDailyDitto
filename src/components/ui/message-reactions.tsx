import React, { useState, useRef } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Button } from './button';

const DEFAULT_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '😡'];

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface MessageReactionsProps {
  messageId: string;
  currentUserId: string;
  reactions: MessageReaction[];
  onReact: (emoji: string | null) => void; // null = remove
  emojiOptions?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  currentUserId,
  reactions,
  onReact,
  emojiOptions = DEFAULT_EMOJIS,
  open,
  onOpenChange,
}) => {
  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, MessageReaction[]>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});
  // Find current user's reaction
  const userReaction = reactions.find(r => r.user_id === currentUserId);

  // Only show emojis that have at least one reaction
  const displayedEmojis = Object.keys(grouped);

  return (
    <div className="mt-1 select-none">
      <div className="flex gap-1">
        {displayedEmojis.map(emoji => {
          const count = grouped[emoji].length;
          const reacted = userReaction?.emoji === emoji;
          return (
            <Button
              key={emoji}
              size="sm"
              variant={reacted ? 'default' : 'ghost'}
              className={`px-2 py-1 rounded-full text-lg flex items-center gap-1 ${reacted ? 'border-2 border-alike-teal' : ''}`}
              onClick={() => onReact(reacted ? null : emoji)}
              aria-label={reacted ? `Remove ${emoji} reaction` : `React with ${emoji}`}
            >
              <span>{emoji}</span>
              <span className="text-xs font-semibold">{count}</span>
            </Button>
          );
        })}
        <Popover open={open} onOpenChange={onOpenChange}>
          {/* Hidden trigger for Radix positioning */}
          <PopoverTrigger asChild>
            <button style={{ width: 0, height: 0, padding: 0, border: 0, background: 'transparent' }} aria-hidden="true" tabIndex={-1} />
          </PopoverTrigger>
          <PopoverContent align="center" className="flex gap-2 p-2 w-auto">
            {emojiOptions.map(emoji => (
              <Button
                key={emoji}
                size="sm"
                variant={userReaction?.emoji === emoji ? 'default' : 'ghost'}
                className="text-2xl rounded-full"
                onClick={() => {
                  onOpenChange(false);
                  onReact(userReaction?.emoji === emoji ? null : emoji);
                }}
                aria-label={userReaction?.emoji === emoji ? `Remove ${emoji} reaction` : `React with ${emoji}`}
              >
                {emoji}
              </Button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}; 