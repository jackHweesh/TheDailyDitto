import React, { createContext, useContext, useEffect, useState, FC, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { PostgrestBuilder } from '@supabase/postgrest-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ success: boolean; voteTransferred: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface VoteData {
  id: string;
  selected_option: string;
  question_id: string;
  created_at: string;
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        } else {
          setIsPasswordRecovery(false);
        }
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);

        if (event === 'SIGNED_IN' && currentSession?.user) {
          const pendingInvite = localStorage.getItem('pendingFriendInvite');
          if (pendingInvite) {
            localStorage.removeItem('pendingFriendInvite');
            try {
              const accessToken = currentSession.access_token;
              const response = await fetch('https://clvtxmkpsmacvhvyhwob.functions.supabase.co/accept-friend-invite', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  token: pendingInvite,
                  recipient_user_id: currentSession.user.id,
                }),
              });
              if (!response.ok) {
                const errorData = await response.json();
                toast({
                  title: "Friend invite error",
                  description: errorData.error || "Failed to accept friend request.",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Friend request accepted!",
                  description: "You are now friends with this user.",
                });
              }
            } catch (error) {
              toast({
                title: "Friend invite error",
                description: "An error occurred while processing the invite.",
                variant: "destructive",
              });
            }
          }
        }
      }
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [toast]);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isPasswordRecovery,
    signUp: async (email: string, password: string, userData: any) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: userData },
        });
        if (error) {
            console.error('Sign up error:', error);
            toast({
                title: "Sign up error",
                description: error.message || "An error occurred",
                variant: "destructive",
            });
            throw error;
        }
        toast({
            title: "Verify Your Email",
            description: "Please check your email to confirm your account.",
        });
        return { success: true, voteTransferred: false };
    },
    signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Sign in error:', error);
            toast({
                title: "Login error",
                description: error.message || "An error occurred",
                variant: "destructive",
            });
            throw error;
        }
    },
    signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
    },
    resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        });
        if (error) {
            console.error('Password reset error:', error);
            toast({
                title: "Password reset error",
                description: error.message || "An error occurred",
                variant: "destructive",
            });
            throw error;
        }
    },
    updatePassword: async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            console.error('Password update error:', error);
            toast({
                title: "Password update error",
                description: error.message || "An error occurred",
                variant: "destructive",
            });
            throw error;
        }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
