
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
}

interface ChatViewProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ groupId, groupName, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        // Get messages with user information
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select(`
            id,
            message,
            created_at,
            user_id
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });
        
        if (messagesError) throw messagesError;
        
        // Get user info for each message
        if (messagesData && messagesData.length > 0) {
          const messagesWithUserInfo = await Promise.all(
            messagesData.map(async (message) => {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', message.user_id)
                .single();
              
              if (userError) return message;
              
              return {
                ...message,
                first_name: userData?.first_name,
                last_name: userData?.last_name
              };
            })
          );
          
          setMessages(messagesWithUserInfo);
        }
      } catch (error: any) {
        toast({
          title: "Error loading messages",
          description: error.message || "Could not load messages",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('chat_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          // When a new message comes in, fetch the user info
          const newMessage = payload.new as ChatMessage;
          
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', newMessage.user_id)
            .single();
          
          if (!userError) {
            setMessages(prev => [...prev, {
              ...newMessage,
              first_name: userData?.first_name,
              last_name: userData?.last_name
            }]);
          } else {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, toast]);
  
  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to send messages",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      const { error } = await supabase
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
        description: error.message || "Could not send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 h-[70vh] flex flex-col">
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack} 
              className="rounded-full p-2"
            >
              ←
            </Button>
            <h3 className="font-semibold text-alike-navy">{groupName} Chat</h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">No messages yet. Start chatting!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isCurrentUser = user?.id === message.user_id;
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[75%] rounded-lg p-3 ${
                          isCurrentUser 
                            ? 'bg-alike-teal text-white rounded-tr-none' 
                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                        }`}
                      >
                        {!isCurrentUser && (
                          <p className="text-xs font-semibold mb-1">
                            {message.first_name} {message.last_name}
                          </p>
                        )}
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter className="p-2 border-t">
        <form onSubmit={handleSendMessage} className="w-full flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending}
            className="flex-grow"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || isSending}
            className="bg-alike-teal hover:bg-alike-teal/90 text-white"
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatView;
