'use client';
import { useState, useEffect } from 'react';
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
  /** 외곥 드롭다운 — deprecated; 내부 자체 select 사용 */
  externalSelect?: React.ReactNode;
  /** 세트별 드롭다운 옵션 목록 (page에서 넘김) */
  dropdownOptions?: string[];
  /** 주관식 직접 입력 값 (page.tsx customInputs) */
  customInputValue?: string;
  /** 주관식 값 변경 (page.tsx setCustomInputs) */
  onCustomInputChange?: (val: string) => void;
  /** 주관식 적용 (page.tsx handleCustomSubmit) */
  onCustomSubmit?: (isEditMode: boolean) => void;
  /** 주관식 취소 (page.tsx setFieldModes → 'SELECT') */
  onCustomCancel?: () => void;
  /** 포커스 시 드래그 비활성화 */
  onSetDragDisabled?: (v: boolean) => void;
  /** 주관식 영구 저장 체크박스 상태 */
  savePermanently?: boolean;
  /** 주관식 영구 저장 체크박스 변경 */
  onSavePermanentlyChange?: (v: boolean) => void;
  /** 에디트 모드 여부 (page.tsx isEditMode) */
  isEditMode?: boolean;
  /** 세트 이름 표기 (수정 가능) */
  labelNames?: Record<number, string>;
  /** 세트 이름 변경 콜백 */
  onLabelChange?: (idx: number, val: string) => void;
}

/**
 * 다중 옵션 세트 컨테이너 + 단일 세트 row UI를 통합한 컴포넌트.
 * - 카드 내 기본 드롭다운 하단의 '독립 영역'에 위치
 * - 단방향 props 흐름 (page.tsx → Selector, setState 미노출)
 * - row 단위 렌더는 내부 함수(SetRow)로 캡슐화하여 외부 파일 파편화 방지
 */
