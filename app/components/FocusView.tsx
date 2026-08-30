import React from 'react';
import { Step, Card } from '../types';

interface FocusViewProps {
  activeStepKey: string;
  frameworkData: Step[];
  isDark: boolean;
  navigateTo: (mode: any, extra?: any) => void;
  getCardProgress: (card: Card) => number;
  t: any;
}

export default function FocusView({
  activeStepKey,
  frameworkData,
  isDark,
  navigateTo,
  getCardProgress,
  t
}: FocusViewProps) {
  const currentStep = frameworkData.find(s => s.stepKey === activeStepKey) || frameworkData[0];

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full pb-10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateTo('kanban')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
        >
          {t.back}
        </button>
        <div className="text-xs font-bold opacity-50 uppercase tracking-wider">{t.focusModeTitle}</div>
      </div>

      <div className={`p-6 rounded-2xl border mb-6 ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
        <h2 className="text-2xl font-black tracking-tight mb-1">{currentStep.title}</h2>
        <p className="text-xs opacity-60">{currentStep.subtitle}</p>
      </div>

      <div className="flex flex-col gap-4">
        {currentStep.cards.map((card, idx) => {
          const progress = getCardProgress(card);
          const isCompleted = progress === 100;

          return (
            <div
              key={card.id}
              onClick={() => navigateTo('detail', { cardId: card.id })}
              className={`p-5 rounded-2xl border cursor-pointer transition group ${
                isCompleted
                  ? (isDark ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500' : 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-400')
                  : (isDark ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs')
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold opacity-40">CARD {idx + 1}</span>
                <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {isCompleted ? t.completed100 : `${t.progress} ${progress}%`}
                </span>
              </div>
              <h3 className="text-base font-extrabold mb-1 group-hover:text-blue-400 transition">{card.title}</h3>
              <p className="text-xs opacity-60 leading-relaxed mb-4">{card.desc}</p>
              
              <div className="flex items-center justify-between pt-3 border-t border-zinc-500/10">
                <span className="text-[11px] font-semibold opacity-50">하위 세부 항목 {card.fields.length}개</span>
                <span className="text-xs font-bold text-blue-500 group-hover:translate-x-1 transition">상세 입력하기 →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}