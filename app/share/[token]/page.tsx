'use client';

import React, { useEffect, useState, useMemo, use } from 'react';
import ProjectSidebar from '../../components/ProjectSidebar';
import KanbanBoard from '../../../components/KanbanBoard';
import { initialFrameworkData } from '../../../lib/framework';
import { dict } from '../../../lib/i18n';
import type { Card, Step, ViewMode } from '../../../lib/types';

/* ─── API 응답 타입 ─── */
interface ApiCard {
  card_id: string;
  step_key: string;
  title: string;
  description: string;
  fields: { id: string; label: string; options: string[] }[];
  position: number;
}
interface ApiProject { id: string; name: string; folder_id: string | null; cards: ApiCard[]; }
interface ApiFolder  { id: string; name: string; parent_id: string | null; }
interface ApiData {
  target_type: 'folder' | 'project';
  target_id: string;
  target_name: string;
  projects: ApiProject[];
  folders: ApiFolder[];
}

/* ─── 기본 더미 핸들러 (readOnly 에서 호출되지 않음) ─── */
const noop = () => {};

/* ─── 카드 진행률 (읽기 전용: DB fields 옵션 채워진 비율) ─── */
const getCardProgress = (card: Card): number => {
  const fields = card.fields || [];
  if (fields.length === 0) return 0;
  const filled = fields.filter(f => (f.options || []).some(o => o.trim() !== '')).length;
  return Math.round((filled / fields.length) * 100);
};

/* ─── DB 카드 → 기본 병합 후 Step[] 생성 ─── */
function buildFrameworkFromApi(projects: ApiProject[], activeProjectId: string): Step[] {
  const proj = projects.find(p => p.id === activeProjectId) || projects[0];
  if (!proj) return initialFrameworkData as Step[];

  // 기본 프레임워크 깊은 복사
  const result: Step[] = (initialFrameworkData as any[]).map(s => ({
    ...s,
    cards: s.cards.map((c: any) => ({ ...c, fields: c.fields.map((f: any) => ({ ...f, options: [...f.options] })) })),
  }));

  // 기본 카드 id 목록
  const defaultIds = new Set(result.flatMap(s => s.cards.map((c: any) => c.id)));

  // DB 카드: 기본이면 기존 cards 옵션을 덮어쓰고, 커스텀이면 append
  for (const dbCard of proj.cards) {
    const target = result.find(s => s.stepKey === dbCard.step_key);
    if (!target) continue;

    if (defaultIds.has(dbCard.card_id)) {
      const existing = target.cards.find((c: any) => c.id === dbCard.card_id);
      if (existing && dbCard.fields?.length) {
        for (const dbField of dbCard.fields) {
          const ef = existing.fields.find((f: any) => f.id === dbField.id);
          if (ef && dbField.options?.length) {
            ef.options = dbField.options;
          }
        }
      }
    } else {
      target.cards.push({
        id: dbCard.card_id,
        title: dbCard.title,
        desc: dbCard.description || '',
        fields: (dbCard.fields || []).map(f => ({
          id: f.id,
          label: f.label,
          options: f.options || [],
        })),
      });
    }
  }

  return result;
}

