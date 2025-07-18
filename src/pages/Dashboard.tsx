import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
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
import { getBrowserFingerprint } from '@/utils/fingerprint';
import { Capacitor } from '@capacitor/core';
import Header from '@/components/Header';
import { subDays, isSameDay } from 'date-fns';
import { useStreak } from '@/hooks/useStreak';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { ExoClickInterstitial } from '@/components/integrations/ExoClickInterstitial';

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
  const [currentView, setCurrentView] = useState<DashboardView>(DashboardView.QUESTION);
  const [questionData, setQuestionData] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<Array<{ option: string; votes: number; percentage: number; color: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isVoteStatusLoading, setIsVoteStatusLoading] = useState(true);
  const [showAd, setShowAd] = useState(false);
  
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId } = useParams();
  const streak = useStreak();
  
  const latestQuestionId = useRef<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  // Helper function to check if the user has voted
  const checkUserVote = async (questionId: string, userId: string | null, fingerprint: string) => {
    // If user is logged in, only check their user_id votes
    if (userId) {
      const { data: userVoteData } = await supabase
        .from('votes')
        .select('selected_option')
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .limit(1);
      return Array.isArray(userVoteData) && userVoteData.length > 0;
    }
    
    // If user is not logged in, check anonymous vote
    const { data: anonVoteData } = await supabase
      .from('votes')
      .select('selected_option')
      .eq('question_id', questionId)
      .eq('browser_fingerprint', fingerprint)
      .is('user_id', null)
      .limit(1);
    return Array.isArray(anonVoteData) && anonVoteData.length > 0;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsVoteStatusLoading(true);
      try {
        // Get today's date as YYYY-MM-DD
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        // Fetch today's question
        const { data: questionData, error: questionError } = await supabase
          .from('daily_questions')
          .select('*')
          .eq('active_date', todayStr)
          .single();
        if (questionError) throw questionError;
        if (questionData) {
          const isNewQuestion = latestQuestionId.current !== questionData.id;
          setQuestionData(questionData);
          latestQuestionId.current = questionData.id;
          // Get fingerprint
          const fingerprint = await getBrowserFingerprint();
          // Check vote
          const voted = await checkUserVote(questionData.id, user?.id ?? null, fingerprint);
          setHasVoted(voted);

          // Set initial view based on vote status only on first load
          if (isFirstLoad) {
            if (voted) {
              setCurrentView(DashboardView.RESULTS);
              await fetchResults(questionData.id);
            } else {
              setCurrentView(DashboardView.QUESTION);
            }
            setIsFirstLoad(false);
          }
        }
      } catch (error: any) {
        console.error('Error fetching questions:', error);
        toast({
          title: "Error loading question",
          description: error.message || "Could not load today's question",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        setIsVoteStatusLoading(false);
      }
    };
    fetchData();
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
      if (questionData && questionData.id === questionId) {
        // Initialize all options with zero votes
        questionData.options.forEach(option => {
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
      if (questionData && questionData.id === questionId) {
        const formattedResults = questionData.options.map((option, index) => {
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
    if (questionData) {
      setHasVoted(true);
      setResultsLoading(true);

      setShowAd(true);

      await new Promise<void>((resolve) => {
        const handler = () => {
          setShowAd(false);
          window.removeEventListener('exoclickAdDisplayed', handler);
          resolve();
        };
        window.addEventListener('exoclickAdDisplayed', handler);
        setTimeout(() => {
          setShowAd(false);
          window.removeEventListener('exoclickAdDisplayed', handler);
          resolve();
        }, 10000); // 10s fallback
      });

      await fetchResults(questionData.id);
      setCurrentView(DashboardView.RESULTS);
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
    if (currentView === DashboardView.RESULTS && latestQuestionId.current) {
      fetchResults(latestQuestionId.current);
    }
    // Only run when view or question changes
  }, [currentView, questionData]);

  // Handle group routes
  useEffect(() => {
    if (location.pathname.startsWith('/groups/')) {
      setCurrentView(DashboardView.GROUPS);
    }
  }, [location.pathname]);
  
  const handleGroupsBack = () => {
    setCurrentView(DashboardView.RESULTS);
    navigate('/');
  };

  // Guard: If user has already voted, never allow voting screen
  useEffect(() => {
    if (!isVoteStatusLoading && hasVoted && currentView === DashboardView.QUESTION) {
      // Only redirect to results if we're on the question view
      setCurrentView(DashboardView.RESULTS);
      if (questionData) {
        fetchResults(questionData.id);
      }
    }
  }, [hasVoted, currentView, isVoteStatusLoading, questionData]);

  // Guard: If user hasn't voted, never allow results or groups view
  useEffect(() => {
    if (!isVoteStatusLoading && !hasVoted) {
      // Only redirect to question if we're on results or groups view
      if (currentView === DashboardView.RESULTS || currentView === DashboardView.GROUPS) {
        setCurrentView(DashboardView.QUESTION);
      }
    }
  }, [currentView, hasVoted, isVoteStatusLoading]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header hasVoted={hasVoted} onLogoClick={() => setCurrentView(DashboardView.RESULTS)} streak={streak} />
      {/* Main content */}
      <main className="content-area flex-1 flex flex-col">
        <div className="container mx-auto px-4 py-8 flex-1 flex flex-col">
          {isLoading || isVoteStatusLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : currentView === DashboardView.GROUPS && questionData ? (
            <GroupView 
              questionId={questionData.id}
              onBack={() => setCurrentView(hasVoted ? DashboardView.RESULTS : DashboardView.QUESTION)}
              options={questionData.options}
              questionText={questionData.question}
            />
          ) : currentView === DashboardView.PROFILE ? (
            <ProfileView onBack={() => setCurrentView(hasVoted ? DashboardView.RESULTS : DashboardView.QUESTION)} />
          ) : currentView === DashboardView.RESULTS && questionData ? (
            <ResultsView
              question={questionData.question}
              results={results}
              onViewGroups={() => {
                setCurrentView(DashboardView.GROUPS);
                navigate('/groups');
              }}
              isLoading={resultsLoading}
              onRefresh={() => fetchResults(questionData.id)}
            />
          ) : currentView === DashboardView.QUESTION && questionData ? (
            <QuestionOfDay 
              question={questionData.question}
              options={questionData.options}
              questionId={questionData.id}
              onVoteSubmit={handleVoteSubmit}
            />
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground">No content available</p>
            </div>
          )}
        </div>
      </main>
      {/* Footer */}
      <footer className="fixed-footer bg-white border-t w-full">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} TheDailyDitto. All rights reserved.</p>
        </div>
      </footer>
      
      {/* ExoClick Interstitial Ad Overlay */}
      {showAd && (
        <div style={{
          position: 'fixed',
          zIndex: 10000,
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ExoClickInterstitial />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
