import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

// 오픈 링크 수락: 로그인 사용자가 share 링크로 접근 시 프로젝트 멤버십 자동 연동
// body: { linkToken }
export async function POST(request: NextRequest) {
  try {
    const { linkToken } = await request.json();
    if (!linkToken) {
      return NextResponse.json({ error: 'linkToken is required' }, { status: 400 });
    }

    // 인증 확인 (구글 로그인 필수 — 비회원 익명 접속 미지원)
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 활성 공유 링크 조회
    const { data: share, error: shareError } = await supabaseAdmin
      .from('item_shares')
      .select('*')
      .eq('link_token', linkToken)
      .eq('status', 'active')
      .maybeSingle();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Invalid or revoked link' }, { status: 400 });
    }

    // 유효기간 확인
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 400 });
    }

    // 대상 아이템이 속한 프로젝트 찾기
    let projectId: string | null = null;
    if (share.target_type === 'card') {
      const { data: card } = await supabaseAdmin
        .from('cards')
        .select('project_id')
        .eq('id', share.target_id)
        .maybeSingle();
      projectId = card?.project_id || null;
    } else {
      // folder: 해당 폴더가 속한 프로젝트 (하위 포함 대략적으로 첫 프로젝트)
      const { data: proj } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('folder_id', share.target_id)
        .limit(1)
        .maybeSingle();
      projectId = proj?.id || null;
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Shared item not found' }, { status: 404 });
    }

    // 프로젝트 멤버십 자동 연동 (최소 권한 viewer — 최고 권한 채택)
    const { data: existingMember } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    let grantedRole: string | null = null;
    if (existingMember) {
      // 이미 멤버면 기존 멤버십 역할 유지 (강등 없음)
      // 개별 아이템의 실제 유효 권한은 resolveEffectiveRole 이 max() 로 결정 (모델 A)
      grantedRole = existingMember.role;
    } else {
      // 새 멤버: 링크의 role 기준으로 추가 (editor 허용)
      const { error: memberError } = await supabaseAdmin
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: user.id,
          email: user.email || '',
          role: share.role, // 'editor' | 'viewer'
          status: 'active',
        });
      if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }
      grantedRole = share.role;
    }

    return NextResponse.json({
      success: true,
      projectId,
      role: grantedRole,
      targetType: share.target_type,
      targetId: share.target_id,
    });

  } catch (error) {
    console.error('Share link accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
