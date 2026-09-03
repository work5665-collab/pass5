// 공유(item_shares) CRUD — 프론트엔드(anon client)용
// 서버 권한 검증(RLS + resolveEffectiveRole)은 app/api/shares 라우트에서 수행
import { supabase } from './client';
import type { ItemShare } from '../types';

// 브라우저 Web Crypto API 기반 무작위 토큰 생성 (서버 Node crypto 불필요)
function generateTokenBytes(length: number): string {
  const arr = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    // 비표준 환경 폴백 (Node 19+ 는 전역 crypto 제공)
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// 대상 아이템의 공유 목록 조회 (사용자가 만든 것 + 자신에게 공유된 것)
export async function fetchSharesForItem(
  targetType: 'folder' | 'project',
  targetId: string
): Promise<ItemShare[]> {
  const { data, error } = await supabase
    .from('item_shares')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching shares:', error);
    return [];
  }

  return (data || []) as ItemShare[];
}

// "나의 공유 현황" 페이지용: 내가 만든 모든 공유 조회
export async function fetchMyShares(): Promise<ItemShare[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('item_shares')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching my shares:', error);
    return [];
  }

  return (data || []) as ItemShare[];
}

// 오픈 링크 토큰 생성 (Web Crypto 기반, 32바이트 hex = 64자)
export function generateLinkToken(): string {
  return generateTokenBytes(32);
}

// 공유 생성 (service role 검증은 /api/shares 라우트에서 수행)
// - shareMethod 'user': email + role (수신자)
// - shareMethod 'link': linkToken + expiresAt (선택) — 오픈 링크
export async function createShare(
  params: {
    targetType: 'folder' | 'project';
    targetId: string;
    shareMethod: 'user' | 'link';
    email?: string;
    role: 'admin' | 'editor' | 'viewer';
    linkToken?: string;
    expiresAt?: string | null;
  }
): Promise<ItemShare | null> {
  const { data, error } = await supabase
    .from('item_shares')
    .insert({
      target_type: params.targetType,
      target_id: params.targetId,
      share_method: params.shareMethod,
      user_id: null,
      email: params.email || '',
      role: params.role,
      link_token: params.shareMethod === 'link' ? (params.linkToken || generateLinkToken()) : null,
      expires_at: params.expiresAt || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating share:', error);
    return null;
  }

  return data as ItemShare;
}

// 공유 삭제 (취소)
export async function deleteShare(shareId: string): Promise<boolean> {
  const { error } = await supabase
    .from('item_shares')
    .delete()
    .eq('id', shareId);

  if (error) {
    console.error('Error deleting share:', error);
    return false;
  }

  return true;
}

// 공유 역할/상태 수정
export async function updateShare(
  shareId: string,
  updates: Partial<{ role: 'admin' | 'editor' | 'viewer'; status: 'active' | 'revoked'; expires_at: string | null }>
): Promise<boolean> {
  const { error } = await supabase
    .from('item_shares')
    .update(updates)
    .eq('id', shareId);

  if (error) {
    console.error('Error updating share:', error);
    return false;
  }

  return true;
}
