import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are loaded
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [SUPABASE] Missing environment variables:');
  console.error('❌ [SUPABASE] EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('❌ [SUPABASE] EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '***' : 'undefined');
  console.error('❌ [SUPABASE] Please check your .env file');
}

// Use fallback values for development (but these won't work for real SMS)
const fallbackUrl = 'https://your-project.supabase.co';
const fallbackKey = 'your-anon-key';

export const supabase = createClient(
  supabaseUrl || fallbackUrl, 
  supabaseKey || fallbackKey, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: AsyncStorage,
      detectSessionInUrl: false, // RN/Expo
    },
  }
);
