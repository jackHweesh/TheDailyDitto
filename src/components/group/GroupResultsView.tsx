import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Copy, Users, ArrowLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useUnreadCount } from '@/hooks/useUnreadCount';

interface GroupResultsViewProps {
  groupId: string;
  questionId: string;
  onBack: () => void;
  options: string[];
  groupName: string;
  questionText: string;
  onViewMembers: () => void;
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

interface DailyQuestion {
  id: string;
  question: string;
  options: unknown;
  active_date: string;
}

interface Friend {
  friend_id: string;
}

interface GroupMember {
  user_id: string;
  status?: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string | null;
}

interface Vote {
  user_id: string;
  selected_option: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: GroupResult;
  }>;
  label?: string;
}

interface GroupData {
  invite_code: string;
  name: string;
  owner_id: string;
}

type SupabaseResponse<T> = {
  data: T | null;
  error: Error | null;
};

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
  questionText,
  onViewMembers
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
  const [retryCount, setRetryCount] = useState(0);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_RETRIES = 3;
  const { markGroupAsVisited, setCurrentGroup } = useUnreadCount();

  const [showCalendar, setShowCalendar] = useState(false);
  const [allQuestions, setAllQuestions] = useState<DailyQuestion[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<DailyQuestion | null>(null);
  const [viewingResults, setViewingResults] = useState<GroupResult[]>([]);
  const [isHistorical, setIsHistorical] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<{ id: string; name: string }[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Add state for invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [showInviteLink, setShowInviteLink] = useState(false);

  // Add state for group invite dialog
  const [showGroupInviteDialog, setShowGroupInviteDialog] = useState(false);
  const [groupInviteLoading, setGroupInviteLoading] = useState(false);
  const [groupInviteError, setGroupInviteError] = useState<string | null>(null);
  const [groupInviteSuccess, setGroupInviteSuccess] = useState(false);
  const [groupInviteLink, setGroupInviteLink] = useState<string>('');
  const [showGroupInviteLink, setShowGroupInviteLink] = useState(false);

  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;
    // Get group owner
    const { data: groupData } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();
    const isUserOwner = groupData && user && groupData.owner_id === user.id;
    setIsOwner(isUserOwner);
    if (!isUserOwner) {
      setShowPendingDialog(false);
      setPendingMembers([]);
      return;
    }
    // Get pending members
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user_id, status')
      .eq('group_id', groupId);
    const pendingIds = (groupMembers || []).filter(m => m.status === 'pending').map(m => m.user_id);
    if (pendingIds.length === 0) {
      setPendingMembers([]);
      setShowPendingDialog(false);
      return;
    }
    // Get names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', pendingIds);
    const pending = (profiles || []).map(p => ({
      id: p.id,
      name: p.first_name + (p.last_name ? ` ${p.last_name}` : '')
    }));
    setPendingMembers(pending);
    setShowPendingDialog(pending.length > 0);
  }, [groupId, user]);

  useEffect(() => {
    fetchPendingRequests();
    // eslint-disable-next-line
  }, [fetchPendingRequests]);

  // Mark group as read when entering results view
  useEffect(() => {
    if (groupId && user) {
      console.log(`GroupResultsView: Entering results for group ${groupId}, marking as read`);
      setCurrentGroup(groupId);
      markGroupAsVisited(groupId);
    }
  }, [groupId, user, markGroupAsVisited, setCurrentGroup]);

  // Fetch group results
  useEffect(() => {
    const fetchGroupResults = async () => {
      setIsLoading(true);
      try {
        // Get group data
        const { data: groupData, error: groupError }: SupabaseResponse<GroupData> = await supabase
          .from('groups')
          .select('name, owner_id')
          .eq('id', groupId)
          .single();
        if (groupError) throw groupError;
        // Check if this is the current user's Friends group
        let memberIds: string[] = [];
        if (groupData && groupData.name === 'Friends' && user && groupData.owner_id === user.id) {
          // Friends group: get all friend_ids for this user + self
          const { data: friendsData, error: friendsError }: SupabaseResponse<Friend[]> = await supabase
            .from('friends')
            .select('friend_id')
            .eq('user_id', user.id);
          if (friendsError) throw friendsError;
          memberIds = [user.id, ...(friendsData ? friendsData.map((f) => f.friend_id) : [])];
        } else {
          // Normal group: get all group members
          const { data: members, error: membersError }: SupabaseResponse<GroupMember[]> = await supabase
          .from('group_members')
          .select('user_id, status')
          .eq('group_id', groupId);
        if (membersError) throw membersError;
          memberIds = (members || []).filter(m => m.status !== 'pending').map(m => m.user_id);
        }
        if (memberIds.length > 0) {
          // Get votes from group members for this question
          const { data: votes, error: votesError }: SupabaseResponse<Vote[]> = await supabase
            .from('votes')
            .select('user_id, selected_option')
            .eq('question_id', questionId)
            .in('user_id', memberIds);
          if (votesError) throw votesError;
          // Get names for the voters
          const { data: profiles, error: profilesError }: SupabaseResponse<Profile[]> = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', memberIds);
          if (profilesError) throw profilesError;
          const nameMap = new Map<string, string>();
          if (profiles) {
            profiles.forEach(profile => {
              const fullName = profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '');
              nameMap.set(profile.id, fullName);
            });
          }
          // Calculate group results
          const voteCounts: Record<string, number> = {};
          const votersByOption: Record<string, string[]> = {};
          options.forEach(option => { votersByOption[option] = []; });
          votes?.forEach(vote => {
            voteCounts[vote.selected_option] = (voteCounts[vote.selected_option] || 0) + 1;
            const username = nameMap.get(vote.user_id);
            votersByOption[vote.selected_option] = [
              ...(votersByOption[vote.selected_option] || []),
              username || 'Unknown User'
            ];
          });
          const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
          const formattedResults: GroupResult[] = options.map((option, index) => ({
            option,
            votes: voteCounts[option] || 0,
            percentage: totalVotes > 0 ? Math.round(((voteCounts[option] || 0) / totalVotes) * 100) : 0,
            color: RESULT_COLORS[index % RESULT_COLORS.length],
            voters: votersByOption[option]
          }));
          setGroupResults(formattedResults);
        } else {
          setGroupResults([]);
        }
      } catch (error: unknown) {
        let message = 'Could not load group results';
        if (error instanceof Error) {
          message = error.message;
        }
        toast({
          title: "Error loading group results",
          description: message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroupResults();
  }, [groupId, questionId, options, toast, user]);

  // Fetch chat messages
  const fetchMessages = async () => {
    setIsLoadingChat(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('group_id', groupId)
        .gte('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data) {
        setMessages(data);
        // Collect unique user IDs
        const userIds = [...new Set(data.map(message => message.user_id))];
        await fetchUserProfiles(userIds);
      }
    } catch (error: unknown) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error loading messages",
        description: error instanceof Error ? error.message : "Could not load chat messages",
        variant: "destructive"
      });
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchMessages();
    
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
          
          if (!userProfiles[newMessage.user_id]) {
            await fetchUserProfiles([newMessage.user_id]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when component first loads and messages are loaded
  useEffect(() => {
    if (!isLoadingChat && messages.length > 0) {
      scrollToBottom();
    }
  }, [isLoadingChat, messages.length]);
  
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
    } catch (error: unknown) {
      console.error('Error in fetchUserProfiles:', error);
      toast({
        title: "Error loading user profiles",
        description: error instanceof Error ? error.message : "Could not load user profiles",
        variant: "destructive"
      });
    }
  };
  
  // Handle message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || isSending) return;
    
    setIsSending(true);
    const messageToSend = newMessage.trim();
    setNewMessage('');
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message: messageToSend
        });
        
      if (error) throw error;
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      setNewMessage(messageToSend); // Restore the message
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Could not send your message",
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

  // Create a custom tooltip component for the bar chart
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
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
        .select('id, question, options, active_date');
      if (data) setAllQuestions(data);
    })();
  }, []);

  function toLocalDateOnly(dateString) {
    // Parse as local date (YYYY-MM-DD is treated as local midnight)
    const d = new Date(dateString + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  useEffect(() => {
    if (!selectedDate) return;
    // Find the question with active_date matching selectedDate (local time)
    const q = allQuestions.find(q => {
      const qDate = toLocalDateOnly(q.active_date);
      return (
        qDate.getFullYear() === selectedDate.getFullYear() &&
        qDate.getMonth() === selectedDate.getMonth() &&
        qDate.getDate() === selectedDate.getDate()
      );
    });
    setViewingQuestion(q);
    if (!q) {
      setViewingResults([]);
      setIsHistorical(true);
      return;
    }
    // Fetch group results for this question
    (async () => {
      // Fetch group data to check if this is the Friends group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('name, owner_id')
        .eq('id', groupId)
        .single();
      if (groupError) {
        setViewingResults([]);
        return;
      }
      let memberIds: string[] = [];
      if (groupData && groupData.name === 'Friends' && user && groupData.owner_id === user.id) {
        // Friends group: get all friend_ids for this user + self
        const { data: friendsData, error: friendsError } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', user.id);
        if (friendsError) {
          setViewingResults([]);
          return;
        }
        memberIds = [user.id, ...(friendsData ? friendsData.map((f: Friend) => f.friend_id) : [])];
      } else {
        // Normal group: get all group members
        const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);
        if (!groupMembers || groupMembers.length === 0) {
          setViewingResults([]);
          return;
        }
        memberIds = groupMembers.map((m: GroupMember) => m.user_id);
      }
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
      const nameMap = new Map<string, string>();
      if (profiles) {
        profiles.forEach((profile: Profile) => {
          const fullName = profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '');
          nameMap.set(profile.id, fullName);
        });
      }
      // Calculate group results
      const parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      const voteCounts: Record<string, number> = {};
      const votersByOption: Record<string, string[]> = {};
      parsedOptions.forEach((option: string) => { votersByOption[option] = []; });
      votes?.forEach((vote: Vote) => {
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
  }, [selectedDate, allQuestions, groupId, user]);

  // Only enable dates that have a question (by active_date)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // local midnight
  const availableDates = allQuestions
    .map(q => toLocalDateOnly(q.active_date))
    .filter(d => d <= today);
  const minDate = availableDates.length > 0 ? availableDates[0] : undefined;
  const maxDate = today; // always allow today if it's available

  const currentDate = selectedDate
    ? format(selectedDate, 'MMMM d, yyyy')
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handleApprove = async (memberId: string) => {
    setPendingAction(memberId + '-approve');
    console.log('Approving member:', { groupId, memberId });
    const { data, error } = await supabase
      .from('group_members')
      .update({ status: 'member' })
      .eq('group_id', groupId)
      .eq('user_id', memberId)
      .select(); // Get affected rows
    setPendingAction(null);
    console.log('Approve result:', { data, error });
    if (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to approve member', 
        variant: 'destructive' 
      });
      return;
    }
    if (!data || data.length === 0) {
      toast({ 
        title: 'No rows updated', 
        description: 'No group member was updated. Check group_id and user_id.', 
        variant: 'destructive' 
      });
      return;
    }
    await fetchPendingRequests();
  };

  const handleReject = async (memberId: string) => {
    setPendingAction(memberId + '-reject');
    console.log('Rejecting member:', { groupId, memberId });
    const { data, error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberId)
      .select(); // Get affected rows
    setPendingAction(null);
    console.log('Reject result:', { data, error });
    if (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to reject member', 
        variant: 'destructive' 
      });
      return;
    }
    if (!data || data.length === 0) {
      toast({ 
        title: 'No rows deleted', 
        description: 'No group member was deleted. Check group_id and user_id.', 
        variant: 'destructive' 
      });
      return;
    }
    await fetchPendingRequests();
  };

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup function to prevent memory leaks
      setInviteLoading(false);
      setInviteError(null);
      setInviteSuccess(false);
      setShowInviteLink(false);
      setInviteLink('');
    };
  }, []);

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
                selected={selectedDate || today}
                onSelect={setSelectedDate}
                fromDate={minDate}
                toDate={maxDate}
                disabled={(date) => !availableDates.some(d =>
                  d.getFullYear() === date.getFullYear() &&
                  d.getMonth() === date.getMonth() &&
                  d.getDate() === date.getDate()
                )}
                modifiers={{
                  available: availableDates,
                }}
                modifiersClassNames={{
                  available: 'bg-alike-teal/20',
                }}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-1">
            {groupName === 'Friends' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-alike-teal border-alike-teal"
                  onClick={() => setShowInviteDialog(true)}
                >
                  Send Friend Invite
                </Button>
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Friend Invite</DialogTitle>
                    </DialogHeader>
                    {showInviteLink ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-4">
                            Share this link with your friend to invite them to Ditto:
                          </p>
                          <div className="flex items-center space-x-2">
                            <Input value={inviteLink} readOnly />
                            <Button
                              size="icon"
                              onClick={() => {
                                const inviteText = `Curious how alike we are? Friend me on Ditto! ${inviteLink}`;
                                navigator.clipboard.writeText(inviteText);
                                toast({
                                  title: "Invite link copied!",
                                  description: "The invite has been copied to your clipboard.",
                                });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-center">
                          <Button
                            onClick={() => setShowInviteDialog(false)}
                            variant="ghost"
                            className="text-gray-500"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    ) : inviteSuccess ? (
                      <div className="py-4 text-green-600">Invite link generated successfully!</div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Generate a unique invite link to share with your friend. The link will be valid for 24 hours.
                        </p>
                        {inviteError && <div className="text-red-600 text-sm">{inviteError}</div>}
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowInviteDialog(false)} 
                            disabled={inviteLoading}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={async () => {
                              if (inviteLoading) return; // Prevent multiple clicks
                              
                              setInviteLoading(true);
                              setInviteError(null);
                              setInviteSuccess(false);
                              
                              try {
                                // Get the user's JWT for the Authorization header
                                const { data: { session } } = await supabase.auth.getSession();
                                const accessToken = session?.access_token;
                                
                                if (!accessToken) {
                                  throw new Error('Authentication required');
                                }
                                
                                const res = await fetch('https://clvtxmkpsmacvhvyhwob.supabase.co/functions/v1/generate-friend-invite', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`,
                                  },
                                });
                                
                                if (!res.ok) {
                                  const errorText = await res.text();
                                  let errorData;
                                  try {
                                    errorData = JSON.parse(errorText);
                                  } catch {
                                    errorData = { error: 'Invalid response from server' };
                                  }
                                  throw new Error(errorData.error || 'Failed to generate invite');
                                }
                                
                                const data = await res.json();
                                
                                if (!data.invite_link) {
                                  throw new Error('Invalid response: missing invite link');
                                }
                                
                                setInviteLink(data.invite_link);
                                setInviteSuccess(true);
                                setShowInviteLink(true);
                              } catch (err: any) {
                                console.error('Invite generation error:', err);
                                setInviteError(err.message || 'Failed to generate invite');
                              } finally {
                                setInviteLoading(false);
                              }
                            }}
                            className="bg-alike-teal text-white" 
                            disabled={inviteLoading}
                          >
                            {inviteLoading ? 'Generating...' : 'Generate Invite Link'}
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-alike-teal border-alike-teal"
                  onClick={() => setShowGroupInviteDialog(true)}
                >
                  Send Group Link
                </Button>
                <Dialog open={showGroupInviteDialog} onOpenChange={setShowGroupInviteDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Group Invite</DialogTitle>
                    </DialogHeader>
                    {showGroupInviteLink ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-4">
                            Share this link with friends to invite them to join "{groupName}":
                          </p>
                          <div className="flex items-center space-x-2">
                            <Input value={groupInviteLink} readOnly />
                            <Button
                              size="icon"
                              onClick={() => {
                                const inviteText = `Join my group "${groupName}" on Ditto! ${groupInviteLink}`;
                                navigator.clipboard.writeText(inviteText);
                                toast({
                                  title: "Invite link copied!",
                                  description: "The invite has been copied to your clipboard.",
                                });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-center">
                          <Button
                            onClick={() => setShowGroupInviteDialog(false)}
                            variant="ghost"
                            className="text-gray-500"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    ) : groupInviteSuccess ? (
                      <div className="py-4 text-green-600">Invite link generated successfully!</div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Generate a unique invite link to share with friends. The link will be valid for 7 days.
                        </p>
                        {groupInviteError && <div className="text-red-600 text-sm">{groupInviteError}</div>}
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowGroupInviteDialog(false)} 
                            disabled={groupInviteLoading}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={async () => {
                              if (groupInviteLoading) return;
                              
                              setGroupInviteLoading(true);
                              setGroupInviteError(null);
                              setGroupInviteSuccess(false);
                              
                              try {
                                const { data: { session } } = await supabase.auth.getSession();
                                const accessToken = session?.access_token;
                                
                                if (!accessToken) {
                                  throw new Error('Authentication required');
                                }
                                
                                const res = await fetch('https://clvtxmkpsmacvhvyhwob.supabase.co/functions/v1/generate-group-invite', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`,
                                  },
                                  body: JSON.stringify({ group_id: groupId }),
                                });
                                
                                if (!res.ok) {
                                  const errorText = await res.text();
                                  let errorData;
                                  try {
                                    errorData = JSON.parse(errorText);
                                  } catch {
                                    errorData = { error: 'Invalid response from server' };
                                  }
                                  throw new Error(errorData.error || 'Failed to generate invite');
                                }
                                
                                const data = await res.json();
                                
                                if (!data.invite_link) {
                                  throw new Error('Invalid response: missing invite link');
                                }
                                
                                setGroupInviteLink(data.invite_link);
                                setGroupInviteSuccess(true);
                                setShowGroupInviteLink(true);
                              } catch (err: any) {
                                console.error('Group invite generation error:', err);
                                setGroupInviteError(err.message || 'Failed to generate invite');
                              } finally {
                                setGroupInviteLoading(false);
                              }
                            }}
                            className="bg-alike-teal text-white" 
                            disabled={groupInviteLoading}
                          >
                            {groupInviteLoading ? 'Generating...' : 'Generate Invite Link'}
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
        {/* Second row: back button and group name */}
        <div className="flex items-center mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="mr-2 rounded-full p-2 bold-back-arrow"
          >
            <ArrowLeft className="w-6 h-6 stroke-2" />
          </Button>
          <h2 className="text-xl font-semibold text-alike-navy flex items-center">
            {groupName}
            <button onClick={onViewMembers} className="ml-2 p-0 bg-transparent border-0 cursor-pointer" title="View group members">
              <Users size={24} color="#4FD1C5" />
            </button>
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
        {!isHistorical && groupName !== 'Friends' && (
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
                  {messages.map((message, index) => {
                    const isCurrentUser = message.user_id === user?.id;
                    const displayName = userProfiles[message.user_id] || 'Unknown User';
                    const currentDate = new Date(message.created_at).toDateString();
                    const previousDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
                    const showDateSeparator = previousDate !== currentDate;

                    return (
                      <div key={message.id}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-4">
                            <div className="bg-muted px-4 py-1 rounded-full text-sm text-muted-foreground">
                              {formatMessageDay(message.created_at)}
                            </div>
                          </div>
                        )}
                        <div 
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
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </form>
            </div>
          </div>
        )}
        {/* Pending Requests Popup for Owners */}
        {isOwner && showPendingDialog && (
          <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pending Join Requests</DialogTitle>
              </DialogHeader>
              {pendingMembers.length === 0 ? (
                <p className="text-muted-foreground">No pending requests.</p>
              ) : (
                <ul className="divide-y mb-4">
                  {pendingMembers.map((m) => (
                    <li key={m.id} className="py-3 flex items-center justify-between">
                      <span className="font-medium text-alike-navy">{m.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-alike-teal text-white hover:bg-alike-teal/90"
                          disabled={pendingAction === m.id + '-approve'}
                          onClick={() => handleApprove(m.id)}
                        >
                          {pendingAction === m.id + '-approve' ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pendingAction === m.id + '-reject'}
                          onClick={() => handleReject(m.id)}
                        >
                          {pendingAction === m.id + '-reject' ? 'Rejecting...' : 'Reject'}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPendingDialog(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupResultsView; 