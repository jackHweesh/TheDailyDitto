
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Group {
  id: string;
  name: string;
  memberCount: number;
}

interface GroupViewProps {
  groups: Group[];
  activeGroup?: Group;
  onSelectGroup: (group: Group) => void;
}

const GroupView: React.FC<GroupViewProps> = ({ groups, activeGroup, onSelectGroup }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const { toast } = useToast();

  const handleJoinGroup = () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Invite code required",
        description: "Please enter a valid invite code",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Joining group",
      description: "In the full app, this would connect to Supabase to join a group.",
    });
    
    // Clear the input
    setInviteCode('');
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Creating group",
      description: "In the full app, this would connect to Supabase to create a group.",
    });
    
    // Clear the input
    setNewGroupName('');
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1">
        <h2 className="text-xl font-semibold text-alike-navy">My Groups</h2>
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
            {groups.length === 0 ? (
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
                  onClick={() => onSelectGroup(group)}
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
      </CardContent>
    </Card>
  );
};

export default GroupView;
