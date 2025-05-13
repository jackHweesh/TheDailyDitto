
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { nanoid } from 'nanoid';
import ChatView from '../chat/ChatView';

interface Group {
  id: string;
  name: string;
  memberCount: number;
}

interface GroupViewProps {
  questionId: string;
  onBack: () => void;
}

const GroupView: React.FC<GroupViewProps> = ({ questionId, onBack }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user's groups
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Get groups that the user is a member of
        const { data: membershipData, error: membershipError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);
        
        if (membershipError) throw membershipError;
        
        if (membershipData && membershipData.length > 0) {
          // Get group details
          const groupIds = membershipData.map(item => item.group_id);
          const { data: groupsData, error: groupsError } = await supabase
            .from('groups')
            .select('id, name')
            .in('id', groupIds);
          
          if (groupsError) throw groupsError;
          
          // Get member counts for each group
          if (groupsData) {
            const groupsWithCounts = await Promise.all(
              groupsData.map(async (group) => {
                const { count, error: countError } = await supabase
                  .from('group_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('group_id', group.id);
                
                return {
                  id: group.id,
                  name: group.name,
                  memberCount: count || 0
                };
              })
            );
            
            setGroups(groupsWithCounts);
          }
        }
      } catch (error: any) {
        toast({
          title: "Error loading groups",
          description: error.message || "Could not load your groups",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroups();
    
    // Subscribe to group member changes
    const channel = supabase
      .channel('group_members_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members'
        },
        (payload) => {
          // Refresh groups when membership changes
          fetchGroups();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleJoinGroup = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to join groups",
        variant: "destructive"
      });
      return;
    }
    
    if (!inviteCode.trim()) {
      toast({
        title: "Invite code required",
        description: "Please enter a valid invite code",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Find group with invite code
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('invite_code', inviteCode.trim())
        .single();
      
      if (groupError) {
        toast({
          title: "Invalid invite code",
          description: "No group found with this invite code",
          variant: "destructive"
        });
        return;
      }
      
      // Check if already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupData.id)
        .eq('user_id', user.id)
        .single();
      
      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You are already a member of this group",
          variant: "default" // Changed from "info" to "default"
        });
        setInviteCode('');
        return;
      }
      
      // Join the group
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id
        });
      
      if (joinError) throw joinError;
      
      toast({
        title: "Group joined",
        description: `You have successfully joined "${groupData.name}"`,
      });
      
      setInviteCode('');
    } catch (error: any) {
      toast({
        title: "Error joining group",
        description: error.message || "Could not join the group",
        variant: "destructive"
      });
    }
  };

  const handleCreateGroup = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create groups",
        variant: "destructive"
      });
      return;
    }
    
    if (!newGroupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Generate a unique invite code
      const inviteCode = nanoid(8);
      
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          invite_code: inviteCode,
          created_by: user.id
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Add creator to the group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id
        });
      
      if (memberError) throw memberError;
      
      toast({
        title: "Group created",
        description: `"${newGroupName}" created with invite code: ${inviteCode}. Share this code with friends!`,
      });
      
      setNewGroupName('');
    } catch (error: any) {
      toast({
        title: "Error creating group",
        description: error.message || "Could not create the group",
        variant: "destructive"
      });
    }
  };

  const handleSelectGroup = (group: Group) => {
    setActiveGroup(group);
    setShowChat(false);
  };
  
  const handleViewResults = async () => {
    // TODO: Implement group results view
    toast({
      title: "Group results",
      description: `Viewing results for "${activeGroup?.name}"`,
    });
  };
  
  const handleViewChat = async () => {
    setShowChat(true);
  };
  
  if (showChat && activeGroup) {
    return (
      <ChatView 
        groupId={activeGroup.id} 
        groupName={activeGroup.name} 
        onBack={() => setShowChat(false)} 
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="mr-2 rounded-full p-2"
          >
            ←
          </Button>
          <h2 className="text-xl font-semibold text-alike-navy">My Groups</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Join or create groups to compare answers with specific communities
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="rounded-md flex-1"
          />
          <Button 
            onClick={handleJoinGroup}
            className="bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md"
          >
            Join
          </Button>
        </div>
        
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-alike-teal border-alike-teal hover:bg-alike-teal/10">
                + Create New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  type="text"
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="rounded-md"
                />
                <Button 
                  onClick={handleCreateGroup}
                  className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md"
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <ScrollArea className="h-64">
          <div className="space-y-2 pr-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Loading groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                You haven't joined any groups yet
              </p>
            ) : (
              groups.map((group) => (
                <div 
                  key={group.id}
                  className={`p-3 rounded-md cursor-pointer flex items-center justify-between ${
                    activeGroup?.id === group.id ? 'bg-alike-teal text-white' : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => handleSelectGroup(group)}
                >
                  <div>
                    <p className={`font-medium ${activeGroup?.id === group.id ? 'text-white' : 'text-alike-navy'}`}>{group.name}</p>
                    <p className={`text-xs ${activeGroup?.id === group.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {group.memberCount} members
                    </p>
                  </div>
                  {activeGroup?.id === group.id && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {activeGroup && (
          <div className="flex space-x-2 mt-4">
            <Button
              onClick={handleViewResults}
              className="flex-1 bg-alike-navy hover:bg-alike-navy/90 text-white"
            >
              View Results
            </Button>
            <Button
              onClick={handleViewChat}
              className="flex-1 bg-alike-teal hover:bg-alike-teal/90 text-white"
            >
              Open Chat
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupView;
