'use client';
import { toOptionArray, toggleOptionIn, joinOptionsToText } from '@/lib/fieldValues';

export interface MultiOptionSelectorProps {
  /** field 식별자 */
  fieldId: string;
  /** 옵션 세트 정의 (필드별) */
  optionSets: string[][];
  /** 현재 동적으로 추가된 세트 수 (page.tsx 상태) */
  setsCount: number;
  /** 현재 값 (단일 string 또는 string[]) */
  value: string | string[] | null | undefined;
  /** 다크 테마 여부 */
  isDark?: boolean;
  /** 값 변경 콜백 (fieldId, string[]) — page.tsx가 setCustomInputs 처리 */
  onChange: (fieldId: string, val: string[]) => void;
  /** 세트 추가 콜백 */
  onAddSet: (fieldId: string) => void;
  /** 세트 삭제 콜백 */
  onRemoveSet: (fieldId: string, setIdx: number) => void;
  /** 옵션 가져오기 모달 열기 콜백 */
  onOpenImportPicker?: (fieldId: string) => void;
  /** AI 추천 콜백 */
  onAiSuggest?: (fieldId: string, setIdx: number) => void;
  /** 개별 수정 콜백 */
  onEditSet?: (fieldId: string, setIdx: number) => void;
}

/**
 * 다중 옵션 세트 컨테이너 + 단일 세트 row UI를 통합한 컴포넌트.
 * - 카드 내 기본 드롭다운 하단의 '독립 영역'에 위치
 * - 단방향 props 흐름 (page.tsx → Selector, setState 미노출)
 * - row 단위 렌더는 내부 함수(SetRow)로 캡슐화하여 외부 파일 파편화 방지
 */
export default function MultiOptionSelector({
  fieldId, optionSets, setsCount, value, isDark,
  onChange, onAddSet, onRemoveSet, onOpenImportPicker, onAiSuggest, onEditSet,
}: MultiOptionSelectorProps) {
  try {
    const current = toOptionArray(value);
    const total = Math.max(1, setsCount);

    // 단일 세트 row (내부 캡슐화 — 외부 파일 의존 없음)
    const SetRow = ({ idx }: { idx: number }) => {
      const opts = optionSets[idx] || [];
      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
          <input aria-label={`세트 ${idx+1} 라벨`} defaultValue={`세트 ${idx+1}`} onChange={e=>{}} className="text-[10px] font-bold opacity-90 bg-zinc-800/30 border-b border-dashed border-blue-400/60 px-0.5 w-16 text-center focus:outline-none focus:border-blue-500 focus:bg-zinc-800 rounded-sm" />
          <select
            aria-label={`세트 ${idx + 1} 옵션`}
            className={`flex-1 min-w-0 text-xs px-2 py-1.5 rounded border outline-none ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
            onChange={(e) => {
              if (!e.target.value) return;
              onChange(fieldId, toggleOptionIn(current, e.target.value));
              e.target.value = '';
            }}
            defaultValue=""
          >
            <option value="">— 옵션 선택 —</option>
            {opts.map((o) => (
              <option key={o} value={o}>{current.includes(o) ? `✓ ${o}` : o}</option>
            ))}
          </select>
          {/* 통일된 우측 버튼: AI추천 [아이콘+텍스트] / 수정·삭제 [아이콘] */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onAiSuggest?.(fieldId, idx)}
              className="h-7 px-2 text-[10px] rounded bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white font-semibold transition flex items-center gap-1"
              title="AI 추천"
            >
              <span>🤖</span><span>AI 추천</span>
            </button>
            <button
              type="button"
              onClick={() => onEditSet?.(fieldId, idx)}
              className="h-7 w-7 text-[12px] rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-semibold transition flex items-center justify-center"
              title="개별 수정"
              aria-label="개별 수정"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => onRemoveSet(fieldId, idx)}
              disabled={total <= 1}
              className={`h-7 w-7 text-[12px] rounded font-semibold transition flex items-center justify-center ${total <= 1 ? 'bg-zinc-700/30 text-zinc-500 cursor-not-allowed' : 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white'}`}
              title="세트 삭제"
              aria-label="세트 삭제"
            >
              🗑
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className={`space-y-2 ${isDark ? 'text-white' : 'text-zinc-900'}`} data-multi-option-selector>
{/* 헤더 제거 — 슬림 레이아웃 */}

        {/* 슬림 상단: 선택 상태 + 아이콘 가져오기 */}
        <div className="flex items-center justify-between text-[11px] opacity-70 mb-1">
          <span>{current.length}개 선택 / {total}세트</span>
          {onOpenImportPicker && (
            <button type="button" onClick={() => onOpenImportPicker(fieldId)} className="h-6 w-6 rounded hover:bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs" title="옵션 가져오기" aria-label="옵션 가져오기">📋</button>
          )}
        </div>
        {/* 동적 세트 rows */}
        {Array.from({ length: total }).map((_, idx) => <SetRow key={idx} idx={idx} />)}

        {/* + 세트 추가 버튼 (카드 내 독립 영역) */}
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
    console.error('MultiOptionSelector error:', e);
    return <div className="text-red-500 text-xs">다중 옵션 UI 오류</div>;
  }
}
