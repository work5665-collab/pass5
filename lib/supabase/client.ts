import { createClient } from '@supabase/supabase-js';

// Supabase 초기화 (공유 클라이언트 싱글턴)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// env 누락 시 placeholder로 조용히 실패하는 것을 방지 — 즉시 경고 노출
if (supabaseUrl === 'https://your-project.supabase.co' || supabaseKey === 'your-anon-key') {
  console.error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다. ' +
    '.env.local 을 확인하고 개발 서버를 재시작하세요.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
