'use client';

import React from 'react';
import { ViewMode, DictType, Field, Card, Step, NewCardField } from '../lib/types';

interface KanbanBoardProps {
  frameworkData: Step[];
  isDark: boolean;
  t: DictType;
  editingStepMetaKey: string | null;
  tempStepTitle: string;
  tempStepSubtitle: string;
  editingCardId: string | null;
  tempCardTitle: string;
  tempCardDesc: string;
  addingCardStepKey: string | null;
  newCardTitle: string;
  newCardDesc: string;
  newCardFields: NewCardField[];
  getCardProgress: (card: Card) => number;
  navigateTo: (mode: ViewMode, options?: { stepKey?: string; cardId?: string }) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetStepKey: string, targetCardId?: string) => void;
  handleDragStart: (e: React.DragEvent, cardId: string) => void;
  handleCommitStepMeta: (stepKey: string) => void;
  handleSaveCardMeta: (cardId: string) => void;
  handleDeleteCard: (cardId: string) => void;
  handleCreateCard: (stepKey: string) => void;
  setEditingStepMetaKey: (key: string | null) => void;
  setTempStepTitle: (title: string) => void;
  setTempStepSubtitle: (subtitle: string) => void;
  setEditingCardId: (id: string | null) => void;
  setTempCardTitle: (title: string) => void;
  setTempCardDesc: (desc: string) => void;
  setAddingCardStepKey: (key: string | null) => void;
  setNewCardTitle: (title: string) => void;
  setNewCardDesc: (desc: string) => void;
  setNewCardFields: (fields: NewCardField[]) => void;
  setPickerTargetType: (type: 'newField' | 'newCardField' | 'existingField') => void;
  setPickerTargetFieldIndex: (index: number | null) => void;
  setIsPickerOpen: (open: boolean) => void;
}

