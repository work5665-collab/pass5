'use client';
import { toOptionArray, toggleOptionIn, joinOptionsToText } from '@/lib/fieldValues';

export interface MultiOptionSelectorProps {
  optionSets: string[][];
  value: string | string[] | null | undefined;
  onChange: (val: string[]) => void;
  isDark?: boolean;
  onAddSet?: () => void;
  onRemoveSet?: (setIdx: number) => void;
  onAiSuggest?: (setIdx: number) => void;
  onEditSet?: (setIdx: number) => void;
  setsCount?: number;
}

export default function MultiOptionSelector({
  optionSets,
  value,
  onChange,
  isDark,
  onAddSet,
  onRemoveSet,
  onAiSuggest,
  onEditSet,
  setsCount,
}: MultiOptionSelectorProps) {
  try {
    const current = toOptionArray(value);
    const totalSets = setsCount ?? optionSets.length;
    return (
      <div className={`space-y-2 ${isDark ? 'text-white' : 'text-zinc-900'}`} data-multi-option-selector>
        {/* 헤더: + 세트 추가 + 카운트 */}
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-semibold opacity-80">다중 옵션 세트</span>
          <span className="opacity-60">{current.length}개 선택됨 / {totalSets}개 세트</span>
        </div>

        {/* 세트 행들 (통일 row) */}
        {Array.from({ length: totalSets }).map((_, idx) => {
          const opts = optionSets[idx] || [];
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
            >
              {/* 세트 라벨 (통일 너비) */}
              <span className="text-[10px] font-bold opacity-60 whitespace-nowrap w-12">세트 {idx + 1}</span>

              {/* 드롭다운 */}
              <select
                className={`flex-1 min-w-0 text-xs px-2 py-1.5 rounded border outline-none ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
                onChange={(e) => {
                  if (!e.target.value) return;
                  onChange(toggleOptionIn(current, e.target.value));
                  e.target.value = '';
                }}
                defaultValue=""
              >
                <option value="">— 옵션 선택 —</option>
                {opts.map((o) => (
                  <option key={o} value={o}>{current.includes(o) ? `✓ ${o}` : o}</option>
                ))}
              </select>

              {/* 통일 우측 버튼 세트: AI추천 / 개별 수정 / 개별 삭제 */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onAiSuggest?.(idx)}
                  className="h-7 px-2 text-[10px] rounded bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white font-semibold transition"
                  title="AI 추천"
                >
                  🤖
                </button>
                <button
                  type="button"
                  onClick={() => onEditSet?.(idx)}
                  className="h-7 px-2 text-[10px] rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-semibold transition"
                  title="개별 수정"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSet?.(idx)}
                  disabled={totalSets <= 1}
                  className={`h-7 px-2 text-[10px] rounded font-semibold transition ${totalSets <= 1 ? 'bg-zinc-700/30 text-zinc-500 cursor-not-allowed' : 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white'}`}
                  title="세트 삭제"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}

        {/* + 세트 추가 버튼 (통일 너비) */}
        <button
          type="button"
          onClick={() => onAddSet?.()}
          className={`w-full py-1.5 text-[11px] font-semibold rounded-lg border border-dashed transition ${isDark ? 'border-zinc-600 text-zinc-400 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50'}`}
        >
          + 세트 추가
        </button>

        {/* 선택 표시 */}
        <div className="text-[11px] opacity-70 mt-1">
          선택: {joinOptionsToText(current) || '—'}
        </div>
      </div>
    );
  } catch (e) {
    console.error('MultiOptionSelector error:', e);
    return <div className="text-red-500 text-xs">다중 옵션 UI 오류</div>;
  }
}
