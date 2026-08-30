export interface Field {
  id: string;
  label: string;
  options?: string[];
}

export interface Card {
  id: string;
  title: string;
  desc: string;
  fields: Field[];
}

export interface Step {
  stepKey: string;
  title: string;
  subtitle: string;
  cards: Card[];
}

export interface Project {
  id: string;
  name: string;
}

export type ViewMode = 'kanban' | 'focus' | 'detail' | 'report';
export type LangMode = 'ko' | 'en';