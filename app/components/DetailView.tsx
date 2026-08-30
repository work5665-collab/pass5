import React from 'react';
import { Card, Step } from '../types';

interface DetailViewProps {
  activeCardId: string;
  frameworkData: Step[];
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isDark: boolean;
  navigateTo: (mode: any, extra?: any) => void;
  getCardProgress: (card: Card) => number;
  setPickerTargetType: (type: any) => void;
  setPickerTargetFieldId: (id: string | null) => void;
  setIsPickerOpen: (isOpen: boolean) => void;
  t: any;
}

export default function DetailView({
  activeCardId,
  frameworkData,
  answers,
  setAnswers,
  isDark,
  navigateTo,
  getCardProgress,
  setPickerTargetType,
  setPickerTargetFieldId,
  setIsPickerOpen,
  t
}: DetailViewProps) {
  let targetCard: Card | null = null;
  let parentStep: Step | null = null;

  for (const step of frameworkData) {
    const found = step.cards.find(c => c.id === activeCardId);
    if (found) {
      targetCard = found;
      parentStep = step;
      break;
    }
  }

  if (!targetCard || !parentStep) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <p className="text-sm opacity-60 mb-4">카드를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigateTo('kanban')}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          {t.kanbanView}로 돌아가기
        </button>
      </div>
    );
  }

  const allCards = frameworkData.flatMap(s => s.cards);
  const currentCardIdx = allCards.findIndex(c => c.id === activeCardId);
  const prevCardObj = currentCardIdx > 0 ? allCards[currentCardIdx - 1] : null;
  const nextCardObj = currentCardIdx < allCards.length - 1 ? allCards[currentCardIdx + 1] : null;

  const progress = getCardProgress(targetCard);
  const isCompleted = progress === 100;

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full pb-16">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateTo('kanban')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
        >
          {t.back}
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {parentStep.title}
          </span>
        </div>
      </div>

      <div className={`p-6 rounded-2xl border mb-6 ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
            {isCompleted ? t.completed100 : `${t.progress} ${progress}%`}
          </span>
          <div className="w-24 bg-zinc-700/30 h-2 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">{targetCard.title}</h1>
        <p className="text-xs opacity-60 leading-relaxed">{targetCard.desc}</p>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        <div className="text-xs font-bold opacity-50 uppercase tracking-wider">{t.formStatus}</div>

        {targetCard.fields.map((field, fIdx) => {
          const val = answers[field.id] || "";

          return (
            <div key={field.id} className={`p-5 rounded-2xl border flex flex-col gap-3 ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'}`}>
              <div className="flex justify-between items-start">
                <label className="text-xs font-bold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-extrabold">{fIdx + 1}</span>
                  <span>{field.label}</span>
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <textarea
                  rows={3}
                  value={val}
                  onChange={(e) => {
                    setAnswers(prev => ({ ...prev, [field.id]: e.target.value }));
                  }}
                  placeholder={t.notEntered}
                  className={`w-full p-3 text-xs rounded-xl border outline-none resize-none transition ${isDark ? 'bg-zinc-800/80 border-zinc-700 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-blue-500'}`}
                />

                {field.options && field.options.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold opacity-50">추천 선택 옵션</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPickerTargetType('fieldOptions');
                          setPickerTargetFieldId(field.id);
                          setIsPickerOpen(true);
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold transition"
                      >
                        📋 옵션 골라 넣기 ↗
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {field.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => {
                            const cur = answers[field.id] || "";
                            const updated = cur ? `${cur}\n- ${opt}` : `- ${opt}`;
                            setAnswers(prev => ({ ...prev, [field.id]: updated }));
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition ${isDark ? 'bg-zinc-800/60 border-zinc-700 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'}`}
                        >
                          + {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-zinc-500/10">
        <button
          onClick={() => prevCardObj && navigateTo('detail', { cardId: prevCardObj.id })}
          disabled={!prevCardObj}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${prevCardObj ? (isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800') : 'opacity-30 cursor-not-allowed bg-zinc-800/40 text-zinc-500'}`}
        >
          {t.prevCard}
        </button>
        <button
          onClick={() => nextCardObj && navigateTo('detail', { cardId: nextCardObj.id })}
          disabled={!nextCardObj}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${nextCardObj ? (isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800') : 'opacity-30 cursor-not-allowed bg-zinc-800/40 text-zinc-500'}`}
        >
          {t.nextCard}
        </button>
      </div>
    </div>
  );
}