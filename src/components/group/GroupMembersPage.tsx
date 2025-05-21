import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface GroupMembersPageProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
  onGroupNameChanged?: () => void;
}

interface Member {
  id: string;
  name: string;
  alike: number;
  status: string;
}

const GroupMembersPage: React.FC<GroupMembersPageProps> = ({ groupId, groupName, onBack, onGroupNameChanged }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string>('pending');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // 1. Check if user has access to this group
        const { data: membership, error: membershipError } = await supabase
          .from('group_members')
          .select('status')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single();
        
        if (membershipError || !membership) {
          toast({
            title: "Access Denied",
            description: "You don't have access to this group.",
            variant: "destructive"
          });
          onBack();
          return;
        }
        
        setUserStatus(membership.status);
        
        // 2. Get all group members with their status
        const { data: groupMembers, error: groupMembersError } = await supabase
          .from('group_members')
          .select('user_id, status')
          .eq('group_id', groupId);
        
        if (groupMembersError) throw groupMembersError;
        
        const memberIds = groupMembers.map((m: any) => m.user_id);
        
        // 3. Get member names
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', memberIds);
        
        const nameMap: Record<string, string> = {};
        profiles?.forEach((p: any) => {
          nameMap[p.id] = p.first_name + (p.last_name ? ` ${p.last_name}` : '');
        });
        
        // 4. Get all votes for all members
        const { data: votes } = await supabase
          .from('votes')
          .select('user_id, question_id, selected_option')
          .in('user_id', memberIds);
        
        // 5. Build a map of user_id -> {question_id: selected_option}
        const votesByUser: Record<string, Record<string, string>> = {};
        votes?.forEach((v: any) => {
          if (!votesByUser[v.user_id]) votesByUser[v.user_id] = {};
          votesByUser[v.user_id][v.question_id] = v.selected_option;
        });
        
        // 6. Compute alike percentage for each member (except self)
        const currentUserVotes = votesByUser[user.id] || {};
        const allMembers: Member[] = groupMembers.map((m: any) => {
          const id = m.user_id;
          const theirVotes = votesByUser[id] || {};
          // Find questions both answered
          const commonQuestions = Object.keys(currentUserVotes).filter(qid => theirVotes[qid]);
          const total = commonQuestions.length;
          let alike = 0;
          commonQuestions.forEach(qid => {
            if (currentUserVotes[qid] === theirVotes[qid]) alike++;
          });
          return {
            id,
            name: nameMap[id] || 'Unknown',
            alike: total > 0 ? Math.round((alike / total) * 100) : 0,
            status: m.status,
          };
        });
        
        // Filter members and pending members
        const activeMembers = allMembers.filter(m => m.status !== 'pending');
        const pending = allMembers.filter(m => m.status === 'pending');
        
        console.log('Active members:', activeMembers);
        console.log('Pending members:', pending);
        
        setMembers(activeMembers);
        setPendingMembers(pending);
        
        // 7. Check if current user is owner
        const { data: groupData } = await supabase
          .from('groups')
          .select('owner_id')
          .eq('id', groupId)
          .single();
        
        const isUserOwner = groupData && user && groupData.owner_id === user.id;
        console.log('Is user owner:', isUserOwner, 'Group owner:', groupData?.owner_id, 'Current user:', user.id);
        
        setIsOwner(isUserOwner);
      } catch (error: any) {
        toast({
          title: "Error loading members",
          description: error.message || "Could not load group members",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMembers();
  }, [groupId, user, toast, onBack]);

  const handleApprove = async (memberId: string) => {
    setActionLoading(memberId + '-approve');
    await supabase
      .from('group_members')
      .update({ status: 'member' })
      .eq('group_id', groupId)
      .eq('user_id', memberId);
    setActionLoading(null);
    // Refresh
    const event = new Event('refresh-members');
    window.dispatchEvent(event);
  };

  const handleReject = async (memberId: string) => {
    setActionLoading(memberId + '-reject');
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberId);
    setActionLoading(null);
    // Refresh
    const event = new Event('refresh-members');
    window.dispatchEvent(event);
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    setIsLeavingGroup(true);
    setShowLeaveConfirmation(false);
    try {
      // Find the membership record to delete
      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      if (membershipError) throw membershipError;
      if (!membership) throw new Error('Membership not found');

      // Check if the user is the owner
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();
      if (groupError) throw groupError;
      const isOwnerLeaving = groupData && groupData.owner_id === user.id;

      // Remove the user from the group
      const { error: leaveError } = await supabase
        .from('group_members')
        .delete()
        .eq('id', membership.id);
      if (leaveError) throw leaveError;

      // Check if the group is now empty
      const { data: remainingMembers, error: countError } = await supabase
        .from('group_members')
        .select('user_id, status, joined_at')
        .eq('group_id', groupId);
      if (countError) throw countError;

      if (!remainingMembers || remainingMembers.length === 0) {
        // Delete chat messages first
        const { error: messagesError } = await supabase
          .from('chat_messages')
          .delete()
          .eq('group_id', groupId);
        if (messagesError) throw messagesError;
        // Delete the group
        const { error: groupDeleteError } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId);
        if (groupDeleteError) throw groupDeleteError;
        toast({
          title: "Group deleted",
          description: `You were the last member, so the group has been deleted`,
        });
        onBack();
        return;
      }

      if (isOwnerLeaving) {
        // Transfer ownership to the next eligible member (the first member after the owner)
        const eligibleMembers = remainingMembers.filter((m: any) => m.status !== 'pending');
        if (eligibleMembers.length > 0) {
          eligibleMembers.sort((a: any, b: any) => {
            if (a.joined_at && b.joined_at) {
              return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
            }
            return a.user_id.localeCompare(b.user_id);
          });
          // Find the member who joined after the owner (index 1)
          let newOwnerId;
          if (eligibleMembers.length > 1) {
            newOwnerId = eligibleMembers[1].user_id;
          } else {
            newOwnerId = eligibleMembers[0].user_id;
          }
          // Update groups.owner_id
          const { error: updateOwnerError } = await supabase
            .from('groups')
            .update({ owner_id: newOwnerId })
            .eq('id', groupId);
          if (updateOwnerError) throw updateOwnerError;
          // Update group_members.status for new owner
          const { error: updateStatusError } = await supabase
            .from('group_members')
            .update({ status: 'owner' })
            .eq('group_id', groupId)
            .eq('user_id', newOwnerId);
          if (updateStatusError) throw updateStatusError;
          toast({
            title: "Ownership transferred",
            description: `Ownership has been transferred to the next member`,
          });
        } else {
          // No eligible members, delete group as above
          const { error: messagesError } = await supabase
            .from('chat_messages')
            .delete()
            .eq('group_id', groupId);
          if (messagesError) throw messagesError;
          const { error: groupDeleteError } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);
          if (groupDeleteError) throw groupDeleteError;
          toast({
            title: "Group deleted",
            description: `No eligible members left, so the group has been deleted`,
          });
        }
      } else {
        toast({
          title: "Group left",
          description: `You have left the group`,
        });
      }
      onBack();
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

  // Listen for refresh event
  useEffect(() => {
    const handler = () => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 100); // force re-fetch
    };
    window.addEventListener('refresh-members', handler);
    return () => window.removeEventListener('refresh-members', handler);
  }, []);

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1 flex flex-row items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2 rounded-full p-2 bold-back-arrow">←</Button>
          <h2 className="text-xl font-semibold text-alike-navy">{groupName} Members</h2>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading members...</p>
        ) : userStatus === 'pending' ? (
          <p className="text-muted-foreground">Your request to join this group is pending approval from the owner.</p>
        ) : (
          <>
            {isOwner && pendingMembers.length > 0 && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-alike-navy mb-4">Pending Join Requests</h3>
                <ul className="divide-y mb-4">
                  {pendingMembers.map((m) => (
                    <li key={m.id} className="py-3 flex items-center justify-between">
                      <span className="font-medium text-alike-navy">{m.name}</span>
                      <span className="text-muted-foreground text-sm">Pending approval</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h3 className="font-semibold text-alike-navy mb-2">Members</h3>
            {members.length === 0 ? (
              <p className="text-muted-foreground">No other members found.</p>
            ) : (
              <ul className="divide-y">
                {[...members].sort((a, b) => b.alike - a.alike).map((m) => (
                  <li key={m.id} className="py-3 flex items-center justify-between">
                    <span className="font-medium text-alike-navy">
                      {m.name}
                      {m.status === 'owner' && ' (Owner)'}
                    </span>
                    <span className="text-alike-teal font-semibold">{m.alike}% alike</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8 flex flex-col items-center gap-4">
              <Button
                onClick={() => setShowLeaveConfirmation(true)}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                Leave Group
              </Button>
            </div>
            <Dialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leave Group</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to leave "{groupName}"?
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupMembersPage; 