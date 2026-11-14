import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://oykcjbnxoocdbmgdedzd.supabase.co';
const SUPABASE_ANON_KEY = __dialogueText("supabase-client.js", "t_a9062506cc4d0604c2c0");

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