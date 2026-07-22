// Jeśli używasz bundlera (Vite/Webpack) zainstaluj: npm install @supabase/supabase-js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://TWOJ-PROJEKT.supabase.co';
const supabaseKey = 'TWOJ-ANON-KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);