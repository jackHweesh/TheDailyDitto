import React, { createContext, useContext, useEffect, useState } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface VoteData {
  id: string;
  selected_option: string;
  question_id: string;
  created_at: string;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        } else {
          setIsPasswordRecovery(false);
        }
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);

        // Handle pending friend invite after successful authentication
        if (event === 'SIGNED_IN' && currentSession?.user) {
          const pendingInvite = localStorage.getItem('pendingFriendInvite');
          if (pendingInvite) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const accessToken = session?.access_token;

              const response = await fetch('https://clvtxmkpsmacvhvyhwob.functions.supabase.co/accept-friend-invite', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                  token: pendingInvite,
                  recipient_user_id: currentSession.user.id,
                }),
              });

              const data = await response.json();

              if (response.ok) {
                toast({
                  title: "Friend request accepted!",
                  description: "You are now friends with this user.",
                });
              } else {
                toast({
                  title: "Friend invite error",
                  description: data.error || "Failed to accept friend request",
                  variant: "destructive",
                });
              }
            } catch (error: any) {
              toast({
                title: "Friend invite error",
                description: error.message || "An error occurred while processing the friend invite",
                variant: "destructive",
              });
            } finally {
              // Clear the pending invite regardless of success/failure
              localStorage.removeItem('pendingFriendInvite');
            }
          }
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('Current session:', currentSession ? 'exists' : 'none');
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData, // This will be available in raw_user_meta_data
          emailRedirectTo: 'https://thedailyditto.com/auth'
        }
      });
      
      if (error) throw error;

      // --- Begin carry-over anonymous vote logic ---
      let voteTransferred = false;
      try {
        // 1. Get browser fingerprint
        const { getBrowserFingerprint } = await import('@/utils/fingerprint');
        const fingerprint = await getBrowserFingerprint();
        console.log('Browser fingerprint:', fingerprint);

        // 2. Get today's date as YYYY-MM-DD
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        console.log('Today\'s date:', todayStr);

        // 3. Fetch today's question
        const { data: questionData, error: questionError }: { data: any, error: any } = await supabase
          .from('daily_questions')
          .select('id')
          .eq('active_date', todayStr)
          .single();
        
        console.log('Question data:', questionData);
        console.log('Question error:', questionError);

        if (questionError || !questionData) {
          console.log('No question found for today');
        } else {
          // 4. Look for anonymous vote for today
          console.log('Searching for anonymous vote with:', {
            questionId: questionData.id,
            fingerprint,
            userId: null
          });

          const { data: voteData, error: voteError } = await supabase
            .from('votes')
            .select('id, selected_option, question_id, created_at')
            .eq('question_id', questionData.id)
            .eq('browser_fingerprint', fingerprint)
            .is('user_id', null)
            .single();

          console.log('Anonymous vote data:', voteData);
          console.log('Anonymous vote error:', voteError);

          if (!voteError && voteData && data?.user?.id) {
            console.log('Found anonymous vote, creating user vote for user:', data.user.id);
            
            // 5. Create a new vote for the user with the same selection
            const newVote = {
              user_id: data.user.id,
              question_id: voteData.question_id,
              selected_option: voteData.selected_option,
              created_at: voteData.created_at // Preserve original vote time
            };
            
            console.log('Attempting to create new vote:', newVote);
            
            const { data: insertData, error: insertError } = await supabase
              .from('votes')
              .insert(newVote)
              .select()
              .single();
            
            console.log('Insert result:', { data: insertData, error: insertError });

            if (!insertError) {
              console.log('Successfully created user vote, deleting anonymous vote:', voteData.id);
              
              // 6. Delete the anonymous vote
              const { data: deleteData, error: deleteError } = await supabase
                .from('votes')
                .delete()
                .eq('id', voteData.id)
                .select();
              
              console.log('Delete result:', { data: deleteData, error: deleteError });

              if (!deleteError) {
                // Verify the vote was deleted
                const { data: verifyData, error: verifyError } = await supabase
                  .from('votes')
                  .select('id')
                  .eq('id', voteData.id)
                  .single();
                
                console.log('Verification after delete:', { data: verifyData, error: verifyError });
                
                if (!verifyError || verifyError.code === 'PGRST116') {
                  voteTransferred = true;
                  console.log('Successfully transferred vote and verified deletion');
                } else {
                  console.error('Error verifying vote deletion:', verifyError);
                }
              } else {
                console.error('Error deleting anonymous vote:', deleteError);
                // If delete fails, try to rollback the insert
                if (insertData?.id) {
                  const { error: rollbackError } = await supabase
                    .from('votes')
                    .delete()
                    .eq('id', insertData.id);
                  console.log('Rollback result:', { error: rollbackError });
                }
              }
            } else {
              console.error('Error creating user vote:', insertError);
            }
          } else if (voteError && voteError.code !== 'PGRST116') {
            console.error('Error finding anonymous vote:', voteError);
          } else {
            console.log('No anonymous vote found or no user ID available');
          }
        }
      } catch (carryError) {
        console.error('Error in vote transfer process:', carryError);
      }
      // --- End carry-over anonymous vote logic ---

      toast({
        title: "Verify Your Email",
        description: "Please check your email to confirm your account.",
        duration: 9000,
      });

      return { success: true, voteTransferred };
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Sign up error",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Check if email is verified
      if (!data.user?.email_confirmed_at) {
        // Sign out the user since they haven't verified their email
        await supabase.auth.signOut();
        throw new Error("Please verify your email before logging in. Check your inbox for the verification link.");
      }
    } catch (error: any) {
      toast({
        title: "Login error",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setSession(null);
        setUser(null);
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
    } catch (error: any) {
      // If error is about missing session or 403, treat as successful sign out
      const errorMsg = error.message || "";
      if (
        errorMsg.toLowerCase().includes("session missing") ||
        errorMsg.toLowerCase().includes("auth session missing") ||
        errorMsg.toLowerCase().includes("403")
      ) {
        setSession(null);
        setUser(null);
        return;
      }
      toast({
        title: "Sign out error",
        description: errorMsg || "An error occurred during sign out",
        variant: "destructive",
      });
      setSession(null);
      setUser(null);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Password reset error",
        description: error.message || "An error occurred during password reset",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isPasswordRecovery,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
