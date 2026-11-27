// Local single-file bundle (npm run build:supabase) instead of esm.sh:
// one request from our own server instead of a chain of ~13 CDN requests.
import { createClient } from './assets/vendor/supabase/supabase-js-2.119.2.js';

// Publiczna konfiguracja klienta — niezależna od katalogu dialogów.
const SUPABASE_URL = "https://oykcjbnxoocdbmgdedzd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a2NqYm54b29jZGJtZ2RlZHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMjk0MjksImV4cCI6MjEwMTcwNTQyOX0.w0IfsKEoeqVTzSsbQyEk8tOEbQCg2d1F-jCydWQCy50";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('No SUPABASE_URL or SUPABASE_ANON_KEY.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});
