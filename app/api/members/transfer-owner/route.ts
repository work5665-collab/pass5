import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// POST: 프로젝트 오너 권한 이양
export async function POST(request: NextRequest) {
  try {
    const { projectId, newOwnerUserId } = await request.json();

    if (!projectId || !newOwnerUserId) {
      return NextResponse.json(
        { error: 'projectId와 newOwnerUserId가 필요합니다' },
        { status: 400 },
      );
    }

    // ── 1. 요청자 인증 ──────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. 요청자가 해당 프로젝트의 실제 owner인지 검증 ──────────
    const { data: requesterMember, error: requesterError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (requesterError || !requesterMember || requesterMember.role !== 'owner') {
      return NextResponse.json(
        { error: '권한 부족: 프로젝트 소유자(owner)만 소유권을 이양할 수 있습니다' },
        { status: 403 },
      );
    }

    // ── 3. 자기 자신에게 소유권을 넘기는 요청 예외 처리 ──────────
    if (newOwnerUserId === user.id) {
      return NextResponse.json(
        { error: '이미 소유자입니다. 자기 자신에게 소유권을 이양할 수 없습니다' },
        { status: 400 },
      );
    }

    // ── 4. 대상 유저가 해당 프로젝트의 멤버인지 검증 ─────────────
    const { data: targetMember, error: targetError } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', newOwnerUserId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: '대상 사용자가 해당 프로젝트의 멤버가 아닙니다' },
        { status: 404 },
      );
    }

    // 대상이 이미 owner인 경우 예외 처리
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: '대상 사용자가 이미 소유자(owner)입니다' },
        { status: 400 },
      );
    }

    // ── 5. Service Role 클라이언트로 DB 업데이트 (RLS 우회) ──────
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey || supabaseKey,
    );

    // 5-a. projects 테이블: created_by를 신규 오너로 변경
    const { error: projectUpdateError } = await supabaseAdmin
      .from('projects')
      .update({ created_by: newOwnerUserId })
      .eq('id', projectId);

    if (projectUpdateError) {
      console.error('프로젝트 소유권 업데이트 실패:', projectUpdateError);
      return NextResponse.json(
        { error: '프로젝트 소유권 업데이트 중 오류가 발생했습니다' },
        { status: 500 },
      );
    }

    // 5-b. project_members: 기존 오너 → admin
    const { error: oldOwnerUpdateError } = await supabaseAdmin
      .from('project_members')
      .update({ role: 'admin' })
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('role', 'owner');

    if (oldOwnerUpdateError) {
      console.error('기존 오너 역할 변경 실패:', oldOwnerUpdateError);
      return NextResponse.json(
        { error: '기존 오너 역할 변경 중 오류가 발생했습니다' },
        { status: 500 },
      );
    }

    // 5-c. project_members: 신규 오너 → owner
    const { error: newOwnerUpdateError } = await supabaseAdmin
      .from('project_members')
      .update({ role: 'owner' })
      .eq('project_id', projectId)
      .eq('user_id', newOwnerUserId);

    if (newOwnerUpdateError) {
      console.error('신규 오너 역할 변경 실패:', newOwnerUpdateError);
      return NextResponse.json(
        { error: '신규 오너 역할 변경 중 오류가 발생했습니다' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      previousOwner: user.id,
      newOwner: newOwnerUserId,
    });

  } catch (error) {
    console.error('Owner transfer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
