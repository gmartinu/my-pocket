import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";

// Supabase Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 [Supabase Config] URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('🔧 [Supabase Config] Key:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ [Supabase Config] Missing environment variables!');
  console.error('SUPABASE_URL:', SUPABASE_URL);
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set but hidden' : 'Missing');
  throw new Error("Missing Supabase environment variables");
}

console.log('🔧 [Supabase Config] Creating client...');

// Create Supabase client with optimized settings for React Native
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      // Use AsyncStorage for React Native
      storage: undefined, // Will be set up in AuthContext
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      // Optimize realtime for mobile
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        "X-Client-Info": "my-pocket-app",
      },
    },
  }
);

console.log('✅ [Supabase Config] Client created successfully');

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Export configuration for debugging
export const supabaseConfig = {
  url: SUPABASE_URL,
  // Don't expose the key in production logs
  isConfigured: isSupabaseConfigured(),
};
