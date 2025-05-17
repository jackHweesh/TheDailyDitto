import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GearIcon } from '@/components/ui/button';
import QuestionOfDay from '@/components/poll/QuestionOfDay';
import ResultsView from '@/components/poll/ResultsView';
import GroupView from '@/components/group/GroupView';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import ProfileView from '@/components/profile/ProfileView';
import Logo from '@/components/Logo';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

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
  
  const latestQuestionId = useRef<string | null>(null);
  
  // Redirect to auth if not signed in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Fetch today's question (rotating from question bank)
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        // Get today's date in local timezone as YYYY-MM-DD
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        // Fetch the question for today
        const { data: questionsData, error: questionsError } = await supabase
          .from('daily_questions')
          .select('id, question, options, active_date')
          .eq('active_date', todayStr)
          .single();
        if (questionsError && questionsError.code !== 'PGRST116') throw questionsError;
        if (!questionsData) {
          setQuestion(null);
          setHasVoted(false);
          setResults([]);
          return;
        }
        const parsedOptions = typeof questionsData.options === 'string'
          ? JSON.parse(questionsData.options)
          : questionsData.options;
        setQuestion({
          id: questionsData.id,
          text: questionsData.question,
          options: Array.isArray(parsedOptions) ? parsedOptions : []
        });
        latestQuestionId.current = questionsData.id;
        // Check if user has voted for this question
        await checkUserVote(questionsData.id);
        // Always fetch results for the question
        await fetchResults(questionsData.id);
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
          setView(DashboardView.RESULTS);
        } else {
          setHasVoted(false);
        }
      }
    };
    fetchQuestions();
  }, [user, toast]);
  
  // Fetch results when user has voted or on refresh
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
      if (question && question.id === questionId) {
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
      if (question && question.id === questionId) {
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
  
  // Auto-refresh results when entering the RESULTS view
  useEffect(() => {
    if (view === DashboardView.RESULTS && latestQuestionId.current) {
      fetchResults(latestQuestionId.current);
    }
    // Only run when view or question changes
  }, [view, question]);
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Settings"
                  className="text-gray-500 hover:text-gray-700 text-2xl h-8 w-8"
                >
                  <GearIcon className="w-full h-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setView(DashboardView.PROFILE)}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/how-to-play')}>How to Play</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/contact')}>Contact Us</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/privacy-policy')}>Privacy Policy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/terms-of-service')}>Terms of Service</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700 text-xl h-12 px-6"
            >
              Log out
            </Button>
          </div>
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
              isLoading={resultsLoading}
              onRefresh={() => fetchResults(question.id)}
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
            isLoading={resultsLoading}
            onRefresh={() => fetchResults(question.id)}
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
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} TheOfficialDitto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
