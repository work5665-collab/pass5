import React from 'react';
import type { FormDataMap } from '@/lib/types';

export interface HeaderProgressProps {
  projectKey: string;
  formData: FormDataMap;
  frameworkDataPerProject?: Record<string, unknown>;
  isDark?: boolean;
}

export default function HeaderProgress({ projectKey, formData, isDark }: HeaderProgressProps) {
  // Agent 7 방어: undefined guard + 타입 가드
  const projStore = (formData && typeof formData === 'object' && formData[projectKey]) ? formData[projectKey] : {};
  const progress = (projStore && typeof projStore === 'object' && 'progress' in projStore) ? (projStore as Record<string, unknown>).progress : 0;
  return (
    <header className={`w-full px-6 py-3 ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'} border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">PASS 5 — 진행률</h2>
        <span className="text-sm opacity-80">{typeof progress === 'number' ? `${Math.round(progress)}%` : '—'}</span>
      </div>
    </header>
  );
}
// Agent 7 추가: runtime crash guard (try-catch wrapper for usage)
export function safeHeaderProgress(props: HeaderProgressProps) {
  try {
    return <HeaderProgress {...props} />;
  } catch {
    return <header className="w-full px-6 py-3 bg-zinc-900 text-white">오류</header>;
  }
}
