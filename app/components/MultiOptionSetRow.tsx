'use client';

export interface MultiOptionSetRowProps {
  setIndex: number;
  options: string[];
  selected: string[];
  isDark?: boolean;
  canRemove: boolean;
  onToggleOption: (opt: string) => void;
  onAiSuggest?: (setIdx: number) => void;
  onEditSet?: (setIdx: number) => void;
  onRemoveSet?: (setIdx: number) => void;
}

/** 단일 세트 row — 라벨 + 드롭다운 + AI/수정/삭제 통일 정렬 */
export default function MultiOptionSetRow({
  setIndex, options, selected, isDark, canRemove,
  onToggleOption, onAiSuggest, onEditSet, onRemoveSet,
}: MultiOptionSetRowProps) {
  try {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
      >
        <span className="text-[10px] font-bold opacity-60 whitespace-nowrap w-12">세트 {setIndex + 1}</span>

        <select
          aria-label={`세트 ${setIndex + 1} 옵션`}
          className={`flex-1 min-w-0 text-xs px-2 py-1.5 rounded border outline-none ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
          onChange={(e) => {
            if (!e.target.value) return;
            onToggleOption(e.target.value);
            e.target.value = '';
          }}
          defaultValue=""
        >
          <option value="">— 옵션 선택 —</option>
          {options.map((o) => (
            <option key={o} value={o}>{selected.includes(o) ? `✓ ${o}` : o}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onAiSuggest?.(setIndex)}
            className="h-7 px-2 text-[10px] rounded bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white font-semibold transition flex items-center gap-1"
            title="AI 추천"
          >
            <span>🤖</span><span>AI 추천</span>
          </button>
          <button
            type="button"
            onClick={() => onEditSet?.(setIndex)}
            className="h-7 w-7 text-[12px] rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-semibold transition flex items-center justify-center"
            title="개별 수정"
            aria-label="개별 수정"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={() => onRemoveSet?.(setIndex)}
            disabled={!canRemove}
            className={`h-7 w-7 text-[12px] rounded font-semibold transition flex items-center justify-center ${canRemove ? 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white' : 'bg-zinc-700/30 text-zinc-500 cursor-not-allowed'}`}
            title="세트 삭제"
            aria-label="세트 삭제"
          >
            🗑
          </button>
        </div>
      </div>
    );
  } catch (e) {
    console.error('MultiOptionSetRow error:', e);
    return <div className="text-red-500 text-xs">row 렌더 오류</div>;
  }
}
