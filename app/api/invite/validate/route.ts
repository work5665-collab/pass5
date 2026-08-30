import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 초대 토큰 검증
    const { data: invite, error: inviteError } = await supabase
      .from('project_invites')
      .select(`
        *,
        projects:project_id (name)
      `)
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

    return NextResponse.json({ 
      success: true,
      email: invite.email,
      role: invite.role,
      projectName: invite.projects?.name || '프로젝트',
      projectId: invite.project_id
    });

  } catch (error) {
    console.error('Invite validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}