import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Share2, Copy } from 'lucide-react';

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

const ChatView: React.FC<ChatViewProps> = ({ groupId, groupName, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [inviteCode, setInviteCode] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch group invite code
    const fetchGroupInviteCode = async () => {
      if (!groupId) return;
      
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('invite_code')
          .eq('id', groupId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setInviteCode(data.invite_code);
        }
      } catch (error: any) {
        console.error('Error fetching invite code:', error);
      }
    };
    
    fetchGroupInviteCode();
    
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

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast({
        title: "Invite code copied",
        description: "You can now share it with friends",
      });
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack} 
              className="mr-2 rounded-full p-2"
            >
              ←
            </Button>
            <h2 className="text-xl font-semibold text-alike-navy">{groupName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-alike-teal/10 rounded-full px-3 py-1.5">
              <span className="text-xs font-medium text-alike-teal">Invite: {inviteCode}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 rounded-full" 
                onClick={copyInviteCode}
              >
                <Copy className="h-3 w-3 text-alike-teal" />
              </Button>
            </div>
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
              {messages.map((message) => {
                const isCurrentUser = message.user_id === user?.id;
                return (
                  <div 
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isCurrentUser 
                          ? 'bg-alike-teal text-white rounded-br-none' 
                          : 'bg-muted rounded-bl-none'
                      }`}
                    >
                      {!isCurrentUser && (
                        <p className="text-xs font-semibold mb-1">
                          {userProfiles[message.user_id] || 'Unknown User'}
                        </p>
                      )}
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 text-right ${isCurrentUser ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {formatMessageDate(message.created_at)}
                      </p>
                    </div>
                  </div>
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
