import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canManageProject } from '../../../../lib/shares/permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

// 대상 아이템이 속한 project_id 찾기 (카드 단위 공유는 제거됨)
async function resolveItemProjectId(
  targetType: 'folder' | 'project',
  targetId: string
): Promise<string | null> {
  if (targetType === 'project') {
    return targetId;
  }
  // folder: 해당 폴더가 속한 프로젝트 (직속 + 하위 2단계 폴더 포함 역조회)
  const { data: childFolders } = await supabaseAdmin
    .from('folders')
    .select('id')
    .eq('parent_id', targetId);
  const childIds = [targetId, ...(childFolders || []).map(f => f.id)];
  const { data } = await supabaseAdmin
    .from('projects')
    .select('id')
    .in('folder_id', childIds)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

// PATCH: 공유 역할/상태 수정
// body: { role?, status?, expires_at? }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 대상 공유 조회
    const { data: share, error: shareError } = await supabaseAdmin
      .from('item_shares')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // 관리자/소유자만 수정 가능
    const projectId = await resolveItemProjectId(share.target_type, share.target_id);
    if (!projectId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const isManager = await canManageProject(supabaseAdmin, user.id, projectId);
    if (!isManager) {
      return NextResponse.json({ error: 'Forbidden: Only owners and admins can modify shares' }, { status: 403 });
    }

    const updates: any = {};
    if (body.role !== undefined) {
      // admin 역할 부여는 오너만 가능
      if (body.role === 'admin') {
        const { data: requesterMember } = await supabaseAdmin
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (requesterMember?.role !== 'owner') {
          return NextResponse.json({ error: 'Forbidden: Only owners can grant admin role' }, { status: 403 });
        }
      }
      updates.role = body.role;
    }
    if (body.status !== undefined) updates.status = body.status;
    if (body.expires_at !== undefined) updates.expires_at = body.expires_at;

    const { error: updateError } = await supabaseAdmin
      .from('item_shares')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Share update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 공유 취소
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 대상 공유 조회
    const { data: share, error: shareError } = await supabaseAdmin
      .from('item_shares')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // 관리자/소유자만 취소 가능
    const projectId = await resolveItemProjectId(share.target_type, share.target_id);
    if (!projectId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const isManager = await canManageProject(supabaseAdmin, user.id, projectId);
    if (!isManager) {
      return NextResponse.json({ error: 'Forbidden: Only owners and admins can delete shares' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('item_shares')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Share deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