export default function KanbanBoard({
  frameworkData,
  isDark,
  t,
  editingStepMetaKey,
  tempStepTitle,
  tempStepSubtitle,
  editingCardId,
  tempCardTitle,
  tempCardDesc,
  addingCardStepKey,
  newCardTitle,
  newCardDesc,
  newCardFields,
  getCardProgress,
  navigateTo,
  handleDragOver,
  handleDrop,
  handleDragStart,
  handleCommitStepMeta,
  handleSaveCardMeta,
  handleDeleteCard,
  handleCreateCard,
  setEditingStepMetaKey,
  setTempStepTitle,
  setTempStepSubtitle,
  setEditingCardId,
  setTempCardTitle,
  setTempCardDesc,
  setAddingCardStepKey,
  setNewCardTitle,
  setNewCardDesc,
  setNewCardFields,
  setPickerTargetType,
  setPickerTargetFieldIndex,
  setIsPickerOpen,
}: KanbanBoardProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <p className="text-xs opacity-50">{t.kanbanGuide}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-medium">{t.completed100}</span>
          <span className="text-[10px] px-2 py-1 rounded bg-zinc-500/20 text-zinc-400 font-medium">{t.inProgress}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pb-6 min-w-[1100px]">
        {frameworkData.map((col, cIdx) => {
          const isEditingThisStep = editingStepMetaKey === col.stepKey;

          return (
            <div 
              key={cIdx}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.stepKey)}
              className={`rounded-xl p-3.5 flex flex-col gap-3 min-h-[500px] transition ${isDark ? 'bg-zinc-900/40 border border-zinc-800/60' : 'bg-zinc-200/30 border border-zinc-200/60 shadow-sm'}`}
            >
              <div className="pb-2 border-b border-zinc-500/10 flex justify-between items-start group/header p-1 rounded-lg transition">
                {isEditingThisStep ? (
                  <div className="flex flex-col gap-1.5 w-full">
                    <input
                      type="text"
                      value={tempStepTitle}
                      onChange={(e) => setTempStepTitle(e.target.value)}
                      placeholder="단계명 수정..."
                      className={`w-full p-1 text-xs font-bold rounded border outline-none ${isDark ? 'bg-zinc-800 border-blue-500 text-white' : 'bg-white border-blue-400 text-zinc-900'}`}
                    />
                    <input
                      type="text"
                      value={tempStepSubtitle}
                      onChange={(e) => setTempStepSubtitle(e.target.value)}
                      placeholder="부제목 설명 수정..."
                      className={`w-full p-1 text-[10px] rounded border outline-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-700'}`}
                    />
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditingStepMetaKey(null)} className="px-2 py-0.5 text-[10px] rounded bg-zinc-600 text-white">취소</button>
                      <button onClick={() => handleCommitStepMeta(col.stepKey)} className="px-2 py-0.5 text-[10px] rounded bg-blue-600 text-white font-semibold">저장</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div onClick={() => navigateTo('focus', { stepKey: col.stepKey })} className="cursor-pointer flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-base tracking-tight hover:text-blue-400 transition">{col.title}</h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStepMetaKey(col.stepKey);
                            setTempStepTitle(col.title);
                            setTempStepSubtitle(col.subtitle);
                          }}
                          className="opacity-0 group-hover/header:opacity-100 text-[10px] px-1 py-0.5 rounded bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 transition"
                          title="단계명 및 설명 수정"
                        >
                          ✏️
                        </button>
                      </div>
                      <p className="text-[10px] opacity-40 leading-tight mt-0.5">{col.subtitle}</p>
                    </div>
                    <span 
                      onClick={() => navigateTo('focus', { stepKey: col.stepKey })}
                      className="text-[10px] text-blue-400 font-medium opacity-0 group-hover/header:opacity-100 transition whitespace-nowrap cursor-pointer ml-1"
                    >
                      {t.focusGo}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {col.cards.map((card) => {
                  const progress = getCardProgress(card);
                  const isCompleted = progress === 100;
                  const isEditingMeta = editingCardId === card.id;

                  return (
                    <div
                      key={card.id}
                      draggable={!isEditingMeta}
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.stepKey, card.id)}
                      className={`p-3.5 rounded-xl text-xs transition relative group border ${
                        isCompleted
                          ? (isDark ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-300')
                          : (isDark ? 'bg-zinc-800/60 border-zinc-700/50 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800 shadow-xs')
                      }`}
                    >
                      {isEditingMeta ? (
                        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={tempCardTitle}
                            onChange={(e) => setTempCardTitle(e.target.value)}
                            className={`w-full p-1.5 text-xs font-bold rounded border outline-none ${isDark ? 'bg-zinc-900 border-blue-500 text-white' : 'bg-white border-blue-400 text-zinc-900'}`}
                            placeholder="카드 질문 제목 수정..."
                          />
                          <textarea
                            rows={2}
                            value={tempCardDesc}
                            onChange={(e) => setTempCardDesc(e.target.value)}
                            className={`w-full p-1.5 text-[10px] rounded border outline-none resize-none ${isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-300 text-zinc-700'}`}
                            placeholder="설명 문구 수정..."
                          />
                          <div className="flex justify-end gap-1 mt-1">
                            <button onClick={() => setEditingCardId(null)} className="px-2 py-1 text-[10px] rounded bg-zinc-600 text-white">취소</button>
                            <button onClick={() => handleSaveCardMeta(card.id)} className="px-2 py-1 text-[10px] rounded bg-blue-600 text-white font-semibold">저장</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div onClick={() => navigateTo('detail', { cardId: card.id })} className="cursor-pointer">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-bold ${isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {isCompleted ? '✓ 완료됨' : `${progress}% 진행`}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCardId(card.id);
                                    setTempCardTitle(card.title);
                                    setTempCardDesc(card.desc);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/60 hover:bg-zinc-700 text-zinc-300 transition"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`"${card.title}" 카드를 삭제하시겠습니까?`)) {
                                      handleDeleteCard(card.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 transition"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <div className="font-bold text-xs mb-1 hover:text-blue-400 transition">{card.title}</div>
                            <p className="text-[10px] opacity-60 line-clamp-2 leading-relaxed">{card.desc}</p>
                          </div>

                          <div onClick={() => navigateTo('detail', { cardId: card.id })} className="mt-3 pt-2 border-t border-zinc-500/10 cursor-pointer">
                            <div className="w-full bg-zinc-700/30 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {addingCardStepKey === col.stepKey ? (
                  <div className={`p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-zinc-900 border-blue-500/50' : 'bg-white border-blue-400 shadow-md'}`}>
                    <div className="font-bold text-xs text-blue-400">새 의사결정 카드 생성</div>
                    <input
                      type="text"
                      placeholder="의사결정 중심 질문 제목..."
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      className={`w-full p-2 text-xs rounded border outline-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}`}
                    />
                    <textarea
                      rows={2}
                      placeholder="이 카드가 던지는 핵심 질문 설명..."
                      value={newCardDesc}
                      onChange={(e) => setNewCardDesc(e.target.value)}
                      className={`w-full p-2 text-[10px] rounded border outline-none resize-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-300 text-zinc-700'}`}
                    />

                    <div className="flex flex-col gap-2 pt-2 border-t border-zinc-500/10">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold opacity-70">하위 세부 질문 항목 구성</span>
                        <button
                          type="button"
                          onClick={() => setNewCardFields([...newCardFields, { label: '', optionsStr: '' }])}
                          className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold"
                        >
                          + 항목 추가
                        </button>
                      </div>

                      {newCardFields.map((nf, nfIdx) => (
                        <div key={nfIdx} className="flex flex-col gap-1.5 p-2 rounded bg-zinc-500/10">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder={`항목 ${nfIdx + 1} 질문`}
                              value={nf.label}
                              onChange={(e) => {
                                const updated = [...newCardFields];
                                updated[nfIdx].label = e.target.value;
                                setNewCardFields(updated);
                              }}
                              className={`flex-1 p-1.5 text-[11px] rounded border outline-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
                            />
                            {newCardFields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setNewCardFields(newCardFields.filter((_, i) => i !== nfIdx))}
                                className="px-2 text-xs text-rose-400 hover:bg-rose-500/20 rounded"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="보기 옵션들 (쉼표 구분)"
                              value={nf.optionsStr}
                              onChange={(e) => {
                                const updated = [...newCardFields];
                                updated[nfIdx].optionsStr = e.target.value;
                                setNewCardFields(updated);
                              }}
                              className={`flex-1 p-1.5 text-[10px] rounded border outline-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-700'}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPickerTargetType('newCardField');
                                setPickerTargetFieldIndex(nfIdx);
                                setIsPickerOpen(true);
                              }}
                              className="px-2 py-1 text-[10px] rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
                            >
                              📋 기존 옵션 가져오기
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-1 mt-1">
                      <button onClick={() => setAddingCardStepKey(null)} className="px-3 py-1.5 text-xs rounded bg-zinc-600 text-white">취소</button>
                      <button onClick={() => handleCreateCard(col.stepKey)} className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white font-semibold">생성하기</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingCardStepKey(col.stepKey)}
                    className={`w-full py-2 text-xs font-medium rounded-xl border border-dashed transition ${isDark ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800/40 hover:text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'}`}
                  >
                    {t.addCard}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
