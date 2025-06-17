import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const Contact: React.FC = () => {
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
      <Header hasVoted={hasVoted} onLogoClick={() => navigate('/')} fixed={false} streak={0} />
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
          <h1 className="text-2xl font-bold mb-6">Contact Us</h1>
          <p className="text-lg text-alike-navy font-semibold">
            Need to contact us? <br />
            Email us at emailthedailyditto@gmail.com
          </p>
        </Card>
      </div>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} TheDailyDitto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Contact; 