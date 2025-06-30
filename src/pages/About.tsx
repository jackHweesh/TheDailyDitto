import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useStreak } from '@/hooks/useStreak';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const About: React.FC = () => {
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
          <Card className="w-full max-w-2xl p-8 mt-8 relative">
            <div className="absolute left-4 top-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-xl font-normal"
                aria-label="Back"
              >
                <ArrowLeft className="w-6 h-6 stroke-2" />
              </Button>
            </div>
            <h1 className="text-2xl font-bold mb-6 text-center">About Ditto</h1>
            <div className="text-lg text-alike-navy space-y-2 text-left">
              <p><strong>Ditto</strong> is a daily social polling game designed to spark connection through curiosity.</p>
              <br />
              <p>Each day, we ask one fun, surprising, or thought-provoking question — and you get to see how your answer compares to everyone else's. Whether you're playing with the world, a group of friends, or just your personal favorites, it's always entertaining to see what people choose.</p>
              <br />
              <p>With custom groups, personal friend lists, real-time voting reveals, and group chats, Ditto isn't just about answering — it's about understanding how people <em>think</em>. Because sometimes the best conversations start with:</p>
              <br />
              <p>"Wait… you picked THAT?"</p>
              <br />
              <h2 className="text-xl font-bold mb-4">Why "Ditto"?</h2>
              <p>The word "ditto" means <em>"same here"</em> — and has been around since the 1600s.</p>
              <br />
              <p>Ditto is all about discovering those unexpected alignments (or perplexing disagreements) that bring people closer. Who agrees with you? Who doesn't? And who surprises you most?</p>
              <br />
              <h2 className="text-xl font-bold mb-4">The Family Behind the App</h2>
              <p>Ditto started as a simple idea from a mom who loved playing games with her family and friends at home or across the country. When she pitched the concept of a daily question game to her family, they were all on board! Her teenage son dedicated hundreds of hours to bring it to life with his coding skills.</p>
              <br />
              <p>From there, they all pitched in — writing questions, designing the look and feel, testing the features, and making sure it was something they'd genuinely want to play themselves. Ditto is a passion project, built to bring people together through curiosity, laughter, and connection.</p>
              <br />
              <p>Thanks for being here. We hope Ditto becomes part of your daily rhythm — and gives you a fun new way to see how people really think.</p>
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

export default About; 