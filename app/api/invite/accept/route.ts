import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // 요청 헤더에서 인증 토큰 추출
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 초대 토큰 검증
    const { data: invite, error: inviteError } = await supabase
      .from('project_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    // 초대 만료 확인
    if (new Date(invite.expires_at) < new Date()) {
      await supabase
        .from('project_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);
      
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
    }

    // 이메일 일치 확인
    if (invite.email !== user.email) {
      return NextResponse.json({ error: 'This invite is for a different email address' }, { status: 400 });
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', invite.project_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this project' }, { status: 400 });
    }

    // 멤버로 추가
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: invite.project_id,
        user_id: user.id,
        email: user.email,
        role: invite.role,
        status: 'active'
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // 초대 상태 업데이트
    await supabase
      .from('project_invites')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    return NextResponse.json({ 
      success: true,
      projectId: invite.project_id,
      role: invite.role
    });

  } catch (error) {
    console.error('Invite acceptance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}