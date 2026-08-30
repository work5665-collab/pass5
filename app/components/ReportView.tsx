import React from 'react';
import { Step, Card } from '../types';

interface ReportViewProps {
  activeProject: { id: string; name: string };
  frameworkData: Step[];
  answers: Record<string, string>;
  isDark: boolean;
  navigateTo: (mode: any, extra?: any) => void;
  t: any;
}

export default function ReportView({
  activeProject,
  frameworkData,
  answers,
  isDark,
  navigateTo,
  t
}: ReportViewProps) {
  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full pb-16">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateTo('kanban')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
        >
          {t.back}
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-sm"
        >
          {t.printPdf}
        </button>
      </div>

      <div className={`p-10 rounded-2xl border ${isDark ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-xl'}`}>
        <div className="text-center mb-10 pb-6 border-b border-zinc-500/20">
          <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">PASS 5 FRAMEWORK SYSTEM</span>
          <h1 className="text-2xl font-black mt-1 mb-1">{activeProject?.name}</h1>
          <p className="text-xs opacity-50">종합 프로젝트 정의서 (Master Specification Document)</p>
        </div>

        <div className="flex flex-col gap-8">
          {frameworkData.map((col, idx) => (
            <div key={idx} className="pb-6 border-b border-zinc-500/10 last:border-0">
              <h3 className="text-sm font-bold text-blue-400 mb-4">{col.title}</h3>
              <div className="grid grid-cols-1 gap-4">
                {col.cards.map((card, cIdx) => (
                  <div key={cIdx} className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-800/30 border-zinc-700/40' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className="text-xs font-bold mb-2 text-blue-400">{card.title}</h4>
                    <div className="flex flex-col gap-2">
                      {card.fields.map((f, fIdx) => {
                        const val = answers[f.id];
                        return (
                          <div key={fIdx} className="text-xs">
                            <span className="opacity-60 font-medium">• {f.label}: </span>
                            {val ? (
                              <span className="font-semibold text-emerald-400">{val}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigateTo('detail', { cardId: card.id })}
                                className="text-blue-400 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                                title="클릭하여 해당 상세 페이지로 이동"
                              >
                                (미작성) ↗
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}