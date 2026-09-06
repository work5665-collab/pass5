import React from 'react';

export interface CustomInputBlockProps {
  isCustomMode: boolean;
  isEditMode: boolean;
  isDark?: boolean;
  customInputs: Record<string, string>;
  setCustomInputs: (v: Record<string, string>) => void;
  savePermanently: Record<string, boolean>;
  setSavePermanently: (v: Record<string, boolean>) => void;
  setDragDisabled: (v: boolean) => void;
  activeCardObj: any;
  field: any;
  handleCustomSubmit: (cardId: string, fieldId: string, isEdit: boolean) => void;
  setFieldModes: (prev: Record<string, string>) => void;
}

export default function CustomInputBlock({
  isCustomMode, isEditMode, isDark, customInputs, setCustomInputs,
  savePermanently, setSavePermanently, setDragDisabled,
  activeCardObj, field, handleCustomSubmit, setFieldModes,
}: CustomInputBlockProps) {
  try {
    const fieldId = field?.id;
    return (
      <div
        className={`mt-2 p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-zinc-900/90 border-blue-500/40' : 'bg-white border-blue-300 shadow-sm'}`}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        onDragStart={(e: React.DragEvent) => { e.stopPropagation(); e.preventDefault(); }}
      >
        <span className="text-[11px] font-bold text-blue-400">
          {isEditMode ? '선택된 문장 수정하기' : '주관식 직접 작성'}
        </span>
        <textarea
          rows={2}
          placeholder="원하시는 내용을 직접 상세히 적어주세요..."
          value={customInputs[fieldId] || ''}
          onChange={(e) => setCustomInputs({ ...customInputs, [fieldId]: e.target.value })}
          onFocus={() => setDragDisabled(true)}
          onBlur={() => setDragDisabled(false)}
          className={`w-full p-2.5 text-xs rounded-lg outline-none border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}`}
          onMouseDown={(e: React.MouseEvent) => { e.stopPropagation(); }}
          onDragStart={(e: React.DragEvent) => { e.stopPropagation(); e.preventDefault(); }}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] cursor-pointer opacity-80 hover:opacity-100">
            <input
              type="checkbox"
              checked={!!savePermanently[fieldId]}
              onChange={(e) => setSavePermanently({ ...savePermanently, [fieldId]: e.target.checked })}
              className="rounded border-zinc-600 text-blue-600 focus:ring-0"
            />
            <span>➕ 이 보기를 영구 옵션으로 누적 저장</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFieldModes((prev: Record<string, string>) => ({ ...prev, [fieldId]: 'SELECT' }))}
              className="px-3 py-1.5 bg-zinc-600 text-white text-xs rounded-lg"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => handleCustomSubmit(activeCardObj?.id, fieldId, isEditMode)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
            >
              적용하기
            </button>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    console.error('CustomInputBlock error:', e);
    return <div className="text-red-500 text-xs">입력 블록 오류</div>;
  }
}