/* ─── 메인 컴포넌트 ─── */
export default function ShareLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiData | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // 사이드바 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFolderOpen, setIsFolderOpen] = useState(true);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

  // 뷰 상태
  const [viewMode, setViewMode] = useState<string>('kanban');
  const [focusStepKey, setFocusStepKey] = useState<string>('Input');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // 뷰 히스토리 스택 (뒤로 가기 지원)
  const [historyStack, setHistoryStack] = useState<{ mode: string; stepKey?: string; cardId?: string }[]>([]);

  // 데이터 로드
  useEffect(() => {
    if (!token) { setError('유효하지 않은 공유 링크입니다.'); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}/data`);
        const body = await res.json();
        if (res.ok) {
          setData(body);
          if (body.projects?.length > 0) {
            setActiveProjectId(body.projects[0].id);
          }
        } else {
          setError(body.error || '공유 링크를 불러오지 못했습니다.');
        }
      } catch {
        setError('서버 통신 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // 토큰 기반 folder_id 목록
  const folders = useMemo(() => (data?.folders || []).map(f => ({
    ...f,
    user_id: '',
    created_at: '',
  })), [data]);

  const projects = useMemo(
    () => (data?.projects || []).map(p => ({
      id: p.id,
      name: p.name,
      created_by: '',
      created_at: '',
      folder_id: p.folder_id ?? null,
      userRole: 'viewer' as const,
    })),
    [data],
  );

  // 활성 프로젝트의 frameworkData
  const frameworkData = useMemo(
    () => (data && activeProjectId) ? buildFrameworkFromApi(data.projects, activeProjectId) : (initialFrameworkData as Step[]),
    [data, activeProjectId],
  );

  // 활성 카드 파생 데이터
  const activeCardObj = useMemo(() => {
    if (!activeCardId) return null;
    for (const step of frameworkData) {
      const found = step.cards.find(c => c.id === activeCardId);
      if (found) return found;
    }
    return null;
  }, [activeCardId, frameworkData]);

  const activeCardStepKey = useMemo(() => {
    if (!activeCardId) return 'Input';
    for (const step of frameworkData) {
      if (step.cards.some(c => c.id === activeCardId)) return step.stepKey;
    }
    return 'Input';
  }, [activeCardId, frameworkData]);

  const activeCardStepTitle = useMemo(() => {
    const step = frameworkData.find(s => s.stepKey === activeCardStepKey);
    return step?.title || activeCardStepKey;
  }, [activeCardStepKey, frameworkData]);

  // 전체 카드 연속 이동 (모든 스텝을 순서대로 평탄화)
  const allFlattenedCards = useMemo(() => {
    const result: { card: Card; stepKey: string; stepTitle: string }[] = [];
    frameworkData.forEach(step => {
      step.cards.forEach(card => {
        result.push({ card, stepKey: step.stepKey, stepTitle: step.title });
      });
    });
    return result;
  }, [frameworkData]);

  const currentCardIndex = allFlattenedCards.findIndex(item => item.card.id === activeCardId);
  const prevCardItem = currentCardIndex > 0 ? allFlattenedCards[currentCardIndex - 1] : null;
  const nextCardItem = currentCardIndex < allFlattenedCards.length - 1 ? allFlattenedCards[currentCardIndex + 1] : null;

  // 네비게이션 — 직전 뷰 상태를 히스토리 스택에 기록
  const navigateTo = (mode: ViewMode, opts?: any) => {
    setHistoryStack(prev => [...prev, { mode: viewMode, stepKey: focusStepKey, cardId: activeCardId ?? undefined }]);
    setViewMode(mode as string);
    if (opts?.stepKey) setFocusStepKey(opts.stepKey);
    if (opts?.cardId) setActiveCardId(opts.cardId);
  };

  // 뒤로 가기 — 직전에 머물렀던 뷰 상태로 정확히 복귀
  const handleGoBack = () => {
    if (historyStack.length === 0) {
      setViewMode('kanban');
      setActiveCardId(null);
      return;
    }
    const lastState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
    setViewMode(lastState.mode);
    if (lastState.stepKey) setFocusStepKey(lastState.stepKey);
    if (lastState.cardId) setActiveCardId(lastState.cardId);
  };

  const handleToggleFolderExpanded = (folderId: string) => {
    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  };

  const openFolder = (folderId: string) => {
    setExpandedFolderIds(prev => new Set([...prev, folderId]));
  };

  const isDark = true;

  // 공유 페이지 전용 문구 오버라이드 (메인 앱 i18n과 분리)
  const shareDict = useMemo(() => ({
    ...dict.KO,
    detailEdit: '세부 내용 보기 →',
  }), []);

  /* ─── 로딩 / 오류 상태 ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#18181b] text-white flex items-center justify-center">
        <div className="text-xs opacity-50">공유 항목을 불러오는 중...</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#18181b] text-white flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-sm opacity-70">{error || '공유 링크를 찾을 수 없습니다.'}</p>
          <a href="/" className="text-xs px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition">
            메인 화면으로 이동
          </a>
        </div>
      </div>
    );
  }

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-200 bg-[#18181b] text-[#f4f4f5]">
      <div className="flex flex-1 overflow-hidden">

        {/* 사이드바 — readOnly + 공유된 폴더/프로젝트만 */}
        <ProjectSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isFolderOpen={isFolderOpen}
          setIsFolderOpen={setIsFolderOpen}
          projects={projects}
          folders={folders}
          activeProjectId={activeProjectId}
          setActiveProjectId={setActiveProjectId}
          activeFolderId={null}
          isAddingProject={false}
          setIsAddingProject={noop}
          newProjName=""
          setNewProjName={noop}
          sidebarEditingProjId={null}
          setSidebarEditingProjId={noop}
          sidebarTempName=""
          setSidebarTempName={noop}
          currentUserRole="viewer"
          frameworkData={frameworkData}
          navigateTo={navigateTo}
          handleAddProject={noop as any}
          handleProjectDragStart={noop as any}
          handleProjectDrop={noop as any}
          handleDuplicateProject={noop as any}
          handleDeleteProject={noop as any}
          handleCommitSidebarProjectName={noop as any}
          t={dict.KO}
          isDark={isDark}
          setIsInviteModalOpen={noop}
          viewMode={viewMode}
          focusStepKey={focusStepKey}
          expandedFolderIds={expandedFolderIds}
          handleToggleFolderExpanded={handleToggleFolderExpanded}
          openFolder={openFolder}
          isAddingFolder={false}
          setIsAddingFolder={noop}
          newFolderName=""
          setNewFolderName={noop}
          handleAddFolder={noop as any}
          addingChildToFolderId={null}
          setAddingChildToFolderId={noop}
          editingFolderId={null}
          setEditingFolderId={noop}
          folderTempName=""
          setFolderTempName={noop}
          handleRenameFolder={noop as any}
          handleDeleteFolder={noop as any}
          handleDropOnFolder={noop as any}
          readOnly={true}
        />

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 flex flex-col p-8 overflow-y-auto bg-[#18181b]">
          <style>{`
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #18181b; }
            ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
          `}</style>

          {/* 상단 헤더 */}
          <header className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-500/10">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-black truncate">
                {activeProject?.name || data.target_name}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider whitespace-nowrap">
                🔒 보기 전용
              </span>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'report' ? (
                <button
                  onClick={() => navigateTo('kanban')}
                  className="font-medium transition px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs"
                >
                  전체 칸반 뷰
                </button>
              ) : (
                <>
                  {viewMode !== 'kanban' && (
                    <button
                      onClick={() => navigateTo('kanban')}
                      className="font-medium transition px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs"
                    >
                      {dict.KO.kanbanView}
                    </button>
                  )}
                  <button
                    onClick={() => navigateTo('report')}
                    className="font-medium transition px-3 py-1.5 rounded-lg opacity-60 hover:opacity-100 text-xs"
                  >
                    {dict.KO.reportView}
                  </button>
                </>
              )}
              <a
                href="/"
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition whitespace-nowrap"
              >
                로그인 페이지
              </a>
            </div>
          </header>

          {/* ━━━ 1. 칸반 뷰 ━━━ */}
          {viewMode === 'kanban' && (
            <KanbanBoard
              frameworkData={frameworkData}
              isDark={isDark}
              t={dict.KO}
              editingStepMetaKey={null}
              tempStepTitle=""
              tempStepSubtitle=""
              editingCardId={null}
              tempCardTitle=""
              tempCardDesc=""
              addingCardStepKey={null}
              newCardTitle=""
              newCardDesc=""
              newCardFields={[]}
              getCardProgress={getCardProgress}
              navigateTo={navigateTo}
              handleDragOver={noop as any}
              handleDrop={noop as any}
              handleDragStart={noop as any}
              handleCommitStepMeta={noop as any}
              handleSaveCardMeta={noop as any}
              handleDeleteCard={noop as any}
              handleCreateCard={noop as any}
              setEditingStepMetaKey={noop}
              setTempStepTitle={noop}
              setTempStepSubtitle={noop}
              setEditingCardId={noop}
              setTempCardTitle={noop}
              setTempCardDesc={noop}
              setAddingCardStepKey={noop}
              setNewCardTitle={noop}
              setNewCardDesc={noop}
              setNewCardFields={noop}
              setPickerTargetType={noop}
              setPickerTargetFieldIndex={noop}
              setIsPickerOpen={noop}
              readOnly={true}
            />
          )}

          {/* ━━━ 2. 집중 뷰 (Focus View) ━━━ */}
          {viewMode === 'focus' && (() => {
            const currentStep = frameworkData.find(s => s.stepKey === focusStepKey) || frameworkData[0];

            return (
              <div className="max-w-4xl mx-auto pb-12 w-full flex flex-col gap-6">
                {/* 네비게이션 바 */}
                <div className="flex justify-between items-center bg-zinc-500/10 p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGoBack}
                      className="font-semibold text-zinc-300 hover:text-white bg-zinc-700/50 px-2.5 py-1 rounded-lg transition"
                    >
                      {dict.KO.back}
                    </button>
                    <button
                      onClick={() => navigateTo('kanban')}
                      className="font-semibold text-blue-400 hover:underline"
                    >
                      전체 칸반(인덱스)
                    </button>
                  </div>
                  <span className="font-bold opacity-60">{dict.KO.focusModeTitle}</span>
                </div>

                {/* 단계 헤더 */}
                <div>
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{currentStep.stepKey} 단계 집중 조회</span>
                  <h2 className="text-xl font-black mt-0.5">{currentStep.title} — {currentStep.subtitle}</h2>
                </div>

                {/* 카드 목록 */}
                <div className="flex flex-col gap-6">
                  {currentStep.cards.map((card) => {
                    const progress = getCardProgress(card);
                    const isCompleted = progress === 100;

                    return (
                      <div
                        key={card.id}
                        className={`p-6 rounded-2xl border transition ${
                          isCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-zinc-900/80 border-zinc-800'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h3 className="text-sm font-bold">{card.title}</h3>
                            <p className="text-xs opacity-60 mt-0.5">{card.desc}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {dict.KO.progress} {progress}%
                            </span>
                            <button
                              onClick={() => navigateTo('detail', { cardId: card.id })}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
                            >
                              {shareDict.detailEdit}
                            </button>
                          </div>
                        </div>

                        {/* 진행률 바 */}
                        <div className="w-full bg-zinc-700/30 h-2 rounded-full overflow-hidden my-4">
                          <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>

                        {/* 필드 상태 */}
                        <div className="mt-4 pt-4 border-t border-zinc-500/10 grid grid-cols-1 gap-3">
                          <div className="text-[11px] font-bold opacity-50 uppercase tracking-wider">{dict.KO.formStatus}</div>
                          {card.fields.map((field: any, fIdx: number) => {
                            const selectedVal = (field.options || []).find((o: string) => o.trim() !== '') || '';
                            return (
                              <div key={fIdx} className="p-3 rounded-xl border text-xs flex flex-col gap-1 bg-zinc-800/40 border-zinc-700/50">
                                <span className="font-semibold text-blue-400">{field.label}</span>
                                <div className="text-[11px]">
                                  {selectedVal ? (
                                    <span className="text-emerald-400 font-medium">✓ {selectedVal}</span>
                                  ) : (
                                    <span className="opacity-40 italic">{dict.KO.notEntered}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ━━━ 3. 카드 상세 뷰 (Detail View) — 읽기 전용 ━━━ */}
          {viewMode === 'detail' && activeCardObj && (() => {
            const progress = getCardProgress(activeCardObj);
            const isCompleted = progress === 100;

            return (
              <div className="max-w-3xl mx-auto pb-16 w-full flex flex-col gap-6">

                {/* 네비게이션 바 */}
                <div className="flex justify-between items-center bg-zinc-500/10 p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGoBack}
                      className="font-semibold text-zinc-300 hover:text-white bg-zinc-700/50 px-2.5 py-1 rounded-lg transition"
                    >
                      {dict.KO.back}
                    </button>
                    <button
                      onClick={() => navigateTo('focus', { stepKey: activeCardStepKey })}
                      className="font-semibold text-zinc-300 hover:text-white bg-zinc-700/50 px-2.5 py-1 rounded-lg transition"
                    >
                      ⬆ 해당 단계 집중뷰
                    </button>
                    <button
                      onClick={() => navigateTo('kanban')}
                      className="font-semibold text-blue-400 hover:underline"
                    >
                      전체 칸반(인덱스)
                    </button>
                  </div>

                  {/* 이전/다음 카드 */}
                  <div className="flex items-center gap-2">
                    {prevCardItem ? (
                      <button
                        onClick={() => setActiveCardId(prevCardItem.card.id)}
                        className="px-3 py-1 text-xs rounded-lg transition bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        {dict.KO.prevCard}
                      </button>
                    ) : (
                      <span className="text-xs opacity-30 px-1">{dict.KO.firstCard}</span>
                    )}
                    {nextCardItem ? (
                      <button
                        onClick={() => setActiveCardId(nextCardItem.card.id)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
                      >
                        {dict.KO.nextCard}
                      </button>
                    ) : (
                      <span className="text-xs opacity-30 px-1">{dict.KO.lastCard}</span>
                    )}
                  </div>
                </div>

                {/* 카드 본문 */}
                <div className={`p-8 rounded-2xl border-t-8 ${isCompleted ? 'border-t-emerald-500' : 'border-t-blue-600'} bg-zinc-900 border-zinc-800`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{activeCardStepTitle} 단계</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {dict.KO.progress} {progress}% {isCompleted && '✨ 완료됨'}
                    </span>
                  </div>

                  <h1 className="text-xl font-black mt-1 mb-2">{activeCardObj.title}</h1>
                  <p className="text-xs opacity-60 mb-6 pb-4 border-b border-zinc-500/10">{activeCardObj.desc}</p>

                  {/* 필드 목록 — 읽기 전용: 선택값 1개 또는 미작성만 표시 */}
                  <div className="flex flex-col gap-6">
                    {activeCardObj.fields.map((field: any, fIdx: number) => {
                      const selectedVal = (field.options || []).find((o: string) => o.trim() !== '') || '';

                      return (
                        <div
                          key={field.id}
                          className="p-5 rounded-xl border bg-zinc-800/40 border-zinc-700/50 flex flex-col gap-3"
                        >
                          <label className="text-xs font-bold flex items-center gap-2">
                            <span className="text-blue-500">Q{fIdx + 1}.</span> {field.label}
                          </label>

                          {selectedVal ? (
                            <div className="p-3 rounded-xl border bg-blue-600/15 border-blue-500/50 text-xs text-blue-300 font-medium flex items-center gap-1.5">
                              <span className="text-blue-400">✓</span> {selectedVal}
                            </div>
                          ) : (
                            <div className="text-[11px] opacity-40 italic p-3 rounded-xl border border-zinc-700/30 bg-zinc-900/40">
                              {dict.KO.notEntered}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ━━━ 4. 종합 프로젝트 정의서 (Report View) — 읽기 전용 ━━━ */}
          {viewMode === 'report' && (
            <div className="max-w-4xl mx-auto pb-12 w-full">
              <div className="flex justify-between items-center mb-6 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGoBack}
                    className="font-semibold text-zinc-300 hover:text-white bg-zinc-700/50 px-3 py-1.5 rounded-xl transition"
                  >
                    {dict.KO.back}
                  </button>
                  <button
                    onClick={() => navigateTo('kanban')}
                    className="opacity-60 hover:opacity-100 font-medium text-blue-400"
                  >
                    전체 칸반(인덱스)으로 이동
                  </button>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl transition bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  {dict.KO.printPdf}
                </button>
              </div>

              <div className="p-10 rounded-2xl border bg-zinc-900/90 border-zinc-800">
                <div className="text-center mb-10 pb-6 border-b border-zinc-500/20">
                  <span className="text-xs font-bold text-blue-500 tracking-widest uppercase">PASS 5 FRAMEWORK SYSTEM</span>
                  <h1 className="text-2xl font-black mt-1 mb-2">{activeProject?.name}</h1>
                  <p className="text-xs opacity-50">종합 프로젝트 정의서 (Master Specification Document)</p>
                </div>

                <div className="flex flex-col gap-8">
                  {frameworkData.map((col, idx) => (
                    <div key={idx} className="pb-6 border-b border-zinc-500/10 last:border-0">
                      <h3 className="text-sm font-bold text-blue-400 mb-4">{col.title} 단계</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {col.cards.map((card, cIdx) => {
                          const progress = getCardProgress(card);
                          return (
                            <div key={cIdx} className="p-4 rounded-xl border bg-zinc-800/30 border-zinc-700/40">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-bold text-blue-400">{card.title}</h4>
                                <span className="text-[10px] opacity-50">{progress}%</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {card.fields.map((f: any, fIdx: number) => {
                                  const selectedVal = (f.options || []).find((o: string) => o.trim() !== '') || '';
                                  return (
                                    <div key={fIdx} className="text-xs">
                                      <span className="opacity-60 font-medium">• {f.label}: </span>
                                      {selectedVal ? (
                                        <span className="font-semibold">{selectedVal}</span>
                                      ) : (
                                        <span className="opacity-40 italic">(미작성)</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
