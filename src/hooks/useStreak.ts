import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, subDays, isSameDay } from 'date-fns';

export const useStreak = () => {
  const [streak, setStreak] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const calculateStreak = async () => {
      if (!user) {
        setStreak(0);
        return;
      }

      try {
        // Get all votes for the user
        const { data: votes, error } = await supabase
          .from('votes')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!votes || votes.length === 0) {
          setStreak(0);
          return;
        }

        // Convert dates to local time and sort by date
        const dates = votes.map(vote => new Date(vote.created_at));
        dates.sort((a, b) => b.getTime() - a.getTime());

        // Check if the most recent vote was today
        const today = new Date();
        const mostRecentVote = dates[0];
        
        if (!isSameDay(mostRecentVote, today)) {
          setStreak(0);
          return;
        }

        // Calculate streak
        let currentStreak = 1;
        let currentDate = today;

        for (let i = 1; i < dates.length; i++) {
          const previousDate = subDays(currentDate, 1);
          const voteDate = dates[i];

          if (isSameDay(voteDate, previousDate)) {
            currentStreak++;
            currentDate = previousDate;
          } else {
            break;
          }
        }

        setStreak(currentStreak);
      } catch (error) {
        console.error('Error calculating streak:', error);
        setStreak(0);
      }
    };

    calculateStreak();
  }, [user]);

  return streak;
}; 