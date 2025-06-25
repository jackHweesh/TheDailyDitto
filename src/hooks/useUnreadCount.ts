import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface UnreadCounts {
  [groupId: string]: number;
}

export const useUnreadCount = () => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  // Track which group the user is currently viewing
  const currentGroupId = useRef<string | null>(null);
  // Track pending visits to prevent race conditions
  const pendingVisits = useRef<Set<string>>(new Set());
  // Track the last visit timestamp to prevent duplicate calls
  const lastVisitTimestamps = useRef<Record<string, number>>({});
  // Debounce timer for visit tracking
  const visitDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch unread counts for all user's groups
  const fetchUnreadCounts = async () => {
    if (!user) {
      setUnreadCounts({});
      setIsLoading(false);
      return;
    }

    try {
      // Get all groups the user is a member of
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .neq('status', 'pending');

      if (membershipError) throw membershipError;

      if (!membershipData || membershipData.length === 0) {
        setUnreadCounts({});
        setIsLoading(false);
        return;
      }

      const groupIds = membershipData.map(m => m.group_id);

      // Get last visit times for each group
      const { data: visitData, error: visitError } = await supabase
        .from('group_visits')
        .select('group_id, last_visited_at')
        .eq('user_id', user.id)
        .in('group_id', groupIds);

      if (visitError) throw visitError;

      // Create a map of last visit times
      const lastVisits: { [groupId: string]: string } = {};
      visitData?.forEach(visit => {
        lastVisits[visit.group_id] = visit.last_visited_at;
      });

      // Calculate unread counts for each group
      const counts: UnreadCounts = {};
      
      for (const groupId of groupIds) {
        const lastVisited = lastVisits[groupId];
        console.log(`fetchUnreadCounts: Group ${groupId}, lastVisited: ${lastVisited}`);
        
        if (lastVisited) {
          // Count messages created after last visit
          const { count, error: countError } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .gt('created_at', lastVisited);

          if (countError) {
            console.error('Error counting unread messages:', countError);
            counts[groupId] = 0;
          } else {
            counts[groupId] = count || 0;
            console.log(`fetchUnreadCounts: Group ${groupId} has ${count} unread messages (after ${lastVisited})`);
          }
        } else {
          // If never visited, count all messages
          const { count, error: countError } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId);

          if (countError) {
            console.error('Error counting unread messages:', countError);
            counts[groupId] = 0;
          } else {
            counts[groupId] = count || 0;
            console.log(`fetchUnreadCounts: Group ${groupId} has ${count} unread messages (never visited)`);
          }
        }
      }

      console.log('fetchUnreadCounts: Final counts:', counts);
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      setUnreadCounts({});
    } finally {
      setIsLoading(false);
    }
  };

  // Mark a group as visited (reset unread count)
  const markGroupAsVisited = useCallback(async (groupId: string) => {
    if (!user) {
      console.log('markGroupAsVisited: No user found');
      return;
    }

    // Prevent race conditions
    if (pendingVisits.current.has(groupId)) {
      console.log(`markGroupAsVisited: Group ${groupId} already being processed, skipping`);
      return;
    }

    // Debounce rapid calls (within 1 second)
    const now = Date.now();
    const lastVisit = lastVisitTimestamps.current[groupId] || 0;
    if (now - lastVisit < 1000) {
      console.log(`markGroupAsVisited: Debouncing rapid call for group ${groupId}`);
      return;
    }

    // Clear existing debounce timer
    if (visitDebounceTimers.current[groupId]) {
      clearTimeout(visitDebounceTimers.current[groupId]);
    }

    // Set debounce timer
    visitDebounceTimers.current[groupId] = setTimeout(async () => {
      await performMarkGroupAsVisited(groupId);
    }, 100);

  }, [user]);

  // Actual implementation of marking group as visited
  const performMarkGroupAsVisited = async (groupId: string) => {
    if (!user) return;

    // Mark as pending to prevent race conditions
    pendingVisits.current.add(groupId);
    const timestamp = new Date().toISOString();
    
    console.log(`performMarkGroupAsVisited: Marking group ${groupId} as visited at ${timestamp} for user ${user.id}`);

    try {
      const { data, error } = await supabase
        .from('group_visits')
        .upsert({
          user_id: user.id,
          group_id: groupId,
          last_visited_at: timestamp
        }, { onConflict: 'user_id,group_id' });

      if (error) {
        console.error('Error marking group as visited:', error);
        throw error;
      }

      // Update timestamp to prevent duplicate calls
      lastVisitTimestamps.current[groupId] = Date.now();

      console.log(`performMarkGroupAsVisited: Successfully updated group_visits for group ${groupId}`, data);

      // Update local state
      setUnreadCounts(prev => ({
        ...prev,
        [groupId]: 0
      }));

      console.log(`performMarkGroupAsVisited: Updated local unread count for group ${groupId} to 0`);
    } catch (error) {
      console.error('Error marking group as visited (outer catch):', error);
    } finally {
      // Remove from pending visits
      pendingVisits.current.delete(groupId);
    }
  };

  // Set the current group being viewed
  const setCurrentGroup = useCallback((groupId: string | null) => {
    console.log(`setCurrentGroup: ${currentGroupId.current} -> ${groupId}`);
    currentGroupId.current = groupId;
  }, []);

  // Handle real-time new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          const messageGroupId = newMessage.group_id;
          
          console.log(`Real-time message received for group ${messageGroupId}, current group: ${currentGroupId.current}`);
          
          // Only increment unread count if user is not currently viewing this group
          if (messageGroupId !== currentGroupId.current) {
            console.log(`Incrementing unread count for group ${messageGroupId} (user not viewing)`);
            setUnreadCounts(prev => ({
              ...prev,
              [messageGroupId]: (prev[messageGroupId] || 0) + 1
            }));
          } else {
            console.log(`Not incrementing unread count for group ${messageGroupId} (user is viewing)`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Initialize and refresh counts periodically
  useEffect(() => {
    fetchUnreadCounts();

    if (!user) return;

    // Refresh counts every 2 minutes to catch new messages
    const interval = setInterval(() => {
      fetchUnreadCounts();
    }, 120000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  return {
    unreadCounts,
    isLoading,
    markGroupAsVisited,
    setCurrentGroup,
    refreshUnreadCounts: fetchUnreadCounts
  };
}; 