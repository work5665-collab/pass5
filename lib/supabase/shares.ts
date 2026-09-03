// 공유(item_shares) 클라이언트 헬퍼 — 사이드바 '공유받은 항목' 조회용
// 관리자용 사용자 중심 공유 현황(/api/shares/users) 및 공유 생성/수정/삭제는
// 서버 API(/api/shares) 경유로 수행한다. (서버 권한 검증은 RLS + resolveEffectiveRole)
import { supabase } from './client';
import type { ItemShare } from '../types';

// "공유받은 항목" 조회 (수신자 == 현재 로그인 사용자인 활성 공유)
// - 이메일 초대는 user_id 가 null 로 저장되므로 email 로도 매칭한다.
// - status 가 'active' 인 공유만 노출 (해지된 공유는 숨김)
export async function fetchSharesSharedWithMe(): Promise<ItemShare[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const email = user.email?.trim();
  // user_id 와 email 을 모두 매칭 (email 이 없으면 user_id 만)
  const query = email
    ? supabase
        .from('item_shares')
        .select('*')
        .or(`user_id.eq.${user.id},email.eq.${email}`)
        .eq('status', 'active')
    : supabase
        .from('item_shares')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shares shared with me:', error);
    return [];
  }

  return (data || []) as ItemShare[];
}
