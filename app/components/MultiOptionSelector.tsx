'use client';
import { toOptionArray, toggleOptionIn, joinOptionsToText } from '@/lib/fieldValues';

export interface MultiOptionSelectorProps {
  optionSets: string[][];
  value: string | string[] | null | undefined;
  onChange: (val: string[]) => void;
  isDark?: boolean;
}

export default function MultiOptionSelector({ optionSets, value, onChange, isDark }: MultiOptionSelectorProps) {
  try {
    const current = toOptionArray(value);
    return (
      <div className={`space-y-2 ${isDark ? 'text-white' : 'text-zinc-900'}`} data-multi-option-selector>
        <div className="flex items-center justify-between text-[11px] opacity-70">
          <span>다중 옵션 세트</span>
          <span>{current.length}개 선택됨</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="opacity-60">+ 세트 추가</span>
          <span className="opacity-50">{optionSets.length}개 세트</span>
        </div>
        {optionSets.map((set, idx) => (
          <div key={idx} className="flex flex-wrap gap-2">
            {set.map((opt) => {
              const selected = current.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(toggleOptionIn(current, opt))}
                  className={`px-2.5 py-1 text-xs rounded-md border transition ${selected ? (isDark ? 'bg-blue-600 border-blue-400 text-white' : 'bg-blue-600 border-blue-600 text-white') : (isDark ? 'bg-zinc-800 border-zinc-600 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-700')}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ))}
        <div className="text-xs opacity-70">선택됨: {joinOptionsToText(current) || '—'}</div>
      </div>
    );
  } catch (e) {
    console.error('MultiOptionSelector error:', e);
    return <div className="text-red-500 text-xs">선택 오류</div>;
  }
}
