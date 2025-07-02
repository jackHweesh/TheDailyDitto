import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Share2, Copy, ArrowLeft } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { MessageReactions, MessageReaction } from '@/components/ui/message-reactions';

interface Message {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  user_name?: string;
}

interface ChatViewProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

function useLongPress(callback: () => void, ms = 500) {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const start = useCallback(() => {
    timeout.current = setTimeout(callback, ms);
  }, [callback, ms]);
  const clear = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);
  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); callback(); },
  };
}

const MessageBubble: React.FC<{
  isCurrentUser: boolean;
  children: React.ReactNode;
  onLongPress: () => void;
}> = ({ isCurrentUser, children, onLongPress }) => {
  const longPressHandlers = useLongPress(onLongPress, 500);
  return (
    <div
      className={`max-w-[80%] rounded-lg p-3 ${
        isCurrentUser
          ? 'bg-alike-teal text-white rounded-br-none'
          : 'bg-muted rounded-bl-none'
      }`}
      tabIndex={0}
      aria-label="Chat message"
      {...longPressHandlers}
    >
      {children}
    </div>
  );
};

const ChatView: React.FC<ChatViewProps> = ({ groupId, groupName, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { markGroupAsVisited, setCurrentGroup } = useUnreadCount();
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch chat messages
    const fetchMessages = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        if (data) {
          setMessages(data);
          
          // Collect unique user IDs
          const userIds = [...new Set(data.map(message => message.user_id))];
          await fetchUserProfiles(userIds);
        }
      } catch (error: any) {
        toast({
          title: "Error loading messages",
          description: error.message || "Could not load chat messages",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    
    // Set up real-time subscription to new messages
    const channel = supabase
      .channel('chat-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prevMessages => [...prevMessages, newMessage]);
          
          // If this is a new user, fetch their profile
          if (!userProfiles[newMessage.user_id]) {
            await fetchUserProfiles([newMessage.user_id]);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, toast]);

  // Mark group as read when entering chat
  useEffect(() => {
    if (groupId && user) {
      console.log(`ChatView: Entering chat for group ${groupId}, marking as read`);
      setCurrentGroup(groupId);
      markGroupAsVisited(groupId);
    }
  }, [groupId, user, markGroupAsVisited, setCurrentGroup]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const fetchUserProfiles = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      if (error) throw error;
      
      if (data) {
        console.log('Fetched profiles:', data); // Debug log
        const profiles: Record<string, string> = {};
        data.forEach(profile => {
          let fullName = ((profile.first_name || '') + (profile.last_name ? ` ${profile.last_name}` : '')).trim();
          profiles[profile.id] = fullName || 'Unknown User';
        });
        setUserProfiles(prevProfiles => ({
          ...prevProfiles,
          ...profiles
        }));
      }
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || isSending) return;
    
    setIsSending(true);
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message: newMessage.trim()
        });
        
      if (error) throw error;
      
      setNewMessage('');
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message || "Could not send your message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };
  
  const handleBack = () => {
    if (user && groupId) {
      markGroupAsVisited(groupId);
    }
    onBack();
  };

  // Fetch reactions for visible messages
  useEffect(() => {
    const fetchReactions = async () => {
      if (!messages.length) return;
      const messageIds = messages.map(m => m.id);
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);
      if (!error && data) setReactions(data);
    };
    fetchReactions();
  }, [messages]);

  // Real-time subscription for reactions
  useEffect(() => {
    const channel = supabase
      .channel('message-reactions-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, payload => {
        setReactions(prev => {
          if (payload.eventType === 'INSERT') {
            const newR = payload.new as MessageReaction;
            return [
              ...prev.filter(r => !(r.message_id === newR.message_id && r.user_id === newR.user_id)),
              newR
            ];
          } else if (payload.eventType === 'UPDATE') {
            const newR = payload.new as MessageReaction;
            return prev.map(r => r.id === newR.id ? newR : r);
          } else if (payload.eventType === 'DELETE') {
            const oldR = payload.old as MessageReaction;
            return prev.filter(r => r.id !== oldR.id);
          }
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Reaction handler
  const handleReact = async (messageId: string, emoji: string | null) => {
    if (!user) return;
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === user.id);
    // Optimistic update
    if (emoji === null && existing) {
      setReactions(prev => prev.filter(r => r.id !== existing.id));
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else if (emoji && (!existing || existing.emoji !== emoji)) {
      const newReaction: MessageReaction = {
        id: existing?.id || `optimistic-${messageId}-${user.id}`,
        message_id: messageId,
        user_id: user.id,
        emoji,
        created_at: existing?.created_at || new Date().toISOString(),
      };
      setReactions(prev => [
        ...prev.filter(r => !(r.message_id === messageId && r.user_id === user.id)),
        newReaction
      ]);
      try {
        if (existing) {
          await supabase.from('message_reactions').update({ emoji }).eq('id', existing.id);
        } else {
          await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
        }
      } catch (e: any) {
        // Handle duplicate error gracefully
        setReactions(prev => prev.filter(r => !(r.message_id === messageId && r.user_id === user.id)));
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack} 
              className="mr-2 rounded-full p-2 bold-back-arrow"
            >
              <ArrowLeft className="w-9 h-9 stroke-2" />
            </Button>
            <h2 className="text-xl font-semibold text-alike-navy">{groupName}</h2>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <p className="text-muted-foreground text-center">
                No messages yet. <br/>Be the first to say hello!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isCurrentUser = message.user_id === user?.id;
                const currentDate = new Date(message.created_at).toDateString();
                const previousDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
                const showDateSeparator = previousDate !== currentDate;
                return (
                  <React.Fragment key={message.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-4">
                        <div className="bg-muted px-4 py-1 rounded-full text-sm text-muted-foreground">
                          {formatMessageDay(message.created_at)}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        <MessageBubble isCurrentUser={isCurrentUser} onLongPress={() => setPickerOpenId(message.id)}>
                          {!isCurrentUser && (
                            <p className="text-xs font-semibold mb-1">
                              {userProfiles[message.user_id] || 'Unknown User'}
                            </p>
                          )}
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 text-right ${isCurrentUser ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {formatMessageDate(message.created_at)}
                          </p>
                        </MessageBubble>
                      </div>
                      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        <MessageReactions
                          messageId={message.id}
                          currentUserId={user?.id || ''}
                          reactions={reactions.filter(r => r.message_id === message.id)}
                          onReact={emoji => handleReact(message.id, emoji)}
                          open={pickerOpenId === message.id}
                          onOpenChange={open => setPickerOpenId(open ? message.id : null)}
                        />
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="rounded-md flex-1"
            disabled={isSending}
          />
          <Button 
            type="submit"
            className="bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md"
            disabled={isSending || !newMessage.trim()}
          >
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatView;
