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
  userProfiles?: Record<string, string>; // Add user profiles prop
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  currentUserId,
  reactions,
  onReact,
  emojiOptions = DEFAULT_EMOJIS,
  open,
  onOpenChange,
  userProfiles = {},
}) => {
  const [longPressEmoji, setLongPressEmoji] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleLongPressStart = (emoji: string) => {
    console.log('Long press start for emoji:', emoji); // Debug
    longPressTimerRef.current = setTimeout(() => {
      console.log('Long press triggered for emoji:', emoji); // Debug
      setLongPressEmoji(emoji);
    }, 500);
  };

  const handleLongPressEnd = () => {
    console.log('Long press end'); // Debug
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (emoji: string, reacted: boolean) => {
    console.log('Click for emoji:', emoji); // Debug
    // Clear any pending long press
    handleLongPressEnd();
    // Handle the click
    onReact(reacted ? null : emoji);
  };

  return (
    <div className="mt-1 select-none">
      <div className="flex gap-1">
        {displayedEmojis.map(emoji => {
          const count = grouped[emoji].length;
          const reacted = userReaction?.emoji === emoji;
          
          return (
            <div key={emoji} className="relative">
              <Popover open={longPressEmoji === emoji} onOpenChange={(open) => !open && setLongPressEmoji(null)}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant={reacted ? 'default' : 'ghost'}
                    className={`px-2 py-1 rounded-full text-lg flex items-center gap-1 ${reacted ? 'border-2 border-alike-teal' : ''}`}
                    onClick={() => handleClick(emoji, reacted)}
                    onMouseDown={() => handleLongPressStart(emoji)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(emoji)}
                    onTouchEnd={handleLongPressEnd}
                    aria-label={reacted ? `Remove ${emoji} reaction` : `React with ${emoji}`}
                  >
                    <span>{emoji}</span>
                    <span className="text-xs font-semibold">{count}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  align="center" 
                  className="p-2 w-auto max-w-xs"
                  side="top"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {emoji} reactions:
                    </p>
                    {grouped[emoji]?.map((reaction) => {
                      const userName = userProfiles[reaction.user_id] || 'Unknown User';
                      if (!userProfiles[reaction.user_id]) {
                        console.log('Missing user profile for ID:', reaction.user_id, 'Available profiles:', Object.keys(userProfiles));
                      }
                      return (
                        <div key={reaction.id} className="text-sm">
                          {userName}
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
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