import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// GET: 프로젝트 멤버 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // 요청 헤더에서 인증 토큰 추출
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // 사용자 인증 확인
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 멤버 목록 조회 (service role key 사용으로 RLS 우회)
    // 주의: service role key는 비밀키이므로 NEXT_PUBLIC_ 접두사를 붙이면 안 됨
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey || supabaseKey
    );

    const { data: members, error: membersError } = await supabaseAdmin
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    return NextResponse.json({ members });

  } catch (error) {
    console.error('Members fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: 멤버 권한 수정
export async function PUT(request: NextRequest) {
  try {
    const { projectId, memberId, newRole } = await request.json();

    // 요청 헤더에서 인증 토큰 추출
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // 사용자 인증 확인
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청자가 해당 프로젝트의 admin 또는 owner인지 확인
    const { data: requesterMember, error: requesterError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (requesterError || !requesterMember || !['admin', 'owner'].includes(requesterMember.role)) {
      return NextResponse.json({ error: 'Forbidden: Only admins and owners can update member roles' }, { status: 403 });
    }

    // 수정하려는 멤버의 현재 역할 확인
    const { data: targetMember, error: targetError } = await supabase
      .from('project_members')
      .select('role, user_id')
      .eq('id', memberId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // owner 권한은 수정 불가
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify owner role' }, { status: 403 });
    }

    // 자기 자신의 권한은 owner만 수정 가능
    if (targetMember.user_id === user.id && requesterMember.role !== 'owner') {
      return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 403 });
    }

    // 권한 수정
    const { error: updateError } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Member update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 멤버 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const memberId = searchParams.get('memberId');

    if (!projectId || !memberId) {
      return NextResponse.json({ error: 'Project ID and Member ID are required' }, { status: 400 });
    }

    // 요청 헤더에서 인증 토큰 추출
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // 사용자 인증 확인
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청자가 해당 프로젝트의 admin 또는 owner인지 확인
    const { data: requesterMember, error: requesterError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (requesterError || !requesterMember || !['admin', 'owner'].includes(requesterMember.role)) {
      return NextResponse.json({ error: 'Forbidden: Only admins and owners can remove members' }, { status: 403 });
    }

    // 삭제하려는 멤버의 현재 역할 확인
    const { data: targetMember, error: targetError } = await supabase
      .from('project_members')
      .select('role, user_id')
      .eq('id', memberId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // owner 삭제 불가
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 });
    }

    // 자기 자신 삭제 불가
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 403 });
    }

    // 멤버 삭제
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Member deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}