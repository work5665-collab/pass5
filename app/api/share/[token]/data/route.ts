import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

// 오픈 공유 링크 읽기 전용 데이터 조회 (익명 접근 허용 — 인증 불필요)
// - 토큰 기반으로 대상(프로젝트/폴더)의 카드 구조를 읽기 전용으로 제공
// - GET /api/share/[token]/data
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    // 활성 공유 링크 조회 (service role 로 RLS 우회)
    const { data: share, error } = await supabaseAdmin
      .from('item_shares')
      .select('*')
      .eq('link_token', token)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !share) {
      return NextResponse.json({ error: '유효하지 않거나 해지된 공유 링크입니다.' }, { status: 404 });
    }
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: '링크가 만료되었습니다.' }, { status: 410 });
    }

    // 대상(프로젝트/폴더) → 읽을 프로젝트 목록 + 폴더 트리 해석
    const projects: { id: string; name: string; folder_id: string | null; cards: any[] }[] = [];
    const folders: { id: string; name: string; parent_id: string | null }[] = [];

    // 폴더 조회 헬퍼
    const fetchProjectsAndFolders = async (folderId: string) => {
      // 1단계 하위 폴더
      const { data: l1Folders } = await supabaseAdmin
        .from('folders')
        .select('id, name, parent_id')
        .eq('parent_id', folderId);
      const l1List = (l1Folders || []) as { id: string; name: string; parent_id: string | null }[];
      folders.push(...l1List);

      // 2단계 하위 폴더
      for (const f of l1List) {
        const { data: l2Folders } = await supabaseAdmin
          .from('folders')
          .select('id, name, parent_id')
          .eq('parent_id', f.id);
        folders.push(...((l2Folders || []) as { id: string; name: string; parent_id: string | null }[]));
      }

      // 직속 + 1단계 하위 폴더에 속한 프로젝트
      const allFolderIds = [folderId, ...l1List.map(f => f.id), ...folders.map(f => f.id)];
      const { data: projs } = await supabaseAdmin
        .from('projects')
        .select('id, name, folder_id')
        .in('folder_id', [...new Set(allFolderIds)]);
      return projs || [];
    };

    if (share.target_type === 'project') {
      const { data: proj } = await supabaseAdmin
        .from('projects')
        .select('id, name, folder_id')
        .eq('id', share.target_id)
        .maybeSingle();
      if (!proj) {
        return NextResponse.json({ error: '공유된 항목을 찾을 수 없습니다.' }, { status: 404 });
      }
      // 프로젝트의 상위 폴더도 사이드바에 표시 (트리 구조 유지)
      if (proj.folder_id) {
        const { data: parentFolder } = await supabaseAdmin
          .from('folders')
          .select('id, name, parent_id')
          .eq('id', proj.folder_id)
          .maybeSingle();
        if (parentFolder) {
          folders.push(parentFolder as { id: string; name: string; parent_id: string | null });
          // 그 상위 폴더가 있다면 (2단계 구조)
          if (parentFolder.parent_id) {
            const { data: grandFolder } = await supabaseAdmin
              .from('folders')
              .select('id, name, parent_id')
              .eq('id', parentFolder.parent_id)
              .maybeSingle();
            if (grandFolder) folders.unshift(grandFolder as { id: string; name: string; parent_id: string | null });
          }
        }
      }
      const { data: cards } = await supabaseAdmin
        .from('cards')
        .select('*')
        .eq('project_id', proj.id)
        .order('position', { ascending: true });
      projects.push({ id: proj.id, name: proj.name, folder_id: proj.folder_id, cards: cards || [] });
    } else {
      // folder: 해당 폴더 + 하위 폴더 + 속한 프로젝트
      const { data: folderRow } = await supabaseAdmin
        .from('folders')
        .select('id, name, parent_id')
        .eq('id', share.target_id)
        .maybeSingle();
      if (folderRow) {
        folders.push(folderRow as { id: string; name: string; parent_id: string | null });
      }

      const projs = await fetchProjectsAndFolders(share.target_id);
      for (const p of projs) {
        const { data: cards } = await supabaseAdmin
          .from('cards')
          .select('*')
          .eq('project_id', p.id)
          .order('position', { ascending: true });
        projects.push({ id: p.id, name: p.name, folder_id: p.folder_id, cards: cards || [] });
      }
    }

    if (projects.length === 0) {
      return NextResponse.json({ error: '공유된 항목을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 공유 대상 이름: 폴더인 경우 첫 번째 폴더 이름, 프로젝트인 경우 프로젝트 이름
    const targetName = share.target_type === 'folder'
      ? (folders[0]?.name || projects[0].name)
      : projects[0].name;

    return NextResponse.json({
      target_type: share.target_type,
      target_id: share.target_id,
      target_name: targetName,
      projects,
      folders,
    });
  } catch (err) {
    console.error('Share data fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
