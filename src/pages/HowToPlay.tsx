import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useStreak } from '@/hooks/useStreak';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const HowToPlay: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasVoted, setHasVoted] = useState(false);
  const streak = useStreak();

  useEffect(() => {
    const checkUserVote = async () => {
      if (user) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const { data: question } = await supabase
          .from('daily_questions')
          .select('id')
          .eq('active_date', todayStr)
          .single();
        if (question) {
          const { data: voteData } = await supabase
            .from('votes')
            .select('id')
            .eq('question_id', question.id)
            .eq('user_id', user.id)
            .single();
          setHasVoted(!!voteData);
        } else {
          setHasVoted(false);
        }
      }
    };
    checkUserVote();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header hasVoted={hasVoted} onLogoClick={() => navigate('/')} fixed={false} streak={streak} />
      <main className="content-area flex-1 flex flex-col">
        <div className="flex flex-col items-center justify-center bg-gray-50 relative pt-0">
          <Card className="w-full max-w-xl p-8 mt-8 text-center relative">
            <div className="absolute left-4 top-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-xl font-normal"
                aria-label="Back"
              >
                <ArrowLeft className="w-9 h-9 stroke-2" />
              </Button>
            </div>
            <h1 className="text-2xl font-bold mb-6">How to Play</h1>
            <div className="text-lg text-alike-navy space-y-2 text-left">
              <p><strong>Welcome to Ditto</strong> — the daily social polling game that brings people closer with every vote. Each day, you'll answer a fun, thought-provoking question. Then, see how your answer stacks up against the rest of the world!</p>
              <br />
              <p className="text-left"><strong>Creating Groups</strong></p>
              <p>Want to get more personal? Create custom groups to compare responses with your friends and family. Inside your groups, tap any option to see exactly who voted for what — no secrets here! You can even chat within your groups to (politely) debate those very questionable choices.</p>
              <br />
              <p className="text-left"><strong>Friends Group</strong></p>
              <p>Your Friends Group is a special space automatically created for every Ditto user.  It's your personal list where you can see responses <em>only</em> from the people you choose.</p>
              <p>Add friends to this group by clicking the <strong>star icon</strong> next to the name of someone you're already in a group with, or by inviting someone to be friends by clicking the <strong>Send Friend Invite</strong> button. We'll copy a personal invite message to your clipboard — just paste it into a text, email, or DM to make them your Ditto friend. Once they log in or create a new account with the link you sent, you'll automatically appear in each other's Friends Groups.</p>
              <p>Friends can't see who's in your Friends Group (and there's no chat here), but it's the perfect way to check in on select people — even those you're not in another group with.</p>
              <br />
              <p className="text-left"><strong>Calendar</strong></p>
              <p>Want to see what you've missed or how the final results ended up after everyone voted? Tap the calendar icon to view past questions and results.You can't vote on missed days, so make sure Ditto is part of your daily routine and keep that streak alive!</p>
              <br />
              <p><strong>Who are You Most Alike?</strong></p>
              <p>Curious who votes the most like you? Tap the <strong>people icon</strong> next to any group name to check your <strong>match percentage</strong> — it shows how often you and someone else vote the same, based on questions you've both answered. The more you play, the more accurate those results become.</p>
              <br />
              <p>Curious what others think? Let's find out!</p>
            </div>
          </Card>
        </div>
      </main>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} TheDailyDitto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HowToPlay; 