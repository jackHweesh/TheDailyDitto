import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const HowToPlay: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasVoted, setHasVoted] = useState(false);

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
      <Header hasVoted={hasVoted} onLogoClick={() => navigate('/')} />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative pt-0">
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
          <div className="text-lg text-alike-navy space-y-4">
            <p className="font-semibold">Welcome to Ditto — the daily social polling game that brings people closer with every vote.</p>
            <p className="font-semibold">Each day, you'll answer a fun, thought-provoking question. Then, compare your answer with the world! To see past results, click on and change the calendar date.</p>
            <p className="font-semibold">Want to get more personal? Create custom groups to compare responses with your friends and family.</p>
            <p className="font-semibold">Tap on any option to see exactly who voted for what — no secrets here!</p>
            <p className="font-semibold">And for a little extra fun, check out the icon next to each group name to see your match percentage — it shows how often you and someone else answer the same way, based on shared questions you've both completed.</p>
            <p className="font-semibold">Curious what others think? Let's find out.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HowToPlay; 