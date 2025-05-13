
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://clvtxmkpsmacvhvyhwob.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdnR4bWtwc21hY3Zodnlod29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNTY2MzYsImV4cCI6MjA2MjczMjYzNn0._ScqPy450T8H0deGTHKnbSMJv9VLNm0_bdNo3qelOdc";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
