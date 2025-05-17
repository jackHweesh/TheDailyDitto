import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface GroupMembersPageProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

interface Member {
  id: string;
  name: string;
  alike: number;
  status: string;
}

const GroupMembersPage: React.FC<GroupMembersPageProps> = ({ groupId, groupName, onBack }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string>('pending');
  const { toast } = useToast();

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
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2 rounded-full p-2">←</Button>
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
                {members.map((m) => (
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupMembersPage; 