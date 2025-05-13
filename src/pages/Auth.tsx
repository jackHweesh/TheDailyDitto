
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      {renderAuthComponent()}
    </div>
  );
};

export default Auth;
