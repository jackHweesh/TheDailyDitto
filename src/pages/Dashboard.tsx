import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import QuestionOfDay from '@/components/poll/QuestionOfDay';
import ResultsView from '@/components/poll/ResultsView';
import GroupView from '@/components/group/GroupView';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import ProfileView from '@/components/profile/ProfileView';

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
  GROUPS,
  PROFILE
}

const Dashboard: React.FC = () => {
  const [view, setView] = useState<DashboardView>(DashboardView.QUESTION);
  const [question, setQuestion] = useState<{ id: string; text: string; options: string[] } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<Array<{ option: string; votes: number; percentage: number; color: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to auth if not signed in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Fetch today's question (rotating from question bank)
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        // Fetch all questions from the bank
        const { data: questionsData, error: questionsError } = await supabase
          .from('daily_questions')
          .select('id, question, options')
          .order('created_at', { ascending: true });

        if (questionsError) throw questionsError;
        if (!questionsData || questionsData.length === 0) throw new Error('No questions found');

        // Determine which question to show today (local time)
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        const questionIndex = dayOfYear % questionsData.length;
        const todayQuestion = questionsData[questionIndex];
        const parsedOptions = typeof todayQuestion.options === 'string'
          ? JSON.parse(todayQuestion.options)
          : todayQuestion.options;
        setQuestion({
          id: todayQuestion.id,
          text: todayQuestion.question,
          options: Array.isArray(parsedOptions) ? parsedOptions : []
        });
        // Check if user has voted for this question
        await checkUserVote(todayQuestion.id);
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
        } else {
          setHasVoted(false);
        }
      }
    };
    fetchQuestions();
  }, [user, toast]);
  
  // Add a new useEffect for vote subscriptions
  useEffect(() => {
    if (!question || !question.id) return;
    
    console.log("Setting up vote subscription for question:", question.id);
    
    // Add subscription for vote changes on this specific question
    const channel = supabase
      .channel(`votes-for-question-${question.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `question_id=eq.${question.id}`
        },
        (payload) => {
          console.log("Vote change detected:", payload);
          // Add delay before fetching to allow Supabase to update
          setTimeout(() => {
            fetchResults(question.id);
          }, 750); // 750ms delay
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    // Set up periodic refresh (every 15 seconds)
    const intervalId = setInterval(() => {
      if ((view === DashboardView.RESULTS) && question) {
        console.log("Periodic refresh of results");
        fetchResults(question.id);
      }
    }, 15000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [question, view]);
  
  // Fetch results when user has voted
  const fetchResults = async (questionId: string) => {
    setResultsLoading(true);
    
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
    } finally {
      setResultsLoading(false);
    }
  };
  
  // Handle when user submits a vote
  const handleVoteSubmit = async (selectedOption: string) => {
    if (question) {
      setHasVoted(true);
      setResultsLoading(true);
      // Wait 750ms before fetching results to allow Supabase to update
      setTimeout(async () => {
        await fetchResults(question.id);
        setView(DashboardView.RESULTS);
      }, 750);
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
            <ResultsView
              question={question.text}
              results={results}
              onViewGroups={() => setView(DashboardView.GROUPS)}
              onProfile={() => setView(DashboardView.PROFILE)}
              isLoading={resultsLoading}
            />
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
            onProfile={() => setView(DashboardView.PROFILE)}
            isLoading={resultsLoading}
          />
        ) : view === DashboardView.GROUPS && question ? (
          <GroupView 
            questionId={question.id}
            onBack={() => setView(DashboardView.RESULTS)}
            options={question.options}
            questionText={question.text}
          />
        ) : view === DashboardView.PROFILE ? (
          <ProfileView onBack={() => setView(DashboardView.RESULTS)} />
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
