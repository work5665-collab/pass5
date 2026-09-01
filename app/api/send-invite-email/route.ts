import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Service role key를 사용한 admin 클라이언트
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey!);

export async function POST(request: NextRequest) {
  try {
    const { email, token, projectName, inviterName, role } = await request.json();

    console.log('Sending invite email:', { email, token, projectName, inviterName, role });

    // 초대 링크 생성
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

    // 이메일 내용
    const emailSubject = `[${projectName}] 프로젝트 초대`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">프로젝트 초대</h2>
        <p><strong>${inviterName}</strong>님이 <strong>${projectName}</strong> 프로젝트에 초대했습니다.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>부여된 역할:</strong> ${role === 'admin' ? '관리자' : role === 'member' ? '멤버' : '뷰어'}</p>
        </div>
        
        <p>아래 버튼을 클릭하여 초대를 수락하세요:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            초대 수락하기
          </a>
        </div>
        
        <p>또는 아래 링크를 복사해서 브라우저에 붙여넣으세요:</p>
        <p style="word-break: break-all; color: #666;">${inviteLink}</p>
        
        <p style="margin-top: 30px; font-size: 12px; color: #999;">
          이 이메일은 시스템에서 자동으로 발송되었습니다.<br>
          문의가 있으시면 발송자에게 연락해주세요.
        </p>
      </div>
    `;

    // Supabase Auth를 통한 이메일 발송
    // 주의: Supabase Auth의 사용자 초대 기능을 활용
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invite_token: token,
        project_name: projectName,
        inviter_name: inviterName,
        role: role
      }
    });

    if (error) {
      console.error('Email send error:', error);
      // Supabase Auth 초대 실패 시 대체 방법
      // SMTP 직접 사용 또는 오류 메시지 반환
      return NextResponse.json({ 
        success: false, 
        error: '이메일 발송 실패: ' + error.message 
      }, { status: 500 });
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({ success: true, message: '이메일 발송 성공' });

  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}