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
import FriendInvite from "./pages/FriendInvite";
import GroupInvite from "./pages/GroupInvite";
import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';

const queryClient = new QueryClient();

const App = () => {
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: Style.Dark }); // Makes system icons dark/gray
      StatusBar.setBackgroundColor({ color: '#F6F6F7' }); // Match safe area background
    }
  }, [isNative]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className={`app-container ${isNative ? 'native-app' : ''}`}>
            <BrowserRouter>
              <Routes>
                <Route path="/reset-password" element={
                  <div className="min-h-screen bg-alike-lightgray flex flex-col">
                    <div className="flex-1 flex items-center justify-center p-4">
                      <ResetPasswordForm />
                    </div>
                  </div>
                } />
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
                <Route path="/invite/friend/:token" element={<FriendInvite />} />
                <Route path="/invite/group/:token" element={<GroupInvite />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
