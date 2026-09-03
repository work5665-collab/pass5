'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import InviteModal from './components/InviteModal';
import ShareModal, { ShareTarget } from './components/ShareModal';
import ContextMenu from './components/ContextMenu';
import ProjectSidebar from './components/ProjectSidebar';
import KanbanBoard from '../components/KanbanBoard';
import { ViewMode, LangMode, Folder } from '../lib/types';
import { supabase } from '../lib/supabase/client';
import { initialFrameworkData } from '../lib/framework';
import { dict } from '../lib/i18n';
import { useProjectData } from '../lib/hooks/useProjectData';
import { useFolderData } from '../lib/hooks/useFolderData';
import { useCardData } from '../lib/hooks/useCardData';
import { useFieldInteraction } from '../lib/hooks/useFieldInteraction';
import FolderIndexView from './components/FolderIndexView';

export default function Pass5MasterApp() {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadProjectMembers = async (projectId: string) => {
    try {
      // 현재 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 토큰이 없으면 인증 자체가 불가능하므로 중단 (Bearer undefined 방지)
      if (!token) {
        console.error('No access token available; cannot load project members.');
        return;
      }

      console.log('Loading project members for:', projectId);
      console.log('Current user ID:', user?.id);

      const response = await fetch(`/api/members?projectId=${projectId}`, {
        credentials: 'include', // 쿠키(인증 세션)가 서버로 전달되도록 설정
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const data = await response.json();

      console.log('Members response:', data);

      if (response.ok) {
        setProjectMembers(data.members || []);
        
        // 현재 사용자의 권한 설정
        const currentUser = data.members?.find((m: any) => m.user_id === user?.id);
        console.log('Current user from members:', currentUser);
        console.log('Current user role:', currentUser?.role);
        setCurrentUserRole(currentUser?.role || null);
      } else {
        console.error('Members API error:', data);
      }
    } catch (error) {
      console.error('멤버 정보 불러오기 실패:', error);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [isDark, setIsDark] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lang, setLang] = useState<LangMode>('KO');
  const t = dict[lang];


  const [isFolderOpen, setIsFolderOpen] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]); // 프로젝트 멤버 정보
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null); // 현재 사용자 권한
  
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  
  const [sidebarEditingProjId, setSidebarEditingProjId] = useState<string | null>(null);
  const [sidebarTempName, setSidebarTempName] = useState('');

  const [headerEditingProjId, setHeaderEditingProjId] = useState<string | null>(null);
  const [headerTempName, setHeaderTempName] = useState('');

  // Enter/blur 이벤트 중복 방지용 ref
  // - EnterCommitRef: Enter로 커밋된 뒤 따라오는 blur가 같은 커밋을 재수행하지 못하도록 소비 플래그
  const headerEnterCommitRef = useRef(false);       // 헤더 입력 Enter 커밋 소비 플래그

  // 초대 모달 상태
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member'); // admin, member, viewer

  // 공유(ShareModal) 상태
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  // 공유 모달 열기 (카드/폴더/프로젝트 단위)
  const openShareModal = useCallback((target: ShareTarget) => {
    setShareTarget(target);
  }, []);

  // 우클릭 컨텍스트 메뉴 상태
  // - type 'card' → 복제 액션 (카드 단위 공유는 제거됨)
  // - type 'folder'|'project' → 공유 액션
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    type: 'card' | 'folder' | 'project';
    // 공유 대상 (folder/project)
    target?: ShareTarget;
    // 복제 대상 (card)
    cardId?: string;
  } | null>(null);

  // 우클릭 핸들러: 커서 위치에 컨텍스트 메뉴 표시
  const openContextMenu = useCallback((e: React.MouseEvent, item: { type: 'card' | 'folder' | 'project'; id: string; name: string }) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.type === 'card') {
      setCtxMenu({ x: e.clientX, y: e.clientY, type: 'card', cardId: item.id });
    } else {
      setCtxMenu({
        x: e.clientX,
        y: e.clientY,
        type: item.type,
        target: { type: item.type, id: item.id, name: item.name },
      });
    }
  }, []);

  const closeContextMenu = useCallback(() => setCtxMenu(null), []);

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [focusStepKey, setFocusStepKey] = useState<string>('Input');
  const [activeCardId, setActiveCardId] = useState<string>('purpose_and_problem');
  const [historyStack, setHistoryStack] = useState<{ mode: ViewMode; stepKey?: string; cardId?: string; folderId?: string }[]>([]);

  const navigateTo = (newMode: ViewMode, options?: { stepKey?: string; cardId?: string; folderId?: string }) => {
    setHistoryStack(prev => [...prev, { mode: viewMode, stepKey: focusStepKey, cardId: activeCardId, folderId: activeFolderId ?? undefined }]);
    setViewMode(newMode);
    if (options?.stepKey) setFocusStepKey(options.stepKey);
    if (options?.cardId) setActiveCardId(options.cardId);
    if (options?.folderId !== undefined) setActiveFolderId(options.folderId);
  };

  const handleGoBack = () => {
    if (historyStack.length === 0) {
      setViewMode('kanban');
      setActiveFolderId(null);
      return;
    }
    const lastState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
    setViewMode(lastState.mode);
    if (lastState.stepKey) setFocusStepKey(lastState.stepKey);
    if (lastState.cardId) setActiveCardId(lastState.cardId);
    setActiveFolderId(lastState.folderId ?? null);
  };

  const [formData, setFormData] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [frameworkDataPerProject, setFrameworkDataPerProject] = useState<Record<string, typeof initialFrameworkData>>({});

  // 권한 확인 헬퍼 함수
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'member';
  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  // 프로젝트 데이터(projects/activeProjectId)와 CRUD/이름 수정/드래그 재정렬 로직을 커스텀 훅으로 분리
  const {
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    isProjectsLoading,
    setIsProjectsLoading,
    draggedProjectId,
    setDraggedProjectId,
    loadProjects,
    handleAddProject,
    handleDuplicateProject,
    handleDeleteProject,
    handleCommitSidebarProjectName,
    handleCommitHeaderProjectName,
    handleProjectDragStart,
    handleProjectDrop,
  } = useProjectData({
    canEdit,
    formData,
    setFormData,
    frameworkDataPerProject,
    setFrameworkDataPerProject,
    newProjName,
    setNewProjName,
    setIsAddingProject,
    sidebarEditingProjId,
    setSidebarEditingProjId,
    sidebarTempName,
    setSidebarTempName,
    headerEditingProjId,
    setHeaderEditingProjId,
    headerTempName,
    setHeaderTempName,
  });

  // 로그인/프로젝트·카드 데이터 로딩 훅 (프로젝트 데이터 훅의 반환값 사용)
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setActiveProjectId(null);
      setIsProjectsLoading(false);
      return;
    }
    loadProjects(user.id);
  }, [user]);

  useEffect(() => {
    if (activeProjectId && user) {
      loadProjectMembers(activeProjectId);

      // Load cards from DB for the active project
      loadCardsForProject(activeProjectId);
    }
  }, [activeProjectId, user]);

  // 폴더 데이터(폴더 CRUD/펼치기/드래그 배정) 로직을 커스텀 훅으로 분리
  const {
    folders,
    expandedFolderIds,
    isAddingFolder,
    setIsAddingFolder,
    newFolderName,
    setNewFolderName,
    addingChildToFolderId,
    setAddingChildToFolderId,
    editingFolderId,
    setEditingFolderId,
    folderTempName,
    setFolderTempName,
    handleToggleFolderExpanded,
    openFolder,
    handleAddFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleDropOnFolder,
  } = useFolderData({
    user,
    activeFolderId,
    setActiveFolderId,
    navigateTo,
    setViewMode,
    projects,
    setProjects,
    draggedProjectId,
    setDraggedProjectId,
  });

  // 카드/프레임워크 데이터 상태와 CRUD/필드 관리 로직을 커스텀 훅으로 분리
  const {
    frameworkData,
    editingCardId,
    setEditingCardId,
    tempCardTitle,
    setTempCardTitle,
    tempCardDesc,
    setTempCardDesc,
    editingStepMetaKey,
    setEditingStepMetaKey,
    tempStepTitle,
    setTempStepTitle,
    tempStepSubtitle,
    setTempStepSubtitle,
    addingCardStepKey,
    setAddingCardStepKey,
    newCardTitle,
    setNewCardTitle,
    newCardDesc,
    setNewCardDesc,
    newCardFields,
    setNewCardFields,
    editingFieldCardId,
    setEditingFieldCardId,
    newFieldLabel,
    setNewFieldLabel,
    newFieldOptionsStr,
    setNewFieldOptionsStr,
    editingFieldId,
    setEditingFieldId,
    tempFieldLabel,
    setTempFieldLabel,
    loadCardsForProject,
    handleCreateCard,
    handleCommitStepMeta,
    handleCardDragStart,
    handleCardDragOver,
    handleCardDrop,
    handleAddFieldToCard,
    handleDeleteFieldFromCard,
    handleUpdateFieldLabel,
    handleFieldDragStart,
    handleFieldDrop,
    allFlattenedCards,
    handleDeleteCard,
    handleSaveCardMeta,
    handleDuplicateCard,
  } = useCardData({
    activeProjectId,
    setActiveProjectId,
    setViewMode,
    formData,
    setFormData,
    frameworkDataPerProject,
    setFrameworkDataPerProject,
    activeCardId,
    setActiveCardId,
  });

  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectKey = activeProjectId ?? '';

  const {
    customOptions,
    fieldModes,
    setFieldModes,
    customInputs,
    setCustomInputs,
    savePermanently,
    setSavePermanently,
    isPickerOpen,
    setIsPickerOpen,
    pickerStepKey,
    setPickerStepKey,
    pickerCardId,
    setPickerCardId,
    selectedPickedOptions,
    setSelectedPickedOptions,
    pickerSearchQuery,
    setPickerSearchQuery,
    setPickerTargetType,
    setPickerTargetFieldIndex,
    setPickerTargetFieldId,
    getFieldOptions,
    handleSelectChange,
    handleStartEditOption,
    handleCustomSubmit,
    handleResetFieldValue,
    getCardProgress,
    handleApplyPickedOptions,
    helperToggleOption,
    newSet,
  } = useFieldInteraction({
    formData,
    setFormData,
    projectKey,
    newCardFields,
    setNewCardFields,
    setNewFieldOptionsStr,
  });

  const currentCardIndex = allFlattenedCards.findIndex(item => item.card.id === activeCardId);
  const prevCardItem = currentCardIndex > 0 ? allFlattenedCards[currentCardIndex - 1] : null;
  const nextCardItem = currentCardIndex < allFlattenedCards.length - 1 ? allFlattenedCards[currentCardIndex + 1] : null;

  let activeCardObj: any = null;
  let activeCardStepTitle = '';
  let activeCardStepKey = '';
  frameworkData.forEach(step => {
    step.cards.forEach(card => {
      if (card.id === activeCardId) {
        activeCardObj = card;
        activeCardStepTitle = step.title;
        activeCardStepKey = step.stepKey;
      }
    });
  });

  // 초대 로직 (API 연동)
  const handleSendInvite = async () => {
    if (!inviteEmail || !activeProjectId) return;

    try {
      // 현재 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: activeProjectId,
          email: inviteEmail,
          role: inviteRole
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`초대 실패: ${data.error}`);
        return;
      }

      // 초대 링크 복사 옵션 제공
      if (data.inviteLink) {
        const copyLink = confirm(
          `초대가 생성되었습니다!\n\n초대 링크를 복사하시겠습니까?\n\n링크: ${data.inviteLink}`
        );
        
        if (copyLink) {
          navigator.clipboard.writeText(data.inviteLink);
          alert('초대 링크가 클립보드에 복사되었습니다!');
        }
      }

      setInviteEmail('');
      setInviteRole('member');
      setIsInviteModalOpen(false);
      
    } catch (error) {
      console.error('초대 오류:', error);
      alert('초대 중 오류가 발생했습니다.');
    }
  };

  if (!isMounted || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
        PASS 5 불러오는 중...
      </div>
    );
  }

  // 1. 완벽하게 구글 로그인 화면만 뜨도록 수정
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#18181b] text-white' : 'bg-[#fafaf9] text-zinc-900'}`}>
        <div className={`w-full max-w-md p-8 rounded-2xl border text-center ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xl'}`}>
          <div className="text-xs font-bold text-blue-500 tracking-widest mb-2">PASS 5 WORKSPACE</div>
          <h1 className="text-2xl font-black mb-3">프로젝트 협업 관리</h1>
          <p className="text-xs opacity-60 mb-6">Google 계정으로 로그인하면 프로젝트를 만들고 협업할 수 있습니다.</p>
          <button onClick={handleGoogleLogin} className="w-full px-4 py-3 rounded-xl bg-white text-zinc-900 font-bold hover:bg-zinc-200 transition">
            <span className="text-blue-500 mr-2">G</span> Google로 로그인
          </button>
        </div>
      </div>
    );
  }

  // 로그인 후 데이터 불러오는 중
  if (isProjectsLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#18181b] text-white' : 'bg-[#fafaf9] text-zinc-900'}`}>
        <div className="text-sm opacity-60">프로젝트를 불러오는 중...</div>
      </div>
    );
  }

  // 등록된 프로젝트가 없을 때
  if (!activeProject) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#18181b] text-white' : 'bg-[#fafaf9] text-zinc-900'}`}>
        <div className={`w-full max-w-lg p-8 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xl'}`}>
          <div className="text-xs font-bold text-blue-500 tracking-widest mb-2">PASS 5 WORKSPACE</div>
          <h1 className="text-2xl font-black mb-2">첫 프로젝트를 만들어보세요</h1>
          <p className="text-xs opacity-60 mb-6">프로젝트를 생성하면 이 계정이 자동으로 최고관리자(Owner)가 됩니다.</p>
          <form onSubmit={handleAddProject} className="flex gap-2">
            <input
              autoFocus
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder={t.projPlaceholder}
              className={`flex-1 px-3 py-2.5 text-sm rounded-xl border outline-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
            />
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold">생성</button>
          </form>
          <button onClick={handleLogout} className="mt-4 text-xs opacity-50 hover:opacity-100">로그아웃</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${isDark ? 'bg-[#18181b] text-[#f4f4f5]' : 'bg-[#fafaf9] text-[#18181b]'}`}>
      <div className="flex flex-1 overflow-hidden">
        
        {/* 사이드바 */}
        <ProjectSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isFolderOpen={isFolderOpen}
          setIsFolderOpen={setIsFolderOpen}
          projects={projects}
          folders={folders}
          activeProjectId={activeProjectId}
          setActiveProjectId={setActiveProjectId}
          activeFolderId={activeFolderId}
          isAddingProject={isAddingProject}
          setIsAddingProject={setIsAddingProject}
          newProjName={newProjName}
          setNewProjName={setNewProjName}
          sidebarEditingProjId={sidebarEditingProjId}
          setSidebarEditingProjId={setSidebarEditingProjId}
          sidebarTempName={sidebarTempName}
          setSidebarTempName={setSidebarTempName}
          currentUserRole={currentUserRole}
          frameworkData={frameworkData}
          navigateTo={navigateTo}
          handleAddProject={handleAddProject}
          handleProjectDragStart={handleProjectDragStart}
          handleProjectDrop={handleProjectDrop}
          handleDuplicateProject={handleDuplicateProject}
          handleDeleteProject={handleDeleteProject}
          handleCommitSidebarProjectName={handleCommitSidebarProjectName}
          t={t}
          isDark={isDark}
          setIsInviteModalOpen={setIsInviteModalOpen}
          viewMode={viewMode}
          focusStepKey={focusStepKey}
          expandedFolderIds={expandedFolderIds}
          handleToggleFolderExpanded={handleToggleFolderExpanded}
          openFolder={openFolder}
          isAddingFolder={isAddingFolder}
          setIsAddingFolder={setIsAddingFolder}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          handleAddFolder={handleAddFolder}
          addingChildToFolderId={addingChildToFolderId}
          setAddingChildToFolderId={setAddingChildToFolderId}
          editingFolderId={editingFolderId}
          setEditingFolderId={setEditingFolderId}
          folderTempName={folderTempName}
          setFolderTempName={setFolderTempName}
          handleRenameFolder={handleRenameFolder}
          handleDeleteFolder={handleDeleteFolder}
          handleDropOnFolder={handleDropOnFolder}
          onItemContextMenu={openContextMenu}
        />


        {/* 메인 콘텐츠 영역 */}
        <main className={`flex-1 flex flex-col p-8 overflow-y-auto ${isDark ? 'bg-[#18181b]' : 'bg-[#fafaf9]'}`}>
          
          <style>{`
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            ::-webkit-scrollbar-track {
              background: ${isDark ? '#18181b' : '#fafaf9'};
            }
            ::-webkit-scrollbar-thumb {
              background: ${isDark ? '#27272a' : '#e4e4e7'};
              border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: ${isDark ? '#3f3f46' : '#d4d4d8'};
            }
          `}</style>

          {/* 상단 헤더 */}
          <header className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-500/10">
            <div className="flex items-center gap-3">
              {headerEditingProjId === activeProject.id ? (
                <input
                  type="text"
                  autoFocus
                  value={headerTempName}
                  onChange={(e) => setHeaderTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      headerEnterCommitRef.current = true; // Enter로 커밋됨 표시 → blur가 재커밋 방지
                      handleCommitHeaderProjectName(activeProject.id);
                    }
                    if (e.key === 'Escape') {
                      headerEnterCommitRef.current = false;
                      setHeaderEditingProjId(null);
                    }
                  }}
                  onBlur={() => {
                    // Enter 커밋 직후 따라오는 blur는 무시 (alert 중복 방지)
                    if (headerEnterCommitRef.current) {
                      headerEnterCommitRef.current = false;
                      return;
                    }
                    handleCommitHeaderProjectName(activeProject.id);
                  }}
                  className={`text-xl font-bold bg-transparent border-b-2 border-blue-500 outline-none w-[350px] ${isDark ? 'text-white' : 'text-zinc-900'}`}
                />
              ) : (
                <div className="flex items-center gap-3 group">
                  <h1 className="text-xl font-bold tracking-tight cursor-pointer" onClick={() => navigateTo('kanban')}>{activeProject.name}</h1>
                  <button
                    onClick={() => {
                      headerEnterCommitRef.current = false; // 새 편집 세션 시작 시 플래그 초기화
                      setHeaderEditingProjId(activeProject.id);
                      setHeaderTempName(activeProject.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 transition"
                  >
                    {t.editName}
                  </button>
                  {/* 멤버 초대 버튼 추가 */}
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="ml-2 text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 font-semibold transition"
                  >
                    + 팀원 초대
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              {user && (
                <div className="flex items-center gap-2 mr-4">
                  <span className="opacity-70 text-[11px]">{user.email}</span>
                  <button onClick={handleLogout} className={`px-2 py-1 rounded transition ${isDark ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white'}`}>
                    로그아웃
                  </button>
                </div>
              )}

              <button 
                onClick={() => navigateTo('kanban')} 
                className={`font-medium transition px-3 py-1.5 rounded-lg ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'opacity-60 hover:opacity-100'}`}
              >
                {t.kanbanView}
              </button>
              <button 
                onClick={() => navigateTo('report')} 
                className={`font-medium transition px-3 py-1.5 rounded-lg ${viewMode === 'report' ? 'bg-blue-600 text-white' : 'opacity-60 hover:opacity-100'}`}
              >
                {t.reportView}
              </button>
            </div>
          </header>

          {/* 0. 폴더 인덱스(대시보드) 뷰 */}
          {viewMode === 'folder' && (
            <FolderIndexView
              folders={folders}
              projects={projects}
              activeFolderId={activeFolderId}
              isDark={isDark}
              t={t}
              navigateTo={navigateTo}
              openFolder={openFolder}
              handleGoBack={handleGoBack}
              setActiveProjectId={setActiveProjectId}
              onShareFolder={openShareModal}
            />
          )}

          {/* 1. 전체 칸반 보드 뷰 */}
          {viewMode === 'kanban' && (
            <KanbanBoard
              frameworkData={frameworkData}
              isDark={isDark}
              t={t}
              editingStepMetaKey={editingStepMetaKey}
              tempStepTitle={tempStepTitle}
              tempStepSubtitle={tempStepSubtitle}
              editingCardId={editingCardId}
              tempCardTitle={tempCardTitle}
              tempCardDesc={tempCardDesc}
              addingCardStepKey={addingCardStepKey}
              newCardTitle={newCardTitle}
              newCardDesc={newCardDesc}
              newCardFields={newCardFields}
              getCardProgress={getCardProgress}
              navigateTo={navigateTo}
              handleDragOver={handleCardDragOver}
              handleDrop={handleCardDrop}
              handleDragStart={handleCardDragStart}
              handleCommitStepMeta={handleCommitStepMeta}
              handleSaveCardMeta={handleSaveCardMeta}
              handleDeleteCard={handleDeleteCard}
              handleCreateCard={handleCreateCard}
              setEditingStepMetaKey={setEditingStepMetaKey}
              setTempStepTitle={setTempStepTitle}
              setTempStepSubtitle={setTempStepSubtitle}
              setEditingCardId={setEditingCardId}
              setTempCardTitle={setTempCardTitle}
              setTempCardDesc={setTempCardDesc}
              setAddingCardStepKey={setAddingCardStepKey}
              setNewCardTitle={setNewCardTitle}
              setNewCardDesc={setNewCardDesc}
              setNewCardFields={setNewCardFields}
              setPickerTargetType={setPickerTargetType}
              setPickerTargetFieldIndex={setPickerTargetFieldIndex}
              setIsPickerOpen={setIsPickerOpen}
              onItemContextMenu={openContextMenu}
            />
          )}


          {/* 2. 단계별 집중 뷰 */}
          {viewMode === 'focus' && (() => {
            const currentStep = frameworkData.find(s => s.stepKey === focusStepKey) || frameworkData[0];
            const projStore = formData[projectKey] || {};

            return (
              <div className="max-w-4xl mx-auto pb-12 w-full flex flex-col gap-6">
                <div className="flex justify-between items-center bg-zinc-500/10 p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleGoBack}
                      className="font-semibold text-zinc-300 hover:text-white bg-zinc-700/50 px-2.5 py-1 rounded-lg transition"
                    >
                      {t.back}
                    </button>
                    <button 
                      onClick={() => navigateTo('kanban')} 
                      className="font-semibold text-blue-400 hover:underline"
                    >
                      전체 칸반(인덱스)
                    </button>
                  </div>
                  <span className="font-bold opacity-60">{t.focusModeTitle}</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{currentStep.stepKey} 단계 집중 조회</span>
                  <h2 className="text-xl font-black mt-0.5">{currentStep.title} — {currentStep.subtitle}</h2>
                </div>

                <div className="flex flex-col gap-6">
                  {currentStep.cards.map((card) => {
                    const progress = getCardProgress(card);
                    const isCompleted = progress === 100;
                    const cardStore = projStore[card.id] || {};

                    return (
                      <div 
                        key={card.id} 
                        className={`p-6 rounded-2xl border transition ${
                          isCompleted
                            ? (isDark ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-300')
                            : (isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm')
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h3 className="text-sm font-bold">{card.title}</h3>
                            <p className="text-xs opacity-60 mt-0.5">{card.desc}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {t.progress} {progress}%
                            </span>
                            <button
                              onClick={() => navigateTo('detail', { cardId: card.id })}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
                            >
                              {t.detailEdit}
                            </button>
                          </div>
                        </div>

                        <div className="w-full bg-zinc-700/30 h-2 rounded-full overflow-hidden my-4">
                          <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-500/10 grid grid-cols-1 gap-3">
                          <div className="text-[11px] font-bold opacity-50 uppercase tracking-wider">{t.formStatus}</div>
                          {card.fields.map((field: any, fIdx: number) => {
                            const val = cardStore[field.id];
                            return (
                              <div key={fIdx} className={`p-3 rounded-xl border text-xs flex flex-col gap-1 ${isDark ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-zinc-50 border-zinc-200'}`}>
                                <span className="font-semibold text-blue-400">{field.label}</span>
                                <div className="text-[11px]">
                                  {val ? (
                                    <span className="text-emerald-400 font-medium">✓ {val}</span>
                                  ) : (
                                    <span className="opacity-40 italic">{t.notEntered}</span>
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

          {/* 3. 카드별 점검 상세 입력 페이지 */}
          {viewMode === 'detail' && activeCardObj && (() => {
            const progress = getCardProgress(activeCardObj);
            const isCompleted = progress === 100;
            const projStore = formData[projectKey] || {};
            const cardStore = projStore[activeCardObj.id] || {};

            return (
              <div className="max-w-3xl mx-auto pb-16 w-full flex flex-col gap-6">
                
                <div className="flex justify-between items-center bg-zinc-500/10 p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleGoBack}
                      className="font-semibold text-zinc-300 hover:text-white bg-zinc-700/50 px-2.5 py-1 rounded-lg transition"
                    >
                      {t.back}
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

                  <div className="flex items-center gap-2">
                    {prevCardItem ? (
                      <button
                        onClick={() => setActiveCardId(prevCardItem.card.id)}
                        className={`px-3 py-1 text-xs rounded-lg transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-200 text-zinc-700 shadow-sm'}`}
                      >
                        {t.prevCard}
                      </button>
                    ) : (
                      <span className="text-xs opacity-30 px-1">{t.firstCard}</span>
                    )}

                    {nextCardItem ? (
                      <button
                        onClick={() => setActiveCardId(nextCardItem.card.id)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
                      >
                        {t.nextCard}
                      </button>
                    ) : (
                      <span className="text-xs opacity-30 px-1">{t.lastCard}</span>
                    )}
                  </div>
                </div>

                <div className={`p-8 rounded-2xl border-t-8 ${isCompleted ? 'border-t-emerald-500' : 'border-t-blue-600'} ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xl'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{activeCardStepTitle} 단계</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {t.progress} {progress}% {isCompleted && '✨ 완료됨'}
                    </span>
                  </div>

                  <h1 className="text-xl font-black mt-1 mb-2">{activeCardObj.title}</h1>
                  <p className="text-xs opacity-60 mb-6 pb-4 border-b border-zinc-500/10">{activeCardObj.desc}</p>

                  <div className="flex flex-col gap-6">
                    {activeCardObj.fields.map((field: any, fIdx: number) => {
                      const currentVal = cardStore[field.id] || '';
                      const optionsList = getFieldOptions(field, activeCardObj.id);
                      const fieldMode = fieldModes[field.id] || 'SELECT';
                      const isCustomMode = fieldMode === 'CUSTOM';
                      const isEditMode = fieldMode === 'EDIT';
                      const isEditingThisField = editingFieldId === field.id;

                      return (
                        <div 
                          key={field.id}
                          draggable
                          onDragStart={(e) => handleFieldDragStart(e, field.id)}
                          onDragOver={handleCardDragOver}
                          onDrop={(e) => handleFieldDrop(e, activeCardObj.id, field.id)}
                          className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-zinc-50 border-zinc-200'} flex flex-col gap-3 relative group`}
                        >
                          <div className="flex justify-between items-center">
                            {isEditingThisField ? (
                              <div className="flex items-center gap-2 flex-1 mr-4">
                                <input
                                  type="text"
                                  autoFocus
                                  value={tempFieldLabel}
                                  onChange={(e) => setTempFieldLabel(e.target.value)}
                                  className={`flex-1 p-1 text-xs rounded border outline-none ${isDark ? 'bg-zinc-900 border-blue-500 text-white' : 'bg-white border-blue-400 text-zinc-900'}`}
                                />
                                <button
                                  onClick={() => handleUpdateFieldLabel(activeCardObj.id, field.id)}
                                  className="px-2 py-1 text-[10px] rounded bg-blue-600 text-white font-semibold"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => setEditingFieldId(null)}
                                  className="px-2 py-1 text-[10px] rounded bg-zinc-600 text-white"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <label className="text-xs font-bold flex items-center gap-2 cursor-grab">
                                <span title="잡고 드래그하여 위아래 순서 변경" className="opacity-40 hover:opacity-100">⠿</span>
                                <span className="text-blue-500">Q{fIdx + 1}.</span> {field.label}
                              </label>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPickerTargetType('existingField');
                                  setPickerTargetFieldId(field.id);
                                  setIsPickerOpen(true);
                                }}
                                className="px-2.5 py-1 text-[10px] rounded bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 font-semibold transition"
                              >
                                📋 옵션 가져오기
                              </button>

                              {!isEditingThisField && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingFieldId(field.id);
                                    setTempFieldLabel(field.label);
                                  }}
                                  className="text-[10px] opacity-50 hover:opacity-100 text-blue-400 transition"
                                  title="질문 수정"
                                >
                                  ✏️ 수정
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`"${field.label}" 항목을 삭제하시겠습니까?`)) {
                                    handleDeleteFieldFromCard(activeCardObj.id, field.id);
                                  }
                                }}
                                className="text-[10px] opacity-50 hover:opacity-100 text-rose-400 transition"
                                title="항목 삭제"
                              >
                                ✕ 삭제
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <select
                                className={`flex-1 p-3 text-xs rounded-xl outline-none border transition ${
                                  isDark ? 'bg-zinc-900 border-zinc-700 text-white focus:border-blue-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-500'
                                }`}
                                value={isCustomMode || isEditMode ? 'CUSTOM_MODE' : (optionsList.includes(currentVal) ? currentVal : '')}
                                onChange={(e) => handleSelectChange(field.id, e.target.value, activeCardObj.id)}
                              >
                                <option value="">--- 보기 중 하나를 선택하세요 ---</option>
                                {optionsList.map((opt: string, oIdx: number) => (
                                  <option key={oIdx} value={opt}>{opt}</option>
                                ))}
                                <option value="CUSTOM_MODE">✏️ 직접 입력 (주관식 작성)</option>
                              </select>

                              {currentVal && !isCustomMode && !isEditMode && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditOption(field.id, currentVal)}
                                  className="px-3 py-3 text-xs font-semibold rounded-xl bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 transition whitespace-nowrap"
                                  title="선택된 문장 바로 수정"
                                >
                                  ✏️ 문장 수정
                                </button>
                              )}
                            </div>

                            {(isCustomMode || isEditMode) && (
                              <div className={`mt-2 p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-zinc-900/90 border-blue-500/40' : 'bg-white border-blue-300 shadow-sm'}`}>
                                <span className="text-[11px] font-bold text-blue-400">
                                  {isEditMode ? '선택된 문장 수정하기' : '주관식 직접 작성'}
                                </span>
                                <textarea
                                  rows={2}
                                  placeholder="원하시는 내용을 직접 상세히 적어주세요..."
                                  value={customInputs[field.id] || ''}
                                  onChange={(e) => setCustomInputs({ ...customInputs, [field.id]: e.target.value })}
                                  className={`w-full p-2.5 text-xs rounded-lg outline-none border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}`}
                                />
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 text-[11px] cursor-pointer opacity-80 hover:opacity-100">
                                    <input
                                      type="checkbox"
                                      checked={!!savePermanently[field.id]}
                                      onChange={(e) => setSavePermanently({ ...savePermanently, [field.id]: e.target.checked })}
                                      className="rounded border-zinc-600 text-blue-600 focus:ring-0"
                                    />
                                    <span>➕ 이 보기를 영구 옵션으로 누적 저장</span>
                                  </label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setFieldModes(prev => ({ ...prev, [field.id]: 'SELECT' }))}
                                      className="px-3 py-1.5 bg-zinc-600 text-white text-xs rounded-lg"
                                    >
                                      취소
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCustomSubmit(activeCardObj.id, field.id, isEditMode)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
                                    >
                                      적용하기
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {currentVal && !isCustomMode && !isEditMode && (
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                  <span>✓ 선택된 값:</span> <span className="opacity-90">{currentVal}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleResetFieldValue(activeCardObj.id, field.id)}
                                  className="text-[10px] text-rose-400 hover:underline"
                                >
                                  작성 전으로 돌리기
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {editingFieldCardId === activeCardObj.id ? (
                      <div className={`p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-zinc-800 border-blue-500/50' : 'bg-zinc-100 border-blue-400'}`}>
                        <div className="font-bold text-xs text-blue-400">세부 점검 항목 추가</div>
                        <input
                          type="text"
                          placeholder="질문 레이블"
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                          className={`w-full p-2 text-xs rounded border outline-none ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="보기 옵션들 (쉼표 구분)"
                            value={newFieldOptionsStr}
                            onChange={(e) => setNewFieldOptionsStr(e.target.value)}
                            className={`flex-1 p-2 text-xs rounded border outline-none ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPickerTargetType('newField');
                              setIsPickerOpen(true);
                            }}
                            className="px-3 py-2 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap"
                          >
                            📋 기존 옵션 가져오기
                          </button>
                        </div>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditingFieldCardId(null)} className="px-3 py-1 text-xs rounded bg-zinc-600 text-white">취소</button>
                          <button onClick={() => handleAddFieldToCard(activeCardObj.id)} className="px-3 py-1 text-xs rounded bg-blue-600 text-white font-semibold">항목 추가</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingFieldCardId(activeCardObj.id)}
                        className={`w-full py-2.5 text-xs font-medium rounded-xl border border-dashed transition ${isDark ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800/40 hover:text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'}`}
                      >
                        + 세부 점검 항목 추가
                      </button>
                    )}
                  </div>

                  <div className="mt-8 pt-4 border-t border-zinc-500/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateTo('focus', { stepKey: activeCardStepKey })}
                        className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'}`}
                      >
                        집중뷰로 돌아가기
                      </button>
                      <button
                        onClick={() => navigateTo('kanban')}
                        className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'}`}
                      >
                        인덱스로 돌아가기
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {prevCardItem ? (
                        <button
                          onClick={() => setActiveCardId(prevCardItem.card.id)}
                          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 shadow-sm'}`}
                        >
                          {t.prevCard}
                        </button>
                      ) : (
                        <span className="text-xs opacity-30 px-2">{t.firstCard}</span>
                      )}

                      {nextCardItem ? (
                        <button
                          onClick={() => setActiveCardId(nextCardItem.card.id)}
                          className="px-6 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-sm"
                        >
                          {t.nextCard}
                        </button>
                      ) : (
                        <button
                          onClick={() => navigateTo('report')}
                          className="px-6 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-sm"
                        >
                          모든 카드 완료! 종합 정의서 보기 🎉
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* 4. 종합 프로젝트 정의서 뷰 */}
          {viewMode === 'report' && (
            <div className="max-w-4xl mx-auto pb-12 w-full">
              <div className="flex justify-between items-center mb-6 text-xs">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleGoBack}
                    className="font-semibold text-zinc-300 hover:text-white bg-zinc-700/50 px-3 py-1.5 rounded-xl transition"
                  >
                    {t.back}
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
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'}`}
                >
                  {t.printPdf}
                </button>
              </div>

              <div className={`p-10 rounded-2xl border ${isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white shadow-xl border-zinc-200'}`}>
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
                          const projStore = formData[projectKey] || {};
                          const cardStore = projStore[card.id] || {};
                          return (
                            <div key={cIdx} className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-800/30 border-zinc-700/40' : 'bg-zinc-200 border-zinc-200'}`}>
                              <h4 className="text-xs font-bold mb-2 text-blue-400">{card.title}</h4>
                              <div className="flex flex-col gap-2">
                                {card.fields.map((f: any, fIdx: number) => {
                                  const val = cardStore[f.id];
                                  return (
                                    <div key={fIdx} className="text-xs">
                                      <span className="opacity-60 font-medium">• {f.label}: </span>
                                      {val ? (
                                        <span className="font-semibold">{val}</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => navigateTo('detail', { cardId: card.id })}
                                          className="text-blue-400 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                                          title="클릭하여 해당 상세 페이지로 이동"
                                        >
                                          (미작성) ↗
                                        </button>
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

      {/* 5. 기존 옵션 가져오기(Picker) 모달 창 */}
      {isPickerOpen && (() => {
        const query = pickerSearchQuery.trim().toLowerCase();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
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
                          
                          const matches = allOpts.some(o => o.toLowerCase().includes(query)) || field.label.toLowerCase().includes(query);
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
                    const allOpts = newSet([...baseOpts, ...customOpts]);

                    return (
                      <div key={iIdx} className={`p-3 rounded-lg border flex flex-col gap-2 ${isDark ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-zinc-50 border-zinc-200'}`}>
                        {query && (
                          <div className="text-[10px] opacity-50 flex items-center gap-1 mb-1">
                            <span>{item.stepTitle}</span> <span>›</span> <span>{item.cardTitle}</span>
                          </div>
                        )}
                        <div className="text-xs font-bold text-blue-400">{item.field.label}</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {allOpts.map((opt, oIdx) => {
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
        );
      })()}

      {/* 초대 모달 */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        onSendInvite={handleSendInvite}
        isDark={isDark}
      />

      {/* 공유(파일/폴더/프로젝트) 모달 */}
      <ShareModal
        isOpen={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        target={shareTarget}
        isDark={isDark}
      />

      {/* 우클릭 컨텍스트 메뉴 */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          isDark={isDark}
          onClose={closeContextMenu}
          items={
            ctxMenu.type === 'card'
              ? [
                  {
                    label: '복제',
                    icon: '📋',
                    onClick: () => handleDuplicateCard(ctxMenu.cardId!),
                  },
                ]
              : [
                  {
                    label: '공유',
                    icon: '🔗',
                    onClick: () => openShareModal(ctxMenu.target!),
                  },
                ]
          }
        />
      )}

    </div>
  );
}