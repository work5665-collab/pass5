import React from 'react';
import { Step } from '../types';

interface ModalsProps {
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: (val: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (val: string) => void;
  inviteRole: string;
  setInviteRole: (val: string) => void;
  handleSendInvite: () => void;

  isPickerOpen: boolean;
  setIsPickerOpen: (val: boolean) => void;
  pickerSearchQuery: string;
  setPickerSearchQuery: (val: string) => void;
  pickerStepKey: string;
  setPickerStepKey: (key: string) => void;
  pickerCardId: string;
  setPickerCardId: (id: string) => void;
  frameworkData: Step[];
  customOptions: Record<string, string[]>;
  selectedPickedOptions: string[];
  setSelectedPickedOptions: (val: string[]) => void;
  helperToggleOption: (opt: string) => void;
  handleApplyPickedOptions: () => void;
  isDark: boolean;
}

export default function Modals({
  isInviteModalOpen,
  setIsInviteModalOpen,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  handleSendInvite,
  isPickerOpen,
  setIsPickerOpen,
  pickerSearchQuery,
  setPickerSearchQuery,
  pickerStepKey,
  setPickerStepKey,
  pickerCardId,
  setPickerCardId,
  frameworkData,
  customOptions,
  selectedPickedOptions,
  setSelectedPickedOptions,
  helperToggleOption,
  handleApplyPickedOptions,
  isDark
}: ModalsProps) {
  const query = pickerSearchQuery.trim().toLowerCase();

  return (
    <>
      {/* 초대하기 팝업 모달 */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl p-6 border shadow-2xl flex flex-col gap-4 ${isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'}`}>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-500/20">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>💌</span> 팀원 초대하기
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-xs opacity-60 hover:opacity-100">✕ 닫기</button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold opacity-60 mb-1 block">초대할 이메일</label>
                <input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg outline-none border transition ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-blue-400'}`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold opacity-60 mb-1 block">부여할 역할 (권한)</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg outline-none border transition ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-blue-400'}`}
                >
                  <option value="admin">관리자 (초대/멤버관리/편집/보기 가능)</option>
                  <option value="member">멤버 (내용 편집 및 보기 가능)</option>
                  <option value="viewer">뷰어 (보기만 가능, 외부 클라이언트용)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-500/20 flex justify-end gap-2">
              <button onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-xs rounded-lg bg-zinc-600 text-white hover:bg-zinc-500 transition">
                취소
              </button>
              <button onClick={handleSendInvite} className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition">
                초대 메일 보내기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기존 옵션 가져오기(Picker) 모달 창 */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-2xl p-6 border flex flex-col gap-4 shadow-2xl ${isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'}`}>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-500/20">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>📋</span> 기존 데이터 및 영구 누적 옵션 가져오기
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="검색 키워드 (예: 협업, 자동화)..."
                    value={pickerSearchQuery}
                    onChange={(e) => setPickerSearchQuery(e.target.value)}
                    className={`px-3 py-1 text-xs rounded-lg outline-none border w-56 transition ${isDark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500' : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400'}`}
                  />
                  {pickerSearchQuery && (
                    <button
                      onClick={() => setPickerSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-50 hover:opacity-100"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button onClick={() => { setIsPickerOpen(false); setPickerSearchQuery(''); }} className="text-xs opacity-60 hover:opacity-100 px-1.5 py-1">✕ 닫기</button>
              </div>
            </div>

            {!query && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold opacity-60">1. 단계(대분류) 선택</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {frameworkData.map((step) => (
                      <button
                        key={step.stepKey}
                        onClick={() => {
                          setPickerStepKey(step.stepKey);
                          if (step.cards.length > 0) setPickerCardId(step.cards[0].id);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                          pickerStepKey === step.stepKey
                            ? 'bg-blue-600 text-white'
                            : (isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300')
                        }`}
                      >
                        {step.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold opacity-60">2. 카드(소분류) 선택</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {frameworkData.find(s => s.stepKey === pickerStepKey)?.cards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setPickerCardId(card.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap truncate max-w-[200px] ${
                          pickerCardId === card.id
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 font-bold'
                            : (isDark ? 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')
                        }`}
                      >
                        {card.title}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {query && (
              <div className="text-[11px] text-blue-400 font-medium">
                🔍 &quot;{pickerSearchQuery}&quot; 키워드가 포함된 옵션 및 관련 질문 검색 결과입니다.
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              <span className="text-[11px] font-bold opacity-60">
                {query ? '검색된 옵션 및 출처 질문 목록' : '3. 가져올 보기 옵션들 다중 선택'}
              </span>

              {(() => {
                let itemsToRender: { field: any; stepTitle: string; cardTitle: string; cardId: string }[] = [];

                if (query) {
                  frameworkData.forEach(step => {
                    step.cards.forEach(card => {
                      card.fields.forEach((field: any) => {
                        const baseOpts = field.options || [];
                        const customOpts = customOptions[field.id] || [];
                        const allOpts = [...baseOpts, ...customOpts];
                        
                        const matches = allOpts.some((o: string) => o.toLowerCase().includes(query)) || field.label.toLowerCase().includes(query);
                        if (matches) {
                          itemsToRender.push({ field, stepTitle: step.title, cardTitle: card.title, cardId: card.id });
                        }
                      });
                    });
                  });
                } else {
                  const step = frameworkData.find(s => s.stepKey === pickerStepKey);
                  const card = step?.cards.find(c => c.id === pickerCardId);
                  if (card) {
                    card.fields.forEach((field: any) => {
                      itemsToRender.push({ field, stepTitle: step!.title, cardTitle: card.title, cardId: card.id });
                    });
                  }
                }

                if (itemsToRender.length === 0) {
                  return <div className="text-xs opacity-50 p-4 text-center">검색 결과가 없습니다.</div>;
                }

                return itemsToRender.map((item, iIdx) => {
                  const baseOpts = item.field.options || [];
                  const customOpts = customOptions[item.field.id] || [];
                  const allOpts = Array.from(new Set([...baseOpts, ...customOpts]));

                  return (
                    <div key={iIdx} className={`p-3 rounded-lg border flex flex-col gap-2 ${isDark ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-zinc-50 border-zinc-200'}`}>
                      {query && (
                        <div className="text-[10px] opacity-50 flex items-center gap-1 mb-1">
                          <span>{item.stepTitle}</span> <span>›</span> <span>{item.cardTitle}</span>
                        </div>
                      )}
                      <div className="text-xs font-bold text-blue-400">{item.field.label}</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {allOpts.map((opt: string, oIdx: number) => {
                          const isSelected = selectedPickedOptions.includes(opt);
                          const isMatch = query && opt.toLowerCase().includes(query);
                          return (
                            <button
                              key={oIdx}
                              onClick={() => helperToggleOption(opt)}
                              className={`px-2.5 py-1.5 text-[11px] rounded-md transition text-left leading-tight ${
                                isSelected
                                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                                  : (isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-200 text-zinc-700 border border-zinc-200')
                              } ${isMatch && !isSelected ? 'border-blue-500/50 border' : ''}`}
                            >
                              {isSelected && '✓ '} {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-2 pt-3 border-t border-zinc-500/20 flex justify-between items-center">
              <div className="text-[11px] opacity-70">
                선택된 항목: <span className="font-bold text-blue-400">{selectedPickedOptions.length}개</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setIsPickerOpen(false); setPickerSearchQuery(''); setSelectedPickedOptions([]); }} className="px-4 py-2 text-xs rounded-lg bg-zinc-600 text-white hover:bg-zinc-500 transition">
                  취소
                </button>
                <button onClick={handleApplyPickedOptions} className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm">
                  선택 항목 가져오기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}