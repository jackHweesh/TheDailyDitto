import React, { useState, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import QuestionOfDay from '@/components/poll/QuestionOfDay';
import ResultsView from '@/components/poll/ResultsView';
import GroupView from '@/components/group/GroupView';
import WelcomeScreen from '@/components/welcome/WelcomeScreen';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import Settings from './Settings';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';

// Mock data for development
const mockResults = [
  { option: "Hollywood Movies", votes: 254, percentage: 32, color: "#4FD1C5" },
  { option: "Netflix Shows", votes: 217, percentage: 27, color: "#2D3748" },
  { option: "YouTube Videos", votes: 176, percentage: 22, color: "#9ae6df" },
  { option: "TV Series", votes: 98, percentage: 12, color: "#667eea" },
  { option: "Social Media Short videos", votes: 56, percentage: 7, color: "#c3dafe" },
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
  const { toast } = useToast();
  const { user } = useAuth();

  // Remove session-based redirect for /reset-password
  if (window.location.pathname === '/reset-password') {
    return (
      <div className="min-h-screen bg-alike-lightgray flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <ResetPasswordForm />
        </div>
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard (for all other routes)
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

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

  const handleStart = () => {
    setView(AppView.LOGIN); // For demo, always go to login
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
      default:
        return <WelcomeScreen onStart={handleStart} />;
    }
  };

  return (
    <Routes>
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="*" element={
        <div className="min-h-screen bg-alike-lightgray flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            {renderView()}
          </div>
        </div>
      } />
    </Routes>
  );
};

export default Index;
