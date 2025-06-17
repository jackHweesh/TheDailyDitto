import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Capacitor } from '@capacitor/core';
import './styles/mobile.css';
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import HowToPlay from "./pages/HowToPlay";
import Profile from "./pages/Profile";
import SignupPrompt from "./components/auth/SignupPrompt";
import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  // Block all routes except /reset-password if in recovery session
  const isRecovery = location.search.includes('type=recovery') || location.hash.includes('type=recovery');
  if (isRecovery && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }
  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/groups/:groupId" element={<Dashboard />} />
      <Route path="/groups/:groupId/results" element={<Dashboard />} />
      <Route path="/groups/:groupId/members" element={<Dashboard />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/how-to-play" element={<HowToPlay />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/signup-prompt" element={<SignupPrompt />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const isNative = Capacitor.isNativePlatform();
  const location = window.location;
  const isRecovery = location.search.includes('type=recovery') || location.hash.includes('type=recovery');

  useEffect(() => {
    if (isNative) {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: Style.Dark }); // Makes system icons dark/gray
      StatusBar.setBackgroundColor({ color: '#F6F6F7' }); // Match safe area background
    }
  }, [isNative]);

  if (isRecovery) {
    return <ResetPasswordForm />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className={`app-container ${isNative ? 'native-app' : ''}`}>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
