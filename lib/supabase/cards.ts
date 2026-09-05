import { createClient } from '@supabase/supabase-js';
import { DatabaseCard, Field } from '../types';
import { runSupabaseQuery } from './retry';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// 카드 생성 (CREATE)
export async function createCard(
  projectId: string,
  cardId: string,
  title: string,
  description: string,
  stepKey: string,
  fields: Field[],
  position: number = 0
): Promise<DatabaseCard | null> {
  const { data, error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .insert({
        project_id: projectId,
        card_id: cardId,
        title,
        description,
        step_key: stepKey,
        fields,
        position,
      })
      .select()
      .single()
  );

  if (error) {
    console.error('Error creating card:', error);
    return null;
  }

  return data as DatabaseCard;
}

// 프로젝트별 카드 목록 조회 (SELECT with project_id filter)
export async function fetchCardsByProject(projectId: string): Promise<DatabaseCard[]> {
  // 방어 로직: projectId가 유효하지 않으면 DB 쿼리를 실행하지 않고 빈 배열 반환
  if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
    console.warn('fetchCardsByProject: 유효하지 않은 projectId로 호출됨 — 빈 배열 반환', { projectId });
    return [];
  }

  const { data, error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
  );

  if (error) {
    // 에러 로깅 상세화: error 객체 전체 대신 주요 필드만 출력
    console.error('Error fetching cards:', {
      message: error.message,
      details: error.details,
      code: error.code,
    });
    return [];
  }

  return (data || []) as DatabaseCard[];
}

// 특정 단계의 카드 목록 조회
export async function fetchCardsByProjectAndStep(
  projectId: string,
  stepKey: string
): Promise<DatabaseCard[]> {
  const { data, error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .select('*')
      .eq('project_id', projectId)
      .eq('step_key', stepKey)
      .order('position', { ascending: true })
  );

  if (error) {
    console.error('Error fetching cards by step:', error);
    return [];
  }

  return (data || []) as DatabaseCard[];
}

// 카드 수정 (UPDATE with project_id filter)
export async function updateCard(
  cardId: string,
  projectId: string,
  updates: Partial<{
    title: string;
    description: string;
    step_key: string;
    fields: Field[];
    position: number;
  }>
): Promise<DatabaseCard | null> {
  const { data, error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .update(updates)
      .eq('id', cardId)
      .eq('project_id', projectId)
      .select()
      .single()
  );

  if (error) {
    console.error('Error updating card:', error);
    return null;
  }

  return data as DatabaseCard;
}

// 카드 삭제 (DELETE with project_id filter)
export async function deleteCard(cardId: string, projectId: string): Promise<boolean> {
  const { error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .delete()
      .eq('id', cardId)
      .eq('project_id', projectId)
  );

  if (error) {
    console.error('Failed to delete card:', error.message, '(code:', error.code, ')');
    return false;
  }

  return true;
}

// 카드 위치 변경 (UPDATE position with project_id filter)
export async function updateCardPosition(
  cardId: string,
  projectId: string,
  newPosition: number
): Promise<boolean> {
  const { error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .update({ position: newPosition })
      .eq('id', cardId)
      .eq('project_id', projectId)
  );

  if (error) {
    console.error('Error updating card position:', error);
    return false;
  }

  return true;
}

// 카드 단계 변경 (UPDATE step_key with project_id filter)
export async function updateCardStep(
  cardId: string,
  projectId: string,
  newStepKey: string,
  newPosition: number = 0
): Promise<boolean> {
  const { error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .update({ step_key: newStepKey, position: newPosition })
      .eq('id', cardId)
      .eq('project_id', projectId)
  );

  if (error) {
    console.error('Error updating card step:', error);
    return false;
  }

  return true;
}

// 프로젝트의 모든 카드 삭제 (프로젝트 삭제 시 사용)
export async function deleteAllCardsByProject(projectId: string): Promise<boolean> {
  const { error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .delete()
      .eq('project_id', projectId)
  );

  if (error) {
    console.error('Error deleting all cards for project:', error);
    return false;
  }

  return true;
}

// 프로젝트 카드 복제 (프로젝트 복제 시 사용)
export async function duplicateCardsForProject(
  sourceProjectId: string,
  targetProjectId: string
): Promise<boolean> {
  // 소스 프로젝트의 모든 카드 조회
  const sourceCards = await fetchCardsByProject(sourceProjectId);
  
  if (sourceCards.length === 0) {
    return true; // 복제할 카드가 없으면 성공으로 처리
  }

  // 타겟 프로젝트에 카드 복제
  const cardsToInsert = sourceCards.map(card => ({
    project_id: targetProjectId,
    card_id: card.card_id,
    title: card.title,
    description: card.description,
    step_key: card.step_key,
    fields: card.fields,
    position: card.position,
  }));

  const { error } = await runSupabaseQuery(() =>
    supabase
      .from('cards')
      .insert(cardsToInsert)
  );

  if (error) {
    console.error('Error duplicating cards:', error);
    return false;
  }

  return true;
}
