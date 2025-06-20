import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, subDays, isSameDay, addDays } from 'date-fns';

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

        const today = new Date();
        const mostRecentVote = dates[0];
        
        // If the most recent vote was today, calculate streak including today
        if (isSameDay(mostRecentVote, today)) {
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
          return;
        }

        // If the most recent vote was yesterday, check if streak is still valid
        const yesterday = subDays(today, 1);
        if (isSameDay(mostRecentVote, yesterday)) {
          // User hasn't voted today but voted yesterday - streak is still valid
          let currentStreak = 1;
          let currentDate = yesterday;

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
          return;
        }

        // If the most recent vote was more than 1 day ago, streak is broken
        setStreak(0);
      } catch (error) {
        console.error('Error calculating streak:', error);
        setStreak(0);
      }
    };

    calculateStreak();
  }, [user]);

  return streak;
}; 