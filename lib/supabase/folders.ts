import { createClient } from '@supabase/supabase-js';
import { Folder } from '../types';
import { describeSupabaseError } from './error';
import { runSupabaseQuery } from './retry';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// 전체 폴더 목록 조회 (SELECT)
export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await runSupabaseQuery(() =>
    supabase
      .from('folders')
      .select('*')
      .order('created_at', { ascending: true })
  );

  if (error) {
    // '{}' 로 보이던 기존 로그 대신 실제 원인(message/code/details/hint)을 명시 출력
    console.error('Error fetching folders:', describeSupabaseError(error), error);
    return [];
  }

  return (data || []) as Folder[];
}

// 폴더 생성 (CREATE)
// parentId가 null이면 1단계, 있으면 2단계 폴더
export async function createFolder(
  name: string,
  parentId: string | null,
  userId: string
): Promise<Folder | null> {
  const { data, error } = await runSupabaseQuery(() =>
    supabase
      .from('folders')
      .insert({
        name,
        parent_id: parentId,
        user_id: userId,
      })
      .select()
      .single()
  );

  if (error) {
    console.error('Error creating folder:', error);
    return null;
  }

  return data as Folder;
}

// 폴더 이름 수정 (UPDATE)
export async function updateFolder(folderId: string, name: string): Promise<boolean> {
  const { error } = await runSupabaseQuery(() =>
    supabase
      .from('folders')
      .update({ name })
      .eq('id', folderId)
  );

  if (error) {
    console.error('Error updating folder:', error);
    return false;
  }

  return true;
}

// 폴더 삭제 (DELETE)
export async function deleteFolder(folderId: string): Promise<boolean> {
  const { error } = await runSupabaseQuery(() =>
    supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
  );

  if (error) {
    console.error('Error deleting folder:', error);
    return false;
  }

  return true;
}

// 프로젝트를 폴더에 배정 / 미분류 이동 (UPDATE projects.folder_id)
// folderId가 null이면 미분류로 이동
export async function assignProjectToFolder(
  projectId: string,
  folderId: string | null
): Promise<boolean> {
  const { error } = await runSupabaseQuery(() =>
    supabase
      .from('projects')
      .update({ folder_id: folderId })
      .eq('id', projectId)
  );

  if (error) {
    console.error('Error assigning project to folder:', error);
    return false;
  }

  return true;
}
