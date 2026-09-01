// 뷰 모드 타입
export type ViewMode = 'kanban' | 'focus' | 'detail' | 'report';

// 언어 모드 타입
export type LangMode = 'KO' | 'EN';

// 사전 타입
export interface DictType {
  workspace: string;
  projects: string;
  focusViews: string;
  addProjectBtn: string;
  projPlaceholder: string;
  kanbanView: string;
  reportView: string;
  kanbanGuide: string;
  completed100: string;
  inProgress: string;
  focusGo: string;
  editName: string;
  addCard: string;
  back: string;
  focusModeTitle: string;
  detailEdit: string;
  progress: string;
  formStatus: string;
  notEntered: string;
  prevCard: string;
  nextCard: string;
  firstCard: string;
  lastCard: string;
  selectAll: string;
  deselectAll: string;
  printPdf: string;
  lightMode: string;
  darkMode: string;
  langToggle: string;
}

// 프로젝트 타입
export interface Project {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  userRole?: string; // 현재 사용자의 권한
}

// 필드 타입
export interface Field {
  id: string;
  label: string;
  options: string[];
}

// 카드 타입
export interface Card {
  id: string;
  title: string;
  desc: string;
  fields: Field[];
}

// 단계 타입
export interface Step {
  stepKey: string;
  title: string;
  subtitle: string;
  cards: Card[];
}

// 새 카드 필드 타입
export interface NewCardField {
  label: string;
  optionsStr: string;
}

// DB 카드 타입 (Supabase cards 테이블)
export interface DatabaseCard {
  id: string;
  project_id: string;
  card_id: string;
  title: string;
  description: string;
  step_key: string;
  fields: Field[];
  position: number;
  created_at: string;
  updated_at: string;
}

// 사전 데이터 타입
export type DictData = Record<LangMode, DictType>;
