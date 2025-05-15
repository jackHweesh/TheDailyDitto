import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Copy, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, isSameDay } from 'date-fns';

interface GroupResultsViewProps {
  groupId: string;
  questionId: string;
  onBack: () => void;
  options: string[];
  groupName: string;
  questionText: string;
}

interface GroupResult {
  option: string;
  votes: number;
  percentage: number;
  color: string;
  voters: string[];
}

interface Message {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
}

const RESULT_COLORS = [
  '#4FD1C5', // teal
  '#667EEA', // indigo
  '#F6AD55', // orange
  '#FC8181', // red
  '#9F7AEA', // purple
];

const GroupResultsView: React.FC<GroupResultsViewProps> = ({ 
  groupId, 
  questionId, 
  onBack, 
  options,
  groupName,
  questionText
}) => {
  // Results state
  const [groupResults, setGroupResults] = useState<GroupResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [inviteCode, setInviteCode] = useState<string>('');
  
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<any | null>(null);
  const [viewingResults, setViewingResults] = useState<GroupResult[]>([]);
  const [isHistorical, setIsHistorical] = useState(false);

  // Fetch group results and invite code
  useEffect(() => {
    const fetchGroupResultsAndInviteCode = async () => {
      setIsLoading(true);
      try {
        // Fetch invite code
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('invite_code')
          .eq('id', groupId)
          .single();
          
        if (groupError) throw groupError;
        
        if (groupData) {
          setInviteCode(groupData.invite_code);
        }
        
        // Get all members of the group
        const { data: members, error: membersError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);

        if (membersError) throw membersError;

        console.log('All group members:', members);

        if (members && members.length > 0) {
          // Get votes from group members for this question
          const memberIds = members.map(member => member.user_id);
          console.log('Member IDs we are looking up:', memberIds);
          
          const { data: votes, error: votesError } = await supabase
            .from('votes')
            .select('user_id, selected_option')
            .eq('question_id', questionId)
            .in('user_id', memberIds);

          if (votesError) throw votesError;
          
          console.log('Votes found:', votes);

          // Get names for the voters
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', memberIds);

          if (profilesError) {
            console.error('Profile error:', profilesError);
            throw profilesError;
          }

          console.log('Profiles found:', profiles);

          // Create a map of user IDs to full names
          const nameMap = new Map();
          
          if (profiles) {
            profiles.forEach(profile => {
              const fullName = profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '');
              console.log('Mapping user ID to name:', profile.id, fullName);
              nameMap.set(profile.id, fullName);
            });
          }

          console.log('Final name map:', Object.fromEntries(nameMap));

          // Calculate group results
          const voteCounts: Record<string, number> = {};
          const votersByOption: Record<string, string[]> = {};

          // Initialize the votersByOption for all options
          options.forEach(option => {
            votersByOption[option] = [];
          });

          votes?.forEach(vote => {
            voteCounts[vote.selected_option] = (voteCounts[vote.selected_option] || 0) + 1;
            
            // Add the voter's name to the corresponding option
            const username = nameMap.get(vote.user_id);
            console.log('Processing vote:', vote.user_id, 'Found name:', username);
            votersByOption[vote.selected_option] = [
              ...(votersByOption[vote.selected_option] || []),
              username || 'Unknown User'
            ];
          });

          console.log('Final votersByOption:', votersByOption);

          // Calculate percentages and format results
          const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
          const formattedResults: GroupResult[] = options.map((option, index) => ({
            option,
            votes: voteCounts[option] || 0,
            percentage: totalVotes > 0 ? Math.round(((voteCounts[option] || 0) / totalVotes) * 100) : 0,
            color: RESULT_COLORS[index % RESULT_COLORS.length],
            voters: votersByOption[option]
          }));

          setGroupResults(formattedResults);
        }
      } catch (error: any) {
        toast({
          title: "Error loading group results",
          description: error.message || "Could not load group results",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupResultsAndInviteCode();
  }, [groupId, questionId, options, toast]);

  // Fetch chat messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoadingChat(true);
      
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
        setIsLoadingChat(false);
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
      console.log('Fetching chat profiles for user IDs:', userIds);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      if (error) {
        console.error('Error fetching chat profiles:', error);
        throw error;
      }
      
      console.log('Chat profiles found:', data);
      
      if (data) {
        const profiles: Record<string, string> = {};
        data.forEach(profile => {
          const fullName = profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '');
          console.log('Setting chat name for user:', profile.id, fullName);
          profiles[profile.id] = fullName;
        });
        console.log('Setting user profiles:', profiles);
        setUserProfiles(prevProfiles => {
          console.log('Previous profiles:', prevProfiles);
          const newProfiles = {
            ...prevProfiles,
            ...profiles
          };
          console.log('New profiles:', newProfiles);
          return newProfiles;
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfiles:', error);
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || isSending) return;
    
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

  // Create a custom tooltip component for the bar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 rounded border shadow-sm">
          <p className="font-semibold mb-1">{data.option}</p>
          {data.votes > 0 ? (
            <div className="text-sm">
              <p className="font-medium mb-1">Selected by:</p>
              <ul className="list-disc pl-4">
                {data.voters.map((voter: string, index: number) => (
                  <li key={index} className="text-muted-foreground">{voter}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No votes yet</p>
          )}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('daily_questions')
        .select('id, question, options, created_at');
      if (data) setAllQuestions(data);
    })();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    // Find which question would be shown on this date
    const sorted = [...allQuestions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const start = new Date(selectedDate.getFullYear(), 0, 0);
    const diff = selectedDate.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const questionIndex = dayOfYear % sorted.length;
    const q = sorted[questionIndex];
    setViewingQuestion(q);
    // Fetch group results for this question
    (async () => {
      // Get all members of the group
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);
      if (!members || members.length === 0) return setViewingResults([]);
      const memberIds = members.map((m: any) => m.user_id);
      // Get votes from group members for this question
      const { data: votes } = await supabase
        .from('votes')
        .select('user_id, selected_option')
        .eq('question_id', q.id)
        .in('user_id', memberIds);
      // Get names for the voters
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', memberIds);
      const nameMap = new Map();
      if (profiles) {
        profiles.forEach((profile: any) => {
          const fullName = profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '');
          nameMap.set(profile.id, fullName);
        });
      }
      // Calculate group results
      const parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      const voteCounts: Record<string, number> = {};
      const votersByOption: Record<string, string[]> = {};
      parsedOptions.forEach((option: string) => { votersByOption[option] = []; });
      votes?.forEach((vote: any) => {
        voteCounts[vote.selected_option] = (voteCounts[vote.selected_option] || 0) + 1;
        const username = nameMap.get(vote.user_id);
        votersByOption[vote.selected_option] = [
          ...(votersByOption[vote.selected_option] || []),
          username || 'Unknown User'
        ];
      });
      const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
      const formattedResults: GroupResult[] = parsedOptions.map((option: string, index: number) => ({
        option,
        votes: voteCounts[option] || 0,
        percentage: totalVotes > 0 ? Math.round(((voteCounts[option] || 0) / totalVotes) * 100) : 0,
        color: RESULT_COLORS[index % RESULT_COLORS.length],
        voters: votersByOption[option]
      }));
      setViewingResults(formattedResults);
      setIsHistorical(!isSameDay(selectedDate, new Date()));
    })();
  }, [selectedDate, allQuestions, groupId]);

  const currentDate = selectedDate
    ? format(selectedDate, 'MMMM d, yyyy')
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const minDate = allQuestions.length > 0 ? new Date(allQuestions[0].created_at) : undefined;
  const maxDate = new Date();
  const availableDates = [];
  if (minDate) {
    let d = new Date(minDate);
    while (d <= maxDate) {
      availableDates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1">
        {/* Top row: date left, invite code right */}
        <div className="flex items-center justify-between w-full">
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <button className="text-sm text-muted-foreground underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0" type="button">
                {currentDate}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate || new Date()}
                onSelect={setSelectedDate}
                fromDate={minDate}
                toDate={maxDate}
                disabled={(date) => false}
                modifiers={{
                  available: availableDates,
                }}
                modifiersClassNames={{
                  available: 'bg-alike-teal/20',
                }}
              />
            </PopoverContent>
          </Popover>
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
        {/* Second row: back button and group name */}
        <div className="flex items-center mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="mr-2 rounded-full p-2"
          >
            ←
          </Button>
          <h2 className="text-xl font-semibold text-alike-navy flex items-center">
            {groupName}
            <Users className="ml-2" size={24} color="#4FD1C5" />
          </h2>
        </div>
        {/* Third row: question text */}
        <p className="text-base text-alike-navy font-medium mt-1">{isHistorical && viewingQuestion ? viewingQuestion.question : questionText}</p>
      </CardHeader>
      <CardContent className="space-y-6 px-6">
        <div className="mb-8">
          {isHistorical ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={viewingResults}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="option" width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="percentage" 
                    radius={[0, 4, 4, 0]}
                    label={{ 
                      position: 'right',
                      formatter: (value: number) => `${value}%`
                    }}
                  >
                    {viewingResults.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">Loading results...</p>
            </div>
          ) : (
            <>
              {/* Group Results Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={groupResults}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="option" width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="percentage" 
                      radius={[0, 4, 4, 0]}
                      label={{ 
                        position: 'right',
                        formatter: (value: number) => `${value}%`
                      }}
                    >
                      {groupResults.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
        {/* Group Chat (only for today) */}
        {!isHistorical && (
          <div className="border rounded-lg mt-12">
            <div className="p-3 border-b">
              <h3 className="text-lg font-medium">Group Chat</h3>
            </div>
            <ScrollArea className="h-64 p-4">
              {isLoadingChat ? (
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
                    const displayName = userProfiles[message.user_id] || 'Unknown User';
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
                              {displayName}
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
            <div className="p-3 border-t">
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupResultsView; 