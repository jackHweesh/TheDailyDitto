
import React, { useState } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import QuestionOfDay from '@/components/poll/QuestionOfDay';
import ResultsView from '@/components/poll/ResultsView';
import GroupView from '@/components/group/GroupView';
import WelcomeScreen from '@/components/welcome/WelcomeScreen';
import { useToast } from '@/components/ui/use-toast';

// Mock data for development
const mockResults = [
  { option: "Hollywood Movies", votes: 254, percentage: 32, color: "#4FD1C5" },
  { option: "Netflix Shows", votes: 217, percentage: 27, color: "#2D3748" },
  { option: "YouTube Videos", votes: 176, percentage: 22, color: "#9ae6df" },
  { option: "TV Series", votes: 98, percentage: 12, color: "#667eea" },
  { option: "Social Media Short videos", votes: 56, percentage: 7, color: "#c3dafe" },
];

const mockGroups = [
  { id: "1", name: "Family", memberCount: 5 },
  { id: "2", name: "College Friends", memberCount: 12 },
  { id: "3", name: "Work Colleagues", memberCount: 8 },
];

enum AppView {
  WELCOME,
  LOGIN,
  SIGNUP,
  FORGOT_PASSWORD,
  QUESTION,
  RESULTS,
  GROUPS
}

const Index = () => {
  const [view, setView] = useState<AppView>(AppView.WELCOME);
  const [activeGroup, setActiveGroup] = useState<typeof mockGroups[0] | undefined>(undefined);
  const { toast } = useToast();

  const handleLogin = () => {
    setView(AppView.LOGIN);
  };

  const handleSignup = () => {
    setView(AppView.SIGNUP);
  };

  const handleForgotPassword = () => {
    setView(AppView.FORGOT_PASSWORD);
  };

  const handleBackToLogin = () => {
    setView(AppView.LOGIN);
  };

  const handleVoteSubmit = (option: string) => {
    toast({
      title: "Vote submitted",
      description: `You voted for: ${option}`,
    });
    setView(AppView.RESULTS);
  };

  const handleViewGroups = () => {
    setView(AppView.GROUPS);
  };

  const handleSelectGroup = (group: typeof mockGroups[0]) => {
    setActiveGroup(group);
    toast({
      title: `${group.name} selected`,
      description: "Viewing group results and chat",
    });
  };

  // Mock login flow - in a real app this would check auth state
  // and show question directly if user is logged in
  const handleStart = () => {
    setView(AppView.LOGIN); // For demo, always go to login
  };

  // In a real app, this would be triggered after successful login
  const handleSuccessfulAuth = () => {
    setView(AppView.QUESTION);
  };

  // The following function is just for demo purposes to make navigation easier
  const handleDemoNavigation = () => {
    // In the real app with Supabase, this button wouldn't exist
    // This is just to make it easier to navigate between views in the demo
    const nextView = (view + 1) % 7;
    setView(nextView);
  };

  // Render current view
  const renderView = () => {
    switch (view) {
      case AppView.WELCOME:
        return <WelcomeScreen onStart={handleStart} />;
      case AppView.LOGIN:
        return <LoginForm onSwitchToSignup={handleSignup} onForgotPassword={handleForgotPassword} />;
      case AppView.SIGNUP:
        return <SignupForm onSwitchToLogin={handleLogin} />;
      case AppView.FORGOT_PASSWORD:
        return <ForgotPasswordForm onBackToLogin={handleBackToLogin} />;
      case AppView.QUESTION:
        return <QuestionOfDay onVoteSubmit={handleVoteSubmit} />;
      case AppView.RESULTS:
        return (
          <ResultsView 
            question="What do you prefer to watch?" 
            results={mockResults} 
            onViewGroups={handleViewGroups} 
          />
        );
      case AppView.GROUPS:
        return (
          <GroupView 
            groups={mockGroups} 
            activeGroup={activeGroup} 
            onSelectGroup={handleSelectGroup} 
          />
        );
      default:
        return <WelcomeScreen onStart={handleStart} />;
    }
  };

  return (
    <div className="min-h-screen bg-alike-lightgray flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        {renderView()}
      </div>
      
      {/* Demo Navigation - Would be removed in production */}
      <div className="fixed bottom-4 right-4">
        <button 
          onClick={handleDemoNavigation} 
          className="bg-alike-navy text-white px-4 py-2 rounded-lg text-xs"
        >
          Next Demo View
        </button>
      </div>

      {/* Simulate Auth Success - Would be removed in production */}
      <div className="fixed bottom-4 left-4">
        <button 
          onClick={handleSuccessfulAuth} 
          className="bg-alike-navy text-white px-4 py-2 rounded-lg text-xs"
        >
          Simulate Login
        </button>
      </div>
    </div>
  );
};

export default Index;
