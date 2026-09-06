'use client';
import MultiOptionSetRow from './MultiOptionSetRow';
import { toOptionArray, toggleOptionIn, joinOptionsToText } from '@/lib/fieldValues';

export interface MultiOptionPanelProps {
  fieldId: string;
  optionSets: string[][];
  setsCount: number;
  value: string | string[] | null | undefined;
  isDark?: boolean;
  onChange: (fieldId: string, val: string[]) => void;
  onAddSet: (fieldId: string) => void;
  onRemoveSet: (fieldId: string, setIdx: number) => void;
  onOpenImportPicker?: (fieldId: string) => void;
  onAiSuggest?: (fieldId: string, setIdx: number) => void;
  onEditSet?: (fieldId: string, setIdx: number) => void;
}

/** 다중 옵션 컨테이너 — 헤더 + 동적 세트 rows + + 추가 버튼 (단방향 props) */
export default function MultiOptionPanel({
  fieldId, optionSets, setsCount, value, isDark,
  onChange, onAddSet, onRemoveSet, onOpenImportPicker, onAiSuggest, onEditSet,
}: MultiOptionPanelProps) {
  try {
    const current = toOptionArray(value);
    const total = Math.max(1, setsCount);
    return (
      <div className={`space-y-2 ${isDark ? 'text-white' : 'text-zinc-900'}`} data-multi-option-panel>
        {/* 헤더: 제목 + 카운트 + 옵션 가져오기 */}
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-semibold opacity-80">다중 옵션 세트</span>
          <div className="flex items-center gap-2">
            <span className="opacity-60">{current.length}개 선택됨 / {total}개 세트</span>
            {onOpenImportPicker && (
              <button
                type="button"
                onClick={() => onOpenImportPicker(fieldId)}
                className="px-2 py-0.5 text-[10px] rounded bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 font-semibold transition"
              >
                📋 옵션 가져오기
              </button>
            )}
          </div>
        </div>

        {/* 동적 세트 rows */}
        {Array.from({ length: total }).map((_, idx) => (
          <MultiOptionSetRow
            key={idx}
            setIndex={idx}
            options={optionSets[idx] || []}
            selected={current}
            isDark={isDark}
            canRemove={total > 1}
            onToggleOption={(opt) => onChange(fieldId, toggleOptionIn(current, opt))}
            onAiSuggest={(i) => onAiSuggest?.(fieldId, i)}
            onEditSet={(i) => onEditSet?.(fieldId, i)}
            onRemoveSet={(i) => onRemoveSet(fieldId, i)}
          />
        ))}

        {/* + 세트 추가 버튼 */}
        <button
          type="button"
          onClick={() => onAddSet(fieldId)}
          className={`w-full py-1.5 text-[11px] font-semibold rounded-lg border border-dashed transition ${isDark ? 'border-zinc-600 text-zinc-400 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50'}`}
        >
          + 세트 추가
        </button>

        <div className="text-[11px] opacity-70 mt-1">
          선택: {joinOptionsToText(current) || '—'}
        </div>
      </div>
    );
  } catch (e) {
    console.error('MultiOptionPanel error:', e);
    return <div className="text-red-500 text-xs">다중 옵션 패널 오류</div>;
  }
}
