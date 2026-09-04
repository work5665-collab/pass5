'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import InviteModal from './components/InviteModal';
import ShareModal, { ShareTarget } from './components/ShareModal';
import ContextMenu from './components/ContextMenu';
import ProjectSidebar from './components/ProjectSidebar';
import KanbanBoard from '../components/KanbanBoard';
import { ViewMode, LangMode, Folder, SharedItem, Card } from '../lib/types';
import { supabase } from '../lib/supabase/client';
import { fetchSharesSharedWithMe } from '../lib/supabase/shares';
import { initialFrameworkData } from '../lib/framework';
import { dict } from '../lib/i18n';
import { useProjectData } from '../lib/hooks/useProjectData';
import { useFolderData } from '../lib/hooks/useFolderData';
import { useCardData } from '../lib/hooks/useCardData';
import { useFieldInteraction } from '../lib/hooks/useFieldInteraction';
import FolderIndexView from './components/FolderIndexView';
import SharesView from './components/SharesView';

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

  // ─── 검색/필터 상태 (1단계: 인덱스 키워드 검색 및 카드 강조/Dimming) ───
  // 주의: 조기 반환문(early return) 위쪽에 선언해 Hook 호출 순서를 항상 일정하게 유지
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchTitle, setSearchTitle] = useState(true);
  const [searchDesc, setSearchDesc] = useState(true);

  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();
  const isSearchActive = normalizedSearchKeyword.length > 0;
  const isCardMatch = useCallback(
    (card: Card) => {
      if (!isSearchActive) return true;
      const inTitle = searchTitle && card.title.toLowerCase().includes(normalizedSearchKeyword);
      const inDesc = searchDesc && card.desc.toLowerCase().includes(normalizedSearchKeyword);
      return inTitle || inDesc;
    },
    [isSearchActive, normalizedSearchKeyword, searchTitle, searchDesc],
  );

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
  // 우측 하단 플로팅 TOP 버튼 — 스크롤 임계값 초과 시 표시
  const [showTopBtn, setShowTopBtn] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    console.log('TOP-btn: scroll listener attached to main');
    const onScroll = () => {
      console.log('scrolling:', el.scrollTop);
      setShowTopBtn(el.scrollTop > 300);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

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

  // 공유 현황 접근 권한: Owner 또는 Admin 인 프로젝트가 하나라도 있는 경우만 허용
  const canAccessShares = projects.some(p => p.userRole === 'owner' || p.userRole === 'admin');

  // 공유 현황 항목(이름/아이콘) 클릭 시 해당 대상(프로젝트/폴더) 인덱스 뷰로 이동
  const handleOpenShareTarget = (share: { target_type: 'folder' | 'project'; target_id: string }) => {
    if (share.target_type === 'project') {
      setActiveProjectId(share.target_id);
      navigateTo('kanban');
    } else {
      setActiveFolderId(share.target_id);
      navigateTo('folder');
    }
  };

  // 사이드바 '공유받은 항목' 데이터 (타인으로부터 초대받은 프로젝트/폴더)
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        setSharedItems([]);
        return;
      }
      const shares = await fetchSharesSharedWithMe();
      if (!active) return;
      const folderIds = shares.filter(s => s.target_type === 'folder').map(s => s.target_id);
      const projectIds = shares.filter(s => s.target_type === 'project').map(s => s.target_id);
      const noneId = '00000000-0000-0000-0000-000000000000';
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from('folders').select('id, name').in('id', folderIds.length ? folderIds : [noneId]),
        supabase.from('projects').select('id, name').in('id', projectIds.length ? projectIds : [noneId]),
      ]);
      const folderName = Object.fromEntries((f || []).map((x: any) => [x.id, x.name]));
      const projectName = Object.fromEntries((p || []).map((x: any) => [x.id, x.name]));
      // 이름이 해석되지 않아도 항목은 유지 (fallback 표기) — 초대받은 항목이 누락되지 않도록
      const items: SharedItem[] = shares.map(s => ({
        shareId: s.id,
        target_type: s.target_type,
        target_id: s.target_id,
        target_name: (s.target_type === 'folder' ? folderName[s.target_id] : projectName[s.target_id]) || '(삭제된 항목)',
      }));
      if (active) setSharedItems(items);
    })();
    return () => { active = false; };
  }, [user]);

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
    <div className={`h-screen overflow-hidden flex flex-col justify-between transition-colors duration-200 print:h-auto print:max-h-none print:overflow-visible ${isDark ? 'bg-[#18181b] text-[#f4f4f5]' : 'bg-[#fafaf9] text-[#18181b]'}`}>
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
          sharedItems={sharedItems}
          userEmail={user?.email}
          onLogout={handleLogout}
        />


        {/* 메인 콘텐츠 영역 */}
        <main ref={mainScrollRef} style={{ scrollbarGutter: 'stable' }} className={`relative flex-1 flex flex-col px-8 pb-8 overflow-y-auto print:h-auto print:overflow-visible print:p-0 ${isDark ? 'bg-[#18181b]' : 'bg-[#fafaf9]'}`}>
          
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

            /* ─── 인쇄/PDF 저장 전용 교정 (A4 라이트 문서화) ─── */
            @media print {
              /* 브라우저 기본 헤더(사이트명/날짜)·푸터(URL) 인쇄 표기 제거 */
              @page { size: auto; margin: 15mm; }
              html, body {
                background: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              /* 문서 본문 패널 — 고정 높이/스크롤/최대높이 해제 → 2페이지 이상 전체 본문이 연달아 출력 */
              main, .h-screen, .overflow-y-auto, .overflow-hidden {
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
              }

              /* 다크모드 무조건 해제 → 깔끔한 라이트 보고서 */
              * {
                background-color: transparent !important;
                background-image: none !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                color: #111827 !important;
              }
              /* 최상위 본문 배경은 흰색으로 */
              html, body, main { background: #ffffff !important; }

              /* 최상단 문서 타이틀 — 보고서 헤더 스타일, 하단 여백 최소화해 본문이 1페이지부터 이어지도록 */
              .text-center h1 {
                font-size: 1.5rem !important;
                font-weight: 800 !important;
                letter-spacing: -0.01em !important;
                color: #111827 !important;
                margin: 0.15rem 0 0.15rem !important;
              }
              .text-center span { color: #1e3a8a !important; font-weight: 700 !important; }
              .text-center p { color: #4b5563 !important; margin: 0 0 0.25rem !important; }

              /* 단계별 섹션 — 큰 폰트 + 하단 얇은 구분선 (본문은 페이지간 부드럽게 이어짐) */
              .report-step {
                border-bottom: 1px solid #d1d5db !important;
                padding-bottom: 0.25rem !important;
                margin-bottom: 1rem !important;
                page-break-inside: auto;
              }
              .report-step h3 {
                font-size: 1.1rem !important;
                font-weight: 800 !important;
                color: #111827 !important;
                margin: 0.5rem 0 0.6rem !important;
              }
              /* 카드 항목 — 자연스러운 문맥형 리스트, 서브타이틀 굵게 + 본문 또렷하게 */
              .report-step h4 {
                font-size: 0.8rem !important;
                font-weight: 700 !important;
                color: #111827 !important;
                margin: 0 0 0.35rem !important;
              }
              .report-step div { color: #111827 !important; }
              /* 항목명 너비 고정 해제 → 어색한 글자 깨짐 방지 */
              .report-step span { white-space: normal !important; }
            }
          `}</style>

          {/* 상단 글로벌 툴바 (모든 뷰 공통 표시) */}
          <header className="flex justify-between items-center pt-8 pb-4 border-b border-zinc-500/10">
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
                {/* 헤더 미니 검색창 (고정 노출 · 슬림) — 이메일은 사이드바 최하단으로 이동 */}
                <div className={`flex items-center gap-2 rounded-xl border px-2 py-1 max-w-[260px] overflow-x-auto transition ${isDark ? 'bg-zinc-900/70 border-zinc-700/60' : 'bg-white border-zinc-300 shadow-sm'}`}>
                  <span className="text-xs opacity-50 shrink-0">🔍</span>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onClick={(e) => (e.target as HTMLInputElement).focus()}
                    placeholder="카드 키워드 검색..."
                    className={`w-32 flex-1 min-w-[100px] bg-transparent text-xs outline-none ${isDark ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}`}
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      className="text-[10px] opacity-50 hover:opacity-100 shrink-0"
                      title="검색어 지우기"
                    >
                      ✕
                    </button>
                  )}
                  <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-zinc-500/20">
                    <button
                      type="button"
                      onClick={() => setSearchTitle(!searchTitle)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full border transition ${
                        searchTitle
                          ? isDark ? 'bg-blue-600/25 text-blue-300 border-blue-500/50' : 'bg-blue-100 text-blue-700 border-blue-300'
                          : isDark ? 'bg-zinc-800/60 text-zinc-500 border-zinc-700/60' : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                      }`}
                    >
                      제목
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchDesc(!searchDesc)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full border transition ${
                        searchDesc
                          ? isDark ? 'bg-blue-600/25 text-blue-300 border-blue-500/50' : 'bg-blue-100 text-blue-700 border-blue-300'
                          : isDark ? 'bg-zinc-800/60 text-zinc-500 border-zinc-700/60' : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                      }`}
                    >
                      내용
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => navigateTo('kanban')}
                  className={`font-medium transition px-3 py-1.5 rounded-lg ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'opacity-60 hover:opacity-100'}`}
                >
                  {t.kanbanView}
                </button>
                <button
                  onClick={() => navigateTo('report')}
                  className="font-medium transition px-3 py-1.5 rounded-lg opacity-60 hover:opacity-100"
                >
                  {t.reportView}
                </button>
                {canAccessShares && (
                  <button
                    onClick={() => navigateTo('shares')}
                    className={`font-medium transition px-3 py-1.5 rounded-lg ${viewMode === 'shares' ? 'bg-blue-600 text-white' : 'opacity-60 hover:opacity-100'}`}
                  >
                    👥 공유 현황
                  </button>
                )}
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

          {/* 0.5 공유 현황 뷰 (Owner/Admin 전용 · 사용자 중심 관리) */}
          {viewMode === 'shares' && canAccessShares && (
            <SharesView
              isDark={isDark}
              t={t}
              handleGoBack={handleGoBack}
              onOpenTarget={handleOpenShareTarget}
            />
          )}

          {/* 1. 전체 칸반 보드 뷰 */}
          {viewMode === 'kanban' && (
            <>
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
              searchActive={isSearchActive}
              isCardMatch={isCardMatch}
            />
              </>
          )}


          {/* 2. 단계별 집중 뷰 */}
          {viewMode === 'focus' && (() => {
            const currentStep = frameworkData.find(s => s.stepKey === focusStepKey) || frameworkData[0];
            const projStore = formData[projectKey] || {};

            return (
              <div className="max-w-4xl mx-auto mt-3 pb-12 w-full flex flex-col gap-0">
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

                <div className="mt-3">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{currentStep.stepKey} 단계 집중 조회</span>
                  <h2 className="text-xl font-black mt-0.5">{currentStep.title} — {currentStep.subtitle}</h2>
                </div>

                <div className="flex flex-col gap-6 mt-3">
                  {currentStep.cards.map((card) => {
                    const progress = getCardProgress(card);
                    const isCompleted = progress === 100;
                    const cardStore = projStore[card.id] || {};

                    return (
                      <div 
                        key={card.id} 
                        className={`p-6 rounded-xl border transition ${
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
              <div className="max-w-4xl mx-auto mt-3 pb-16 w-full flex flex-col gap-0">
                
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

                <div className={`mt-3 p-8 rounded-xl border-t-8 ${isCompleted ? 'border-t-emerald-500' : 'border-t-blue-600'} ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xl'}`}>
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


          {/* 4. 종합 프로젝트 정의서 뷰 — 중앙 집중형 카드 프레임 (max-w-4xl) */}
          {viewMode === 'report' && (
            <>
              {/* 1행: 서브헤더 — 집중뷰와 동일 규격 (좌: 뒤로가기/칸반, 우: 인쇄) */}
              <div className="max-w-4xl mx-auto w-full mt-3 flex justify-between items-center bg-zinc-500/10 p-3 rounded-xl text-xs print:hidden">
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
                <button
                  onClick={() => window.print()}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'}`}
                >
                  {t.printPdf}
                </button>
              </div>

              {/* 2행: 문서 제목 카드 */}
              <div className="max-w-4xl mx-auto w-full mt-3">
                <div className={`py-3 px-6 rounded-xl border print:p-0 print:border-0 print:w-full print:max-w-none ${isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white shadow-xl border-zinc-200'}`}>
                  <div className="text-center print:mb-1">
                    <span className="text-xs font-bold text-blue-500 tracking-widest uppercase">PASS 5 FRAMEWORK SYSTEM</span>
                    <h1 className="text-xl font-black mt-0.5 mb-1 print:mt-0 print:mb-1">{activeProject?.name}</h1>
                    <p className="text-[11px] opacity-50 print:mb-0">종합 프로젝트 정의서 (Master Specification Document)</p>
                  </div>
                </div>
              </div>

              {/* 3행: 5단계 네비게이터 — 제목 카드와 본문 카드 사이, sticky top-0, 너비 본문과 동일 (w-full max-w-4xl) */}
              <div className="sticky top-0 z-50 mt-1 max-w-4xl mx-auto w-full print:hidden">
                <nav className={`flex items-center gap-1.5 py-2.5 ${isDark ? 'bg-zinc-900/95' : 'bg-white/95'}`}>
                  {frameworkData.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => document.getElementById(`report-step-${col.stepKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className={`flex-1 text-xs font-semibold px-2 py-2 rounded-lg transition whitespace-nowrap ${
                        isDark
                          ? 'bg-zinc-800/60 text-zinc-300 hover:bg-blue-600 hover:text-white border border-zinc-700/50'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-blue-600 hover:text-white border border-zinc-200'
                      }`}
                    >
                      {col.title}
                    </button>
                  ))}
                </nav>
                {/* 하단 그라데이션 페이드아웃 — 겹침 처리로 여백 점유 제거 */}
                <div className={`pointer-events-none h-1.5 -mb-1.5 bg-gradient-to-b ${isDark ? 'from-zinc-900 via-zinc-900/70 to-transparent' : 'from-white via-white/70 to-transparent'}`} />
              </div>

              {/* 4행: 본문 내용 카드 — 단계별 내용 */}
              <div className="max-w-4xl mx-auto w-full mt-1 pb-12">
                <div className={`p-10 rounded-xl border print:p-0 print:border-0 print:w-full print:max-w-none ${isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white shadow-xl border-zinc-200'}`}>
                  <div className="flex flex-col gap-6">
                    {frameworkData.map((col, idx) => (
                      <div key={idx} id={`report-step-${col.stepKey}`} className="report-step pb-5 border-b border-zinc-500/10 last:border-0 scroll-mt-[72px]">
                        <h3 className="text-sm font-bold text-blue-400 mb-3">{col.title} 단계</h3>
                        <div className="grid grid-cols-1 gap-3">
                          {col.cards.map((card, cIdx) => {
                            const projStore = formData[projectKey] || {};
                            const cardStore = projStore[card.id] || {};
                            return (
                              <div key={cIdx} className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-800/30 border-zinc-700/40' : 'bg-zinc-50 border-zinc-200'}`}>
                                <h4 className="text-xs font-bold mb-2 text-blue-400">{card.title}</h4>
                                <div className="flex flex-col gap-2">
                                  {card.fields.map((f: any, fIdx: number) => {
                                    const val = cardStore[f.id];
                                    return (
                                      <div key={fIdx} className="text-xs leading-relaxed">
                                        <span className="opacity-60 font-medium">{f.label}: </span>
                                        {val ? (
                                          <span className="font-semibold">{val}</span>
                                        ) : (
                                          <span
                                            onClick={() => navigateTo('detail', { cardId: card.id })}
                                            className={`cursor-pointer font-medium transition hover:text-blue-400 hover:underline ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                                            title="세부 작성 페이지로 이동"
                                          >
                                            (미작성)
                                          </span>
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
            </>
          )}

        </main>

        {/* 우측 하단 플로팅 TOP 버튼 — main 바깥(overflow 영향 없음)에 배치 (테스트: 무조건 노출) */}
        <button
          onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 flex flex-col items-center justify-center w-9 h-9 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 shadow-lg backdrop-blur cursor-pointer transition print:hidden"
        >
          <span className="text-xs leading-none">▲</span>
          <span className="text-[7px] font-bold leading-none mt-0.5">TOP</span>
        </button>
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