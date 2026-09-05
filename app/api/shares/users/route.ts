import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

// 공유 현황을 '사용자(User) 기준'으로 Grouping 하여 응답
// - 관리 가능한(본인이 Owner/Admin 인) 프로젝트/폴더의 공유만 포함
// - 이메일 초대 공유는 수신자 이메일별로 그룹핑, 오픈 링크 공유는 별도 그룹
// GET /api/shares/users
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1) 요청자가 Owner/Admin 인 프로젝트 (= 관리 가능한 프로젝트)
    const { data: memberProjects } = await supabaseAdmin
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin']);
    const memberProjectIds = (memberProjects || []).map((m: any) => m.project_id);
    // 소유권 이양 노출 판정: 현재 사용자가 해당 프로젝트의 실제 owner 인 프로젝트 집합
    const ownerProjectIdSet = new Set(
      (memberProjects || []).filter((m: any) => m.role === 'owner').map((m: any) => m.project_id)
    );

    // 레거시 데이터 대응: 사용자가 생성한 프로젝트도 관리 대상에 포함 (403/표시 누락 방지)
    const { data: createdProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('created_by', user.id);
    const createdProjectIds = (createdProjects || []).map((p: any) => p.id);

    const manageableProjectIds = [...new Set([...memberProjectIds, ...createdProjectIds])];
    const canAccessShares = manageableProjectIds.length > 0;

    if (!canAccessShares) {
      return NextResponse.json({ groups: [], linkShares: [], canAccessShares });
    }

    // 2) 관리 가능한 프로젝트에 속한 폴더 (직속 + 하위 2단계)
    const { data: projRows } = await supabaseAdmin
      .from('projects')
      .select('id, folder_id')
      .in('id', manageableProjectIds);
    const directFolderIds = [...new Set((projRows || []).map((p: any) => p.folder_id).filter(Boolean))];
    // 부모 폴더 id → 직속 프로젝트 id 매핑 (폴더 공유 대상의 project_id 역조회용)
    const projectIdByFolder = new Map<string, string>();
    for (const p of projRows || []) {
      if (p.folder_id) projectIdByFolder.set(p.folder_id, p.id);
    }
    let manageableFolderIds: string[] = [];
    const parentOfFolder: Record<string, string> = {};
    if (directFolderIds.length > 0) {
      const { data: childFolders } = await supabaseAdmin
        .from('folders')
        .select('id, parent_id')
        .in('parent_id', directFolderIds);
      for (const f of childFolders || []) parentOfFolder[f.id] = f.parent_id;
      manageableFolderIds = [...directFolderIds, ...(childFolders || []).map((f: any) => f.id)];
    }
    // 폴더 id → 소속 프로젝트 id (직속 or 하위 2단계), 소속 없으면 null
    const resolveProjectId = (folderId: string): string | null => {
      if (projectIdByFolder.has(folderId)) return projectIdByFolder.get(folderId)!;
      const parent = parentOfFolder[folderId];
      if (parent && projectIdByFolder.has(parent)) return projectIdByFolder.get(parent)!;
      return null;
    };

    // 3) 관리 대상 아이템(프로젝트/폴더)의 공유 조회
    let allShares: any[] = [];
    if (manageableProjectIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('item_shares')
        .select('*')
        .eq('target_type', 'project')
        .in('target_id', manageableProjectIds)
        .order('created_at', { ascending: false });
      allShares = allShares.concat(data || []);
    }
    if (manageableFolderIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('item_shares')
        .select('*')
        .eq('target_type', 'folder')
        .in('target_id', manageableFolderIds)
        .order('created_at', { ascending: false });
      allShares = allShares.concat(data || []);
    }

    // 4) 대상 이름 해석용 맵
    const { data: pRows } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .in('id', manageableProjectIds);
    const { data: fRows } = await supabaseAdmin
      .from('folders')
      .select('id, name')
      .in('id', manageableFolderIds.length ? manageableFolderIds : ['00000000-0000-0000-0000-000000000000']);
    const projectName = Object.fromEntries((pRows || []).map((r: any) => [r.id, r.name]));
    const folderName = Object.fromEntries((fRows || []).map((r: any) => [r.id, r.name]));

    // 5) 이메일 기준 그룹핑 (이름/소속 라벨은 가장 최근 공유 기준으로 채택)
    const userMap: Record<string, { name: string; department: string; shares: any[] }> = {};
    const linkShares: any[] = [];

    for (const share of allShares) {
      const isFolder = share.target_type === 'folder';
      const nameMap = isFolder ? folderName : projectName;
      // 폴더 공유 대상은 소속 프로젝트 id 역조회 (없으면 null → 이양 불가)
      const projectId = isFolder ? resolveProjectId(share.target_id) : share.target_id;
      const presentIsOwner = !!projectId && ownerProjectIdSet.has(projectId);
      const isUserShare = share.share_method === 'user';
      // 이양 가능 조건: 프로젝트 공유 + 현재 사용자가 해당 프로젝트 owner + 수락 완료(user_id) + 본인 아님
      const presentCanTransfer =
        isUserShare &&
        !isFolder &&
        !!share.user_id &&
        share.user_id !== user.id &&
        presentIsOwner;
      const entry = {
        id: share.id,
        target_type: share.target_type,
        target_id: share.target_id,
        target_name: nameMap[share.target_id] || '(삭제된 항목)',
        role: share.role,
        status: share.status,
        expires_at: share.expires_at,
        created_at: share.created_at,
        share_method: share.share_method,
        link_token: share.share_method === 'link' ? share.link_token : null,
        user_id: share.user_id ?? null,
        project_id: projectId,
        email: isUserShare ? (share.email || '') : '',
        name: isUserShare ? (share.name || null) : null,
        present_user_is_owner: presentIsOwner,
        present_user_can_transfer: presentCanTransfer,
      };
      if (share.share_method === 'link') {
        linkShares.push(entry);
      } else {
        const email = share.email || '(이메일 없음)';
        if (!userMap[email]) {
          // shares 는 created_at desc 로 정렬 → 첫 번째 행이 가장 최근 공유
          userMap[email] = { name: share.name || '', department: share.department || '', shares: [] };
        }
        userMap[email].shares.push(entry);
      }
    }

    const groups = Object.keys(userMap)
      .sort((a, b) => a.localeCompare(b))
      .map(email => ({
        email,
        name: userMap[email].name,
        department: userMap[email].department,
        shares: userMap[email].shares,
      }));

    return NextResponse.json({ groups, linkShares, canAccessShares });

  } catch (error) {
    console.error('Shares users fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
