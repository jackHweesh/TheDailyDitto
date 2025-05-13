
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import QuestionOfDay from '@/components/poll/QuestionOfDay';
import ResultsView from '@/components/poll/ResultsView';
import GroupView from '@/components/group/GroupView';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Predefined colors for results visualization
const RESULT_COLORS = [
  '#4FD1C5', // teal
  '#667EEA', // indigo
  '#F6AD55', // orange
  '#FC8181', // red
  '#9F7AEA', // purple
];

enum DashboardView {
  QUESTION,
  RESULTS,
  GROUPS
}

const Dashboard: React.FC = () => {
  const [view, setView] = useState<DashboardView>(DashboardView.QUESTION);
  const [question, setQuestion] = useState<{ id: string; text: string; options: string[] } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<Array<{ option: string; votes: number; percentage: number; color: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to auth if not signed in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Fetch today's question
  useEffect(() => {
    const fetchQuestion = async () => {
      setIsLoading(true);
      try {
        // Get today's question
        const today = new Date().toISOString().split('T')[0];
        const { data: questionData, error: questionError } = await supabase
          .from('daily_questions')
          .select('id, question, options')
          .eq('active_date', today)
          .single();
        
        if (questionError) {
          // If no question for today, use the most recent one
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('daily_questions')
            .select('id, question, options')
            .order('active_date', { ascending: false })
            .limit(1)
            .single();
            
          if (fallbackError) throw fallbackError;
          
          if (fallbackData) {
            const parsedOptions = typeof fallbackData.options === 'string' 
              ? JSON.parse(fallbackData.options) 
              : fallbackData.options;
              
            setQuestion({
              id: fallbackData.id,
              text: fallbackData.question,
              options: Array.isArray(parsedOptions) ? parsedOptions : []
            });
            
            // Check if user has voted for this fallback question
            await checkUserVote(fallbackData.id);
          }
        } else {
          const parsedOptions = typeof questionData.options === 'string' 
            ? JSON.parse(questionData.options) 
            : questionData.options;
            
          setQuestion({
            id: questionData.id,
            text: questionData.question,
            options: Array.isArray(parsedOptions) ? parsedOptions : []
          });
          
          // Check if user has voted
          await checkUserVote(questionData.id);
        }
      } catch (error: any) {
        toast({
          title: "Error loading question",
          description: error.message || "Could not load today's question",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    const checkUserVote = async (questionId: string) => {
      if (user) {
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .select('selected_option')
          .eq('question_id', questionId)
          .eq('user_id', user.id)
          .single();
          
        if (voteData) {
          setHasVoted(true);
          await fetchResults(questionId);
        }
      }
    };
    
    fetchQuestion();

    // Subscribe to vote changes to update results in real-time
    const channel = supabase
      .channel('votes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes'
        },
        (payload) => {
          if (question) {
            fetchResults(question.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
  
  // Fetch results when user has voted
  const fetchResults = async (questionId: string) => {
    try {
      // Get all votes for the question to calculate totals
      const { data: allVotesData, error: allVotesError } = await supabase
        .from('votes')
        .select('selected_option')
        .eq('question_id', questionId);
        
      if (allVotesError) throw allVotesError;
      
      // Count votes for each option
      const voteCounts: Record<string, number> = {};
      if (question) {
        // Initialize all options with zero votes
        question.options.forEach(option => {
          voteCounts[option] = 0;
        });
      }
      
      // Count actual votes
      if (allVotesData && allVotesData.length > 0) {
        allVotesData.forEach(vote => {
          const option = vote.selected_option;
          voteCounts[option] = (voteCounts[option] || 0) + 1;
        });
      }
      
      // Calculate total votes
      const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
      
      // Format results
      if (question) {
        const formattedResults = question.options.map((option, index) => {
          const votes = voteCounts[option] || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          
          return {
            option,
            votes,
            percentage,
            color: RESULT_COLORS[index % RESULT_COLORS.length]
          };
        });
        
        setResults(formattedResults);
      }
    } catch (error: any) {
      toast({
        title: "Error loading results",
        description: error.message || "Could not load voting results",
        variant: "destructive"
      });
    }
  };
  
  // Handle when user submits a vote
  const handleVoteSubmit = async (selectedOption: string) => {
    if (question) {
      setHasVoted(true);
      await fetchResults(question.id);
      setView(DashboardView.RESULTS);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      // Error is already handled in the signOut function
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-alike-navy">Alike</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="text-gray-500 hover:text-gray-700"
          >
            Log out
          </Button>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : view === DashboardView.QUESTION && question ? (
          hasVoted ? (
            <div className="text-center mb-6">
              <p className="text-muted-foreground">You've already voted today!</p>
              <Button 
                onClick={() => setView(DashboardView.RESULTS)}
                className="bg-alike-teal hover:bg-alike-teal/90 text-white mt-2"
              >
                View Results
              </Button>
            </div>
          ) : (
            <QuestionOfDay 
              question={question.text}
              options={question.options}
              questionId={question.id}
              onVoteSubmit={handleVoteSubmit}
            />
          )
        ) : view === DashboardView.RESULTS && question ? (
          <ResultsView
            question={question.text}
            results={results}
            onViewGroups={() => setView(DashboardView.GROUPS)}
          />
        ) : view === DashboardView.GROUPS && question ? (
          <GroupView 
            questionId={question.id}
            onBack={() => setView(DashboardView.RESULTS)}
          />
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">No active question found. Check back later!</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Alike. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
