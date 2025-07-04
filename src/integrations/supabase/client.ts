// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hmjqpdwqicsvkjnnqjzm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtanFwZHdxaWNzdmtqbm5xanptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MzMwMzIsImV4cCI6MjA2NzIwOTAzMn0.hV98Y4XOHzCoIr4VggtgJw1LeN-8AC7_tAA6b8u-PaE";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});