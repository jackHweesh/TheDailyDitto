import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { useAuth } from '@/context/AuthContext';

enum AuthView {
  LOGIN,
  SIGNUP,
  FORGOT_PASSWORD
}

const Auth: React.FC = () => {
  const [view, setView] = useState(AuthView.LOGIN);
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  // Set initial view based on location state
  useEffect(() => {
    if (location.state?.view === 'signup') {
      setView(AuthView.SIGNUP);
    } else if (location.state?.view === 'login') {
      setView(AuthView.LOGIN);
    }
  }, [location.state]);
  
  // If authenticated, redirect to home
  if (user && !isLoading) {
    return <Navigate to="/" replace />;
  }
  
  const renderAuthComponent = () => {
    switch (view) {
      case AuthView.SIGNUP:
        return (
          <SignupForm
            onSwitchToLogin={() => setView(AuthView.LOGIN)}
          />
        );
      case AuthView.FORGOT_PASSWORD:
        return (
          <ForgotPasswordForm
            onBackToLogin={() => setView(AuthView.LOGIN)}
          />
        );
      case AuthView.LOGIN:
      default:
        return (
          <LoginForm
            onSwitchToSignup={() => setView(AuthView.SIGNUP)}
            onForgotPassword={() => setView(AuthView.FORGOT_PASSWORD)}
          />
        );
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center p-4">
        {renderAuthComponent()}
      </div>
      <footer className="bg-white border-t w-full">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} TheDailyDitto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Auth;
