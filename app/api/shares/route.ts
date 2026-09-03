import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canManageProject, resolveEffectiveRole } from '../../../lib/shares/permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

// 대상 아이템이 속한 project_id 를 찾는 헬퍼
async function resolveItemProjectId(
  targetType: 'card' | 'folder',
  targetId: string
): Promise<string | null> {
  if (targetType === 'card') {
    const { data } = await supabaseAdmin
      .from('cards')
      .select('project_id')
      .eq('id', targetId)
      .maybeSingle();
    return data?.project_id || null;
  }

  // folder: 해당 폴더가 속한 프로젝트 (folder_id 로 역조회)
  const { data } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('folder_id', targetId)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

// GET: 특정 아이템의 공유 목록 조회
// ?targetType=card|folder&targetId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'targetType and targetId are required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 해당 아이템에 대한 접근 권한이 있어야 공유 목록 조회 가능
    const hasAccess = await resolveEffectiveRole(
      supabaseAdmin,
      user.id,
      targetType as 'card' | 'folder',
      targetId
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: shares, error: sharesError } = await supabaseAdmin
      .from('item_shares')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: true });

    if (sharesError) {
      return NextResponse.json({ error: sharesError.message }, { status: 500 });
    }

    return NextResponse.json({ shares: shares || [] });

  } catch (error) {
    console.error('Shares fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 공유 생성 (이메일 초대 또는 오픈 링크)
// body: { targetType, targetId, shareMethod, email?, role, linkToken?, expiresAt? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetType, targetId, shareMethod, email, role, linkToken, expiresAt } = body;

    if (!targetType || !targetId || !shareMethod) {
      return NextResponse.json({ error: 'targetType, targetId, shareMethod are required' }, { status: 400 });
    }
    if (!['card', 'folder'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 });
    }
    if (!['user', 'link'].includes(shareMethod)) {
      return NextResponse.json({ error: 'Invalid shareMethod' }, { status: 400 });
    }
    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 대상 아이템이 속한 프로젝트의 관리자/소유자만 공유 생성 가능
    const projectId = await resolveItemProjectId(targetType as 'card' | 'folder', targetId);
    if (!projectId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const isManager = await canManageProject(supabaseAdmin, user.id, projectId);
    if (!isManager) {
      return NextResponse.json({ error: 'Forbidden: Only owners and admins can share items' }, { status: 403 });
    }

    // 이메일 초대 방식: 수신자 이메일 필수
    if (shareMethod === 'user' && !email) {
      return NextResponse.json({ error: 'email is required for user invites' }, { status: 400 });
    }

    const insertPayload: any = {
      target_type: targetType,
      target_id: targetId,
      share_method: shareMethod,
      user_id: null,
      email: email || '',
      role,
      link_token: shareMethod === 'link' ? (linkToken || null) : null,
      expires_at: expiresAt || null,
      created_by: user.id,
    };

    const { data: share, error: insertError } = await supabaseAdmin
      .from('item_shares')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, share }, { status: 201 });

  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