export default function MultiOptionSelector({
  fieldId, optionSets, setsCount, value, isDark,
  onChange, onAddSet, onRemoveSet, onOpenImportPicker, onAiSuggest, onEditSet, externalSelect, dropdownOptions,
  customInputValue, onCustomInputChange, onCustomSubmit, onCustomCancel,
  onSetDragDisabled, savePermanently, onSavePermanentlyChange, isEditMode, labelNames, onLabelChange,
}: MultiOptionSelectorProps) {
  try {
    const [setSelects, setSetSelects] = useState<Record<number,string>>({});
    const [setCustomInputs, setSetCustomInputs] = useState<Record<number,string>>({});
    const setSelectVal = (idx:number,val:string) => setSetSelects(prev=>({...prev,[idx]:val}));
    const setCustomInputVal = (idx:number,val:string) => setSetCustomInputs(prev=>({...prev,[idx]:val}));
    const current = toOptionArray(value);
    const total = Math.max(1, setsCount);
    useEffect(() => { try { const arr = toOptionArray(value); arr.forEach((v, i) => { if (v && v.trim() !== '' && v !== 'direct') setSelectVal(i, v); }); } catch {} }, [value]);

    // 단일 세트 row (내부 캡슐화 — 외부 파일 의존 없음)
    const SetRow = ({ idx }: { idx: number }) => {
      const opts = optionSets[idx] || [];
      return (
        <div className={`flex flex-col gap-1.5 w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
          {/* 한 줄 통합: 드롭다운(좁게) + 세트 라벨 + 버튼들 — 모두 한 행 */}
          <div className="flex flex-row items-center gap-2 w-full">
            <input aria-label={`세트 ${idx+1} 라벨`} value={labelNames?.[idx] ?? `세트 ${idx+1}`} onChange={e=>onLabelChange?.(idx, e.target.value)} className="text-[10px] font-bold opacity-90 bg-zinc-800/30 border-b border-dashed border-blue-400/60 px-0.5 w-16 shrink-0 text-center focus:outline-none focus:border-blue-500 focus:bg-zinc-800 rounded-sm" />
            {/* 세트별 독립 드롭다운 — externalSelect 대체 */}
            <div className="flex-1 min-w-0">
              <select
                className={`w-full p-1.5 text-[10px] rounded-md outline-none border transition ${isDark ? 'bg-zinc-900 border-zinc-700 text-white focus:border-blue-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-500'}`}
                value={setSelects[idx] ?? ''}
                onChange={e=>{
                  const selVal = e.target.value;
                  setSelectVal(idx, selVal);
                  if(selVal === 'CUSTOM_MODE'){
                    const next=[...current]; next[idx]='direct'; onChange(fieldId,next);
                  } else if(selVal && selVal.trim() !== ''){
                    const next=[...current]; next[idx]=selVal; onChange(fieldId,next);
                  } else {
                    const next=[...current]; next[idx]=''; onChange(fieldId,next);
                  }
                }}
              >
                <option value="">--- 보기 중 하나를 선택하세요 ---</option>
                {(dropdownOptions || []).map((opt:string,oIdx:number)=>(
                  <option key={oIdx} value={opt}>{opt}</option>
                ))}
                <option value="CUSTOM_MODE">✏️ 직접 입력 (주관식 작성)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-auto">
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
                onClick={() => onOpenImportPicker?.(fieldId)}
                className="h-8 w-8 text-[12px] rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold transition flex items-center justify-center flex-shrink-0"
                title="옵션 가져오기"
                aria-label="옵션 가져오기"
              >
                <span>📥</span>
              </button>
              <button
                type="button"
                onClick={() => { onEditSet?.(fieldId, idx); setSelectVal(idx, 'EDIT_MODE'); const next=[...current]; next[idx]='direct'; onChange(fieldId,next); }}
                disabled={!( (current[idx] && current[idx].trim() !== '') || (setSelects[idx] && setSelects[idx].trim() !== '') )}
                className="h-7 w-7 text-[12px] rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-semibold transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                title="개별 수정"
                aria-label="개별 수정"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => onRemoveSet(fieldId, idx)}
                disabled={total <= 1}
                className={`h-7 w-7 text-[12px] rounded font-semibold transition flex items-center justify-center flex-shrink-0 ${total <= 1 ? 'bg-zinc-700/30 text-zinc-500 cursor-not-allowed' : 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white'}`}
                title="세트 삭제"
                aria-label="세트 삭제"
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className={`space-y-2 ${isDark ? 'text-white' : 'text-zinc-900'}`} data-multi-option-selector>
{/* 헤더 제거 — 슬림 레이아웃 */}

{/* 메타 제거 — 옵션 가져오기 버튼 UI 정리 */}
        {/* 동적 세트 rows */}
        {Array.from({ length: total }).map((_, idx) => (
          <div key={idx} className="w-full">
            <SetRow idx={idx} />
            { (setSelects[idx] === 'CUSTOM_MODE' || setSelects[idx] === 'EDIT_MODE') && (
              <div className={`w-full mt-1 p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-zinc-900/90 border-blue-500/40' : 'bg-white border-blue-300 shadow-sm'}`} onMouseDown={(e)=>e.stopPropagation()} onDragStart={(e)=>{e.stopPropagation();e.preventDefault()}}>
                <span className="text-[11px] font-bold text-blue-400">{setSelects[idx] === 'EDIT_MODE' ? '선택된 문장 수정하기' : '주관식 직접 작성'}</span>
                <textarea
                  rows={2}
                  placeholder="원하시는 내용을 직접 상세히 적어주세요..."
                  value={setCustomInputs[idx] ?? (customInputValue || '')}
                  onChange={(e) => { setCustomInputVal(idx, e.target.value); onCustomInputChange?.(e.target.value); }}
                  onFocus={() => onSetDragDisabled?.(true)}
                  onBlur={() => onSetDragDisabled?.(false)}
                  className={`w-full p-2.5 text-xs rounded-lg outline-none border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}`}
                  onMouseDown={(e)=>{e.stopPropagation()}} onDragStart={(e)=>{e.stopPropagation();e.preventDefault()}}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer opacity-80 hover:opacity-100">
                    <input
                      type="checkbox"
                      checked={!!savePermanently}
                      onChange={(e) => onSavePermanentlyChange?.(e.target.checked)}
                      className="rounded border-zinc-600 text-blue-600 focus:ring-0"
                    />
                    <span>➕ 이 보기를 영구 옵션으로 누적 저장</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { onCustomCancel?.(); const next=[...current]; next[idx]=''; onChange(fieldId,next); setSelectVal(idx,''); setCustomInputVal(idx,''); }} className="px-3 py-1.5 bg-zinc-600 text-white text-xs rounded-lg">취소</button>
                    <button type="button" onClick={() => { const text = setCustomInputs[idx] || customInputValue || ''; onCustomSubmit?.(setSelects[idx] === 'EDIT_MODE' ? true : !!isEditMode); if(text) { setSelectVal(idx, text); const next=[...current]; next[idx]=text; onChange(fieldId,next); } else { setSelectVal(idx,''); const next=[...current]; next[idx]=''; onChange(fieldId,next); } setCustomInputVal(idx,''); setSelectVal(idx, text ? text : ''); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition">적용하기</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => onAddSet(fieldId)}
          className="w-full py-0 text-[10px] leading-none border border-dashed border-zinc-700/50 hover:border-zinc-500 rounded text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1 transition-colors mt-1" style={{ height: "20px", minHeight: "20px", maxHeight: "20px" }}
          title="세트 추가"
          aria-label="세트 추가"
        >
          <span>＋</span> 세트 추가
        </button>

{/* 메타 텍스트 제거 / +버튼 내부 이동 */}
      </div>
    );
  } catch (e) {
    console.error('MultiOptionSelector error:', e);
    return <div className="text-red-500 text-xs">다중 옵션 UI 오류</div>;
  }
}
