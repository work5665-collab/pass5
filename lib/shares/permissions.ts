// 파일/폴더 단위 권한 해석 로직 (서버 전용, service role client 사용)
// 확정 정책:
//  - 모든 사용자는 구글 로그인 필요 (비회원 익명 접속 없음)
//  - 최고 권한 채택(Highest Privilege): 오너 > 관리자 > 에디터 > 뷰어
//  - 권한 상속은 확장(Additive): 상위가 높으면 하위도 상향
//  - 하위 개별 권한은 상위 때문에 강등되지 않음
//  - resolveEffectiveRole 은 project_members 와 item_shares 를 모두 max() 로 비교 (모델 A)

import type { SupabaseClient } from '@supabase/supabase-js';

// 권한 등급 (숫자가 클수록 높은 권한)
export const ROLE_ORDER: Record<string, number> = {
  viewer: 1,
  editor: 2,
  member: 2,
  admin: 3,
  owner: 4,
};

// 카드 단위 공유는 제거됨 → 폴더/프로젝트 단위만 존재
export type TargetType = 'folder' | 'project';

interface FolderRow {
  id: string;
  parent_id: string | null;
}

// max() 헬퍼: 두 역할 중 더 높은 등급 반환 (둘 다 없으면 null)
export function maxRole(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a && !b) return null;
  if (!a) return b || null;
  if (!b) return a || null;
  const ra = ROLE_ORDER[a] ?? 0;
  const rb = ROLE_ORDER[b] ?? 0;
  return ra >= rb ? a : b;
}

// 폴더의 parent_id 조회
async function getFolderParentId(client: SupabaseClient, folderId: string): Promise<string | null> {
  const { data, error } = await client
    .from('folders')
    .select('parent_id')
    .eq('id', folderId)
    .maybeSingle();
  if (error || !data) return null;
  return data.parent_id as string | null;
}

// 상위 폴더 체인 조회 (최대 2단계. 최상위 조상부터 반환)
// 예: target이 2단계 폴더면 [1단계, 2단계], 1단계면 [1단계]
async function getFolderChain(client: SupabaseClient, folderId: string): Promise<FolderRow[]> {
  const chain: FolderRow[] = [];
  let currentId: string | null = folderId;
  let currentParent: string | null = null;

  // 첫 항목 (대상 폴더)
  const firstParent = await getFolderParentId(client, currentId);
  chain.push({ id: currentId, parent_id: firstParent });
  currentParent = firstParent;

  // 상위 폴더 (2단계 제한)
  let depth = 0;
  while (currentParent && depth < 2) {
    const parentParent = await getFolderParentId(client, currentParent);
    chain.unshift({ id: currentParent, parent_id: parentParent });
    currentParent = parentParent;
    depth++;
  }

  return chain;
}

// 사용자의 project_members 역할 조회
async function getProjectMemberRole(
  client: SupabaseClient,
  userId: string,
  projectId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.role as string) || null;
}

// 사용자의 item_shares 역할 조회 (특정 대상 + share_method user)
async function getDirectShareRole(
  client: SupabaseClient,
  userId: string,
  targetType: TargetType,
  targetId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('item_shares')
    .select('role')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error || !data) return null;
  return (data.role as string) || null;
}

// 특정 폴더에 user 를 위한 활성 공유가 있는지 (1건이라도 있으면 접근 가능)
async function hasFolderShareForUser(
  client: SupabaseClient,
  userId: string,
  folderId: string
): Promise<boolean> {
  const { data, error } = await client
    .from('item_shares')
    .select('id')
    .eq('target_type', 'folder')
    .eq('target_id', folderId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

// 사용자가 특정 프로젝트의 관리자/소유자인지 확인 (공유 생성/관리 권한)
export async function canManageProject(
  client: SupabaseClient,
  userId: string,
  projectId: string
): Promise<boolean> {
  const role = await getProjectMemberRole(client, userId, projectId);
  return role === 'owner' || role === 'admin';
}

// 특정 아이템에 대한 사용자의 최종 유효 권한 해석 (Highest Privilege)
// project_members 역할 + item_shares(직접 + 상속) 을 모두 max() 비교
export async function resolveEffectiveRole(
  client: SupabaseClient,
  userId: string,
  targetType: TargetType,
  targetId: string
): Promise<string | null> {
  let projectId: string | null = null;
  let folderChain: FolderRow[] = [];

  if (targetType === 'project') {
    // project: targetId 가 곧 project_id. 폴더 체인 없음
    projectId = targetId;
  } else {
    // folder: 해당 폴더가 속한 프로젝트들 중 사용자의 최고 프로젝트 역할 사용
    const { data: projData } = await client
      .from('projects')
      .select('id')
      .eq('folder_id', targetId);
    const projIds = (projData || []).map((p: any) => p.id as string);

    for (const pid of projIds) {
      const role = await getProjectMemberRole(client, userId, pid);
      if (role === 'owner' || role === 'admin') return role; // 최고 등급이므로 즉시 반환
    }
    // owner/admin 없으면 첫 프로젝트 역할(있을 경우) 참조용으로 보관
    if (projIds.length > 0) {
      projectId = projIds[0];
    }
    folderChain = await getFolderChain(client, targetId);
  }

  // 1) project_members 역할
  let effectiveRole: string | null = null;
  if (projectId) {
    effectiveRole = await getProjectMemberRole(client, userId, projectId);
  }

  // 2) item_shares 직접 공유
  const directShare = await getDirectShareRole(client, userId, targetType, targetId);
  effectiveRole = maxRole(effectiveRole, directShare);

  // 3) item_shares 상속 (상위 폴더 체인에 user 를 위한 활성 공유가 있으면 접근 부여)
  for (const folder of folderChain) {
    if (folder.id === targetId) continue; // 직접 대상은 위에서 이미 확인
    if (await hasFolderShareForUser(client, userId, folder.id)) {
      // 폴더 상속은 최소 viewer 이상 접근 허용
      effectiveRole = maxRole(effectiveRole, 'viewer');
    }
  }

  return effectiveRole;
}

// 사용자가 특정 아이템에 접근 가능한지 (최소 viewer 필요)
export async function canAccessItem(
  client: SupabaseClient,
  userId: string,
  targetType: TargetType,
  targetId: string
): Promise<boolean> {
  const role = await resolveEffectiveRole(client, userId, targetType, targetId);
  return role !== null;
}
