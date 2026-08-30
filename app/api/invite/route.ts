import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { projectId, email, role } = await request.json();
    console.log('Invite request:', { projectId, email, role });

    // 요청 헤더에서 인증 토큰 추출
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    console.log('Auth header present:', !!authHeader, 'Token length:', token?.length);

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    console.log('Auth result:', { user: user?.id, error: authError });
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청자가 해당 프로젝트의 admin 또는 owner인지 확인
    console.log('Checking membership for user:', user.id, 'in project:', projectId);
    const { data: memberCheck, error: memberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle(); // maybeSingle 사용

    console.log('Member check result:', memberCheck, 'Error:', memberError);

    if (memberError) {
      console.error('Member check error:', memberError);
      return NextResponse.json({ error: 'Error checking membership: ' + memberError.message }, { status: 500 });
    }

    if (!memberCheck || !['admin', 'owner'].includes(memberCheck.role)) {
      console.log('Permission denied. MemberCheck:', memberCheck, 'Role:', memberCheck?.role);
      return NextResponse.json({ error: 'Forbidden: Only admins and owners can invite members' }, { status: 403 });
    }

    // 이미 초대된 이메일인지 확인
    const { data: existingInvite } = await supabase
      .from('project_invites')
      .select('*')
      .eq('project_id', projectId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json({ 
        error: 'User already invited',
        inviteId: existingInvite.id,
        token: existingInvite.token
      }, { status: 400 });
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('email', email)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 });
    }

    // 초대 생성
    const { data: invite, error: inviteError } = await supabase
      .from('project_invites')
      .insert({
        project_id: projectId,
        email: email,
        role: role,
        created_by: user.id
      })
      .select()
      .single();

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // 초대 링크 생성
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.token}`;

    return NextResponse.json({ 
      success: true,
      inviteId: invite.id,
      token: invite.token,
      inviteLink: inviteLink
    });

  } catch (error) {
    console.error('Invite creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}