import { createClient } from '@supabase/supabase-js';

// Supabase 초기화 (공유 클라이언트 싱글턴)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
export const supabase = createClient(supabaseUrl, supabaseKey);
