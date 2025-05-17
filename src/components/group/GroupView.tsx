import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { nanoid } from 'nanoid';
import GroupResultsView from './GroupResultsView';
import GroupMembersPage from './GroupMembersPage';

interface Group {
  id: string;
  name: string;
  memberCount: number;
  status: string;
  owner_id: string;
}

interface GroupViewProps {
  questionId: string;
  onBack: () => void;
  options: string[];
  questionText: string;
}

const GroupView: React.FC<GroupViewProps> = ({ questionId, onBack, options, questionText }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
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
          .select('group_id, status')
          .eq('user_id', user.id);
        
        if (membershipError) throw membershipError;
        
        if (membershipData && membershipData.length > 0) {
          // Get group details
          const groupIds = membershipData.map(item => item.group_id);
          const { data: groupsData, error: groupsError } = await supabase
            .from('groups')
            .select('id, name, owner_id')
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
                
                // Find this user's membership status
                const membership = membershipData.find(m => m.group_id === group.id);
                
                return {
                  id: group.id,
                  name: group.name,
                  memberCount: count || 0,
                  status: membership?.status || 'pending',
                  owner_id: group.owner_id
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
        .select('id, name, owner_id')
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
      
      // Check if already a member or pending
      const { data: existingMember, error: memberError } = await supabase
        .from('group_members')
        .select('id, status')
        .eq('group_id', groupData.id)
        .eq('user_id', user.id)
        .single();
      
      if (existingMember) {
        if (existingMember.status === 'pending') {
          toast({
            title: "Request pending",
            description: "Your request to join this group is pending approval from the owner.",
            variant: "default"
          });
        } else {
          toast({
            title: "Already a member",
            description: "You are already a member of this group",
            variant: "default"
          });
        }
        setInviteCode('');
        return;
      }
      
      // Determine status
      const status = groupData.owner_id === user.id ? 'owner' : 'pending';
      
      // Join the group with appropriate status
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          status
        });
      
      if (joinError) throw joinError;
      
      if (status === 'pending') {
        toast({
          title: "Request sent",
          description: "Your request to join this group is pending approval from the owner.",
        });
      } else {
        toast({
          title: "Group joined",
          description: `You have successfully joined "${groupData.name}"`,
        });
      }
      
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
          created_by: user.id,
          owner_id: user.id
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Add creator to the group as owner
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          status: 'owner'
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
    // Only allow access if user is a member or owner
    if (group.status === 'pending') {
      toast({
        title: "Access Denied",
        description: "Your request to join this group is pending approval from the owner.",
        variant: "default"
      });
      return;
    }
    setActiveGroup(group);
  };
  
  const handleViewResults = async () => {
    setShowResults(true);
  };
  
  const openLeaveConfirmation = () => {
    setShowLeaveConfirmation(true);
  };
  
  const handleLeaveGroup = async () => {
    if (!user || !activeGroup) return;
    
    setIsLeavingGroup(true);
    setShowLeaveConfirmation(false);
    
    try {
      // Find the membership record to delete
      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', activeGroup.id)
        .eq('user_id', user.id)
        .single();
      
      if (membershipError) throw membershipError;
      
      if (membership) {
        // Remove the user from the group
        const { error: leaveError } = await supabase
          .from('group_members')
          .delete()
          .eq('id', membership.id);
        
        if (leaveError) throw leaveError;
        
        // Check if the group is now empty
        const { count, error: countError } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', activeGroup.id);
        
        if (countError) throw countError;
        
        // If group is empty, delete it and all related messages
        if (count === 0) {
          // Delete chat messages first
          const { error: messagesError } = await supabase
            .from('chat_messages')
            .delete()
            .eq('group_id', activeGroup.id);
          
          if (messagesError) throw messagesError;
          
          // Delete the group
          const { error: groupError } = await supabase
            .from('groups')
            .delete()
            .eq('id', activeGroup.id);
          
          if (groupError) throw groupError;
          
          toast({
            title: "Group deleted",
            description: `You were the last member, so the group "${activeGroup.name}" has been deleted`,
          });
        } else {
          toast({
            title: "Group left",
            description: `You have left the group "${activeGroup.name}"`,
          });
        }
        
        // Reset active group
        setActiveGroup(null);
      }
    } catch (error: any) {
      toast({
        title: "Error leaving group",
        description: error.message || "Could not leave the group",
        variant: "destructive"
      });
    } finally {
      setIsLeavingGroup(false);
    }
  };
  
  if (showMembers && activeGroup) {
    return (
      <GroupMembersPage
        groupId={activeGroup.id}
        groupName={activeGroup.name}
        onBack={() => setShowMembers(false)}
      />
    );
  }

  if (showResults && activeGroup) {
    return (
      <GroupResultsView
        groupId={activeGroup.id}
        groupName={activeGroup.name}
        questionId={questionId}
        onBack={() => setShowResults(false)}
        options={options}
        questionText={questionText}
        onViewMembers={() => setShowMembers(true)}
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
                    <p className={`font-medium ${activeGroup?.id === group.id ? 'text-white' : 'text-alike-navy'}`}>
                      {group.name}
                      {group.status === 'owner' && ' (Owner)'}
                      {group.status === 'pending' && ' (Pending)'}
                    </p>
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
        
        {activeGroup && activeGroup.status !== 'pending' && (
          <div className="flex mt-4">
            <Button
              onClick={handleViewResults}
              className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white"
            >
              View Group Results & Chat
            </Button>
          </div>
        )}
        
        {activeGroup && activeGroup.status !== 'pending' && (
          <div className="mt-4">
            <Button
              onClick={openLeaveConfirmation}
              variant="outline"
              className="w-full border-red-500 text-red-500 hover:bg-red-50"
            >
              Leave Group
            </Button>
            
            <Dialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leave Group</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to leave "{activeGroup.name}"?
                    {activeGroup.memberCount <= 1 && (
                      <p className="mt-2 text-red-500">
                        You are the last member. This group will be permanently deleted if you leave.
                      </p>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowLeaveConfirmation(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleLeaveGroup}
                    disabled={isLeavingGroup}
                  >
                    {isLeavingGroup ? "Leaving..." : "Leave Group"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupView;
