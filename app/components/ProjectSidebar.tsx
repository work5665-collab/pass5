'use client';

import React from 'react';
import { Project, Step, DictType, ViewMode, Folder, SharedItem } from '../../lib/types';

type FrameworkStep = Step;

interface ProjectSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isFolderOpen: boolean;
  setIsFolderOpen: (open: boolean) => void;
  projects: Project[];
  folders: Folder[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  activeFolderId: string | null;
  isAddingProject: boolean;
  setIsAddingProject: (adding: boolean) => void;
  newProjName: string;
  setNewProjName: (name: string) => void;
  sidebarEditingProjId: string | null;
  setSidebarEditingProjId: (id: string | null) => void;
  sidebarTempName: string;
  setSidebarTempName: (name: string) => void;
  currentUserRole: string | null;
  frameworkData: FrameworkStep[];
  navigateTo: (mode: ViewMode, options?: any) => void;
  handleAddProject: (e: React.FormEvent) => void;
  handleProjectDragStart: (e: React.DragEvent, id: string) => void;
  handleProjectDrop: (e: React.DragEvent, id: string) => void;
  handleDuplicateProject: (proj: Project) => void;
  handleDeleteProject: (id: string) => void;
  handleCommitSidebarProjectName: (id: string) => void;
  t: DictType;
  isDark: boolean;
  setIsInviteModalOpen: (open: boolean) => void;
  viewMode: string;
  focusStepKey: string;
  expandedFolderIds: Set<string>;
  handleToggleFolderExpanded: (folderId: string) => void;
  openFolder: (folderId: string) => void;
  isAddingFolder: boolean;
  setIsAddingFolder: (adding: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  handleAddFolder: (parentId: string | null) => void;
  addingChildToFolderId: string | null;
  setAddingChildToFolderId: (id: string | null) => void;
  editingFolderId: string | null;
  setEditingFolderId: (id: string | null) => void;
  folderTempName: string;
  setFolderTempName: (name: string) => void;
  handleRenameFolder: (folderId: string) => void;
  handleDeleteFolder: (folderId: string) => void;
  handleDropOnFolder: (folderId: string | null) => void;
  onItemContextMenu?: (e: React.MouseEvent, target: { type: 'folder' | 'project'; id: string; name: string }) => void;
  // 타인으로부터 초대받은 '공유받은 항목' (프로젝트/폴더)
  sharedItems?: SharedItem[];
  userEmail?: string;
  onLogout?: () => void;
  // 읽기 전용 모드 (CUD 버튼/드래그 비활성화)
  readOnly?: boolean;
}

export default function ProjectSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  isFolderOpen,
  setIsFolderOpen,
  projects,
  folders,
  activeProjectId,
  setActiveProjectId,
  activeFolderId,
  isAddingProject,
  setIsAddingProject,
  newProjName,
  setNewProjName,
  sidebarEditingProjId,
  setSidebarEditingProjId,
  sidebarTempName,
  setSidebarTempName,
  currentUserRole,
  frameworkData,
  navigateTo,
  handleAddProject,
  handleProjectDragStart,
  handleProjectDrop,
  handleDuplicateProject,
  handleDeleteProject,
  handleCommitSidebarProjectName,
  t,
  isDark,
  setIsInviteModalOpen,
  viewMode,
  focusStepKey,
  expandedFolderIds,
  handleToggleFolderExpanded,
  openFolder,
  isAddingFolder,
  setIsAddingFolder,
  newFolderName,
  setNewFolderName,
  handleAddFolder,
  addingChildToFolderId,
  setAddingChildToFolderId,
  editingFolderId,
  setEditingFolderId,
  folderTempName,
  setFolderTempName,
  handleRenameFolder,
  handleDeleteFolder,
  handleDropOnFolder,
  onItemContextMenu,
  sharedItems = [],
  userEmail,
  onLogout,
  readOnly = false
}: ProjectSidebarProps) {
  // Enter 커밋 후 따라오는 blur가 같은 커밋을 재수행하지 않도록 소비 플래그 (로컬 ref)
  const sidebarEnterRef = React.useRef(false);
  const folderEnterRef = React.useRef(false);

  // 폴더 트리 파생 데이터
  const level1Folders = folders.filter(f => !f.parent_id);
  const childrenOf = (parentId: string) => folders.filter(f => f.parent_id === parentId);
  const isLevel2 = (folder: Folder) => !!folder.parent_id;
  const projectsInFolder = (folderId: string | null) =>
    projects.filter(p => (p.folder_id ?? null) === folderId);

  const inputCls = `px-2 py-1.5 text-xs rounded outline-none border ${isDark ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400'}`;

  // 프로젝트 행 렌더링
  const renderProjectRow = (proj: Project) => {
    const isEditing = sidebarEditingProjId === proj.id;
    return (
      <div
        key={proj.id}
        draggable={!isEditing && !readOnly}
        onDragStart={readOnly ? undefined : (e) => handleProjectDragStart(e, proj.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={readOnly ? undefined : (e) => handleProjectDrop(e, proj.id)}
        onContextMenu={(e) => onItemContextMenu?.(e, { type: 'project', id: proj.id, name: proj.name })}
        onClick={() => {
          if (!isEditing) {
            setActiveProjectId(proj.id);
            navigateTo('kanban');
          }
        }}
        className={`group relative flex items-center px-2.5 py-2 text-xs rounded-lg transition cursor-pointer ${
          activeProjectId === proj.id
            ? (isDark ? 'bg-zinc-800/80 font-medium text-white' : 'bg-zinc-200/80 font-medium text-zinc-900')
            : (isDark ? 'opacity-70 hover:bg-zinc-800/40 hover:opacity-100' : 'opacity-70 hover:bg-zinc-200/40 hover:opacity-100')
        }`}
      >
        {isEditing ? (
          <input
            type="text"
            autoFocus
            value={sidebarTempName}
            onChange={(e) => setSidebarTempName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sidebarEnterRef.current = true; // Enter로 커밋됨 표시 → blur가 재커밋 방지
                handleCommitSidebarProjectName(proj.id);
              }
              if (e.key === 'Escape') {
                sidebarEnterRef.current = false;
                setSidebarEditingProjId(null);
              }
            }}
            onBlur={() => {
              // Enter 커밋 직후 따라오는 blur는 무시 (alert 중복 방지)
              if (sidebarEnterRef.current) {
                sidebarEnterRef.current = false;
                return;
              }
              handleCommitSidebarProjectName(proj.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full bg-transparent outline-none border-b border-blue-500 text-xs ${isDark ? 'text-white' : 'text-zinc-900'}`}
          />
        ) : (
          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
            <span>🗂️</span>
            <span className="truncate">{proj.name}</span>
          </div>
        )}

        {!isEditing && !readOnly && (
          <div
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition rounded-md px-1 py-0.5 shadow-sm ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicateProject(proj);
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200"
              title="프로젝트 복제"
            >
              📋
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sidebarEnterRef.current = false; // 새 편집 세션 시작 시 플래그 초기화
                setSidebarEditingProjId(proj.id);
                setSidebarTempName(proj.name);
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300"
              title="이름 수정"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`"${proj.name}" 프로젝트를 삭제하시겠습니까?`)) {
                  handleDeleteProject(proj.id);
                }
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500 text-rose-200"
              title="프로젝트 삭제"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  // 폴더 행 렌더링 (1단계 / 2단계 공용)
  const renderFolderRow = (folder: Folder) => {
    const isEditing = editingFolderId === folder.id;
    const expanded = expandedFolderIds.has(folder.id);
    const lvl2 = isLevel2(folder);
    const childCount = childrenOf(folder.id).length;

    return (
      <div
        key={folder.id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={readOnly ? undefined : (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDropOnFolder(folder.id);
        }}
        onContextMenu={(e) => onItemContextMenu?.(e, { type: 'folder', id: folder.id, name: folder.name })}
        className={`group relative flex items-center gap-1 px-1.5 py-1.5 text-xs rounded-lg transition cursor-pointer ${
          activeFolderId === folder.id
            ? (isDark ? 'bg-blue-600/25 text-white font-medium' : 'bg-blue-100 text-zinc-900 font-medium')
            : (isDark ? 'opacity-80 hover:bg-zinc-800/40 hover:opacity-100' : 'opacity-80 hover:bg-zinc-200/40 hover:opacity-100')
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFolderExpanded(folder.id);
          }}
          className="text-[10px] opacity-60 w-3 shrink-0"
          title="접기/펴기"
        >
          {expanded ? '▼' : '▶'}
        </button>

        {isEditing ? (
          <input
            type="text"
            autoFocus
            value={folderTempName}
            onChange={(e) => setFolderTempName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                folderEnterRef.current = true; // Enter로 커밋됨 표시 → blur가 재커밋 방지
                handleRenameFolder(folder.id);
              }
              if (e.key === 'Escape') {
                folderEnterRef.current = false;
                setEditingFolderId(null);
              }
            }}
            onBlur={() => {
              // Enter 커밋 직후 따라오는 blur는 무시 (경고 중복 방지)
              if (folderEnterRef.current) {
                folderEnterRef.current = false;
                return;
              }
              handleRenameFolder(folder.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`flex-1 min-w-0 bg-transparent outline-none border-b border-blue-500 text-xs ${isDark ? 'text-white' : 'text-zinc-900'}`}
          />
        ) : (
          <div
            className="flex items-center gap-1.5 truncate flex-1 min-w-0"
            onClick={() => openFolder(folder.id)}
            title="폴더 인덱스 열기"
          >
            <span>📁</span>
            <span className="truncate font-medium">{folder.name}</span>
            <span className="text-[10px] opacity-40 shrink-0">
              {projectsInFolder(folder.id).length + (lvl2 ? 0 : childCount)}
            </span>
          </div>
        )}

        {!isEditing && !readOnly && (
          <div
            className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition rounded-md px-1 py-0.5 shadow-sm ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}
          >
            <button
              type="button"
              title={lvl2 ? t.folderLimitMsg : '하위 폴더 추가'}
              onClick={(e) => {
                e.stopPropagation();
                if (lvl2) {
                  alert(t.folderLimitMsg);
                  return;
                }
                setAddingChildToFolderId(folder.id);
              }}
              className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                lvl2
                  ? 'opacity-50 cursor-not-allowed bg-zinc-600/40 text-zinc-400'
                  : 'bg-blue-600/30 hover:bg-blue-600 text-blue-200'
              }`}
            >
              {t.addSubFolderBtn}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderEnterRef.current = false; // 새 편집 세션 시작 시 플래그 초기화
                setEditingFolderId(folder.id);
                setFolderTempName(folder.name);
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300"
              title="폴더 이름 수정"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`"${folder.name}" 폴더와 하위 폴더의 프로젝트가 미분류로 이동됩니다. 삭제하시겠습니까?`)) {
                  handleDeleteFolder(folder.id);
                }
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500 text-rose-200"
              title="폴더 삭제"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  // 하위 폴더 추가 폼
  const renderChildFolderForm = (parentId: string) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleAddFolder(parentId);
      }}
      className="flex flex-col gap-1.5 mb-1.5 p-2 rounded-lg bg-zinc-500/10 ml-2"
    >
      <input
        type="text"
        autoFocus
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        placeholder={t.folderPlaceholder}
        className={inputCls}
      />
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => setAddingChildToFolderId(null)}
          className={`px-2 py-0.5 text-[10px] rounded ${isDark ? 'bg-zinc-700 text-white' : 'bg-zinc-300 text-zinc-800'}`}
        >
          취소
        </button>
        <button type="submit" className="px-2 py-0.5 text-[10px] rounded bg-blue-600 text-white font-semibold">
          생성
        </button>
      </div>
    </form>
  );

  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-8'} transition-all duration-300 flex flex-col justify-between p-3 bg-transparent border-r border-zinc-500/10 overflow-hidden print:hidden`}>
      <div>
        <div className={`flex items-center mb-6 px-1 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {isSidebarOpen && <span className="font-bold text-xs tracking-wider opacity-70 cursor-pointer" onClick={() => navigateTo('kanban')}>{t.workspace}</span>}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-md text-xs transition ${isDark ? 'hover:bg-zinc-800/60 text-zinc-400' : 'hover:bg-zinc-200/60 text-zinc-650'}`}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {isSidebarOpen && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsFolderOpen(!isFolderOpen)}>
                <span className="text-[10px] opacity-60">{isFolderOpen ? '▼' : '▶'}</span>
                <span className="text-[10px] font-medium opacity-40 uppercase tracking-wider">{t.projects}</span>
              </div>
              {!readOnly && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setIsAddingFolder(!isAddingFolder)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold hover:bg-amber-500/30 transition"
                  title={t.addFolderBtn}
                >
                  {t.addFolderBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingProject(!isAddingProject)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold hover:bg-blue-500/30 transition"
                >
                  {t.addProjectBtn}
                </button>
                {activeProjectId && (currentUserRole === 'owner' || currentUserRole === 'admin') && (
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold hover:bg-emerald-500/30 transition"
                    title="팀원 초대"
                  >
                    👥
                  </button>
                )}
              </div>
              )}
            </div>

            {/* 1단계 폴더 추가 폼 */}
            {isAddingFolder && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddFolder(null);
                }}
                className="flex flex-col gap-1.5 mb-2.5 p-2 rounded-lg bg-zinc-500/10"
              >
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={`${t.folderPlaceholder} (${t.addFolderBtn})`}
                  className={inputCls}
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingFolder(false)}
                    className={`px-2 py-0.5 text-[10px] rounded ${isDark ? 'bg-zinc-700 text-white' : 'bg-zinc-300 text-zinc-800'}`}
                  >
                    취소
                  </button>
                  <button type="submit" className="px-2 py-0.5 text-[10px] rounded bg-blue-600 text-white font-semibold">
                    생성
                  </button>
                </div>
              </form>
            )}

            {/* 프로젝트 추가 폼 */}
            {isAddingProject && (
              <form onSubmit={handleAddProject} className="flex flex-col gap-1.5 mb-2.5 p-2 rounded-lg bg-zinc-500/10">
                <input
                  type="text"
                  autoFocus
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder={t.projPlaceholder}
                  className={inputCls}
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingProject(false)}
                    className={`px-2 py-0.5 text-[10px] rounded ${isDark ? 'bg-zinc-700 text-white' : 'bg-zinc-300 text-zinc-800'}`}
                  >
                    취소
                  </button>
                  <button type="submit" className="px-2 py-0.5 text-[10px] rounded bg-blue-600 text-white font-semibold">
                    생성
                  </button>
                </div>
              </form>
            )}

            {isFolderOpen && (
              <div className="flex flex-col gap-1 max-h-[52vh] overflow-y-auto pr-1">
                {/* 폴더 트리 */}
                {level1Folders.map(folder => (
                  <div key={folder.id} className="flex flex-col gap-1">
                    {renderFolderRow(folder)}

                    {/* 하위 2단계 폴더 추가 폼 */}
                    {addingChildToFolderId === folder.id && renderChildFolderForm(folder.id)}

                    {/* 확장 시: 하위 폴더 + 소속 프로젝트 표시 */}
                    {expandedFolderIds.has(folder.id) && (
                      <div className="ml-2 pl-2 border-l border-zinc-500/10 flex flex-col gap-1 pb-1">
                        {childrenOf(folder.id).map(child => (
                          <div key={child.id} className="flex flex-col gap-1">
                            {renderFolderRow(child)}
                            {addingChildToFolderId === child.id && renderChildFolderForm(child.id)}
                            {expandedFolderIds.has(child.id) && (
                              <div className="ml-2 pl-2 border-l border-zinc-500/10 flex flex-col gap-1">
                                {projectsInFolder(child.id).map(renderProjectRow)}
                              </div>
                            )}
                          </div>
                        ))}
                        {projectsInFolder(folder.id).map(renderProjectRow)}
                      </div>
                    )}
                  </div>
                ))}

                {/* 미분류 영역 */}
                <div
                  className="mt-2 pt-2 border-t border-zinc-500/10 flex flex-col gap-1"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={readOnly ? undefined : (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropOnFolder(null);
                  }}
                >
                  <div className="text-[10px] font-medium opacity-40 uppercase tracking-wider mb-1 px-1">
                    🗃️ {t.uncategorized}
                  </div>
                  {projectsInFolder(null).length === 0 ? (
                    <div className="text-[10px] opacity-30 italic px-1">빈 영역</div>
                  ) : (
                    projectsInFolder(null).map(renderProjectRow)
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {isSidebarOpen && (
          <div className="mt-5 pt-4 border-t border-zinc-500/10">
            <div className="text-[10px] font-medium opacity-40 uppercase tracking-wider mb-2 px-1">🤝 참여 목록</div>
            {sharedItems.length === 0 ? (
              <div className="text-[10px] opacity-30 italic px-1">초대받은 항목이 없습니다.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {sharedItems.map(item => (
                  <div
                    key={item.shareId}
                    onClick={() => item.target_type === 'project'
                      ? (setActiveProjectId(item.target_id), navigateTo('kanban'))
                      : openFolder(item.target_id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition cursor-pointer ${
                      isDark ? 'opacity-80 hover:bg-zinc-800/40 hover:opacity-100' : 'opacity-80 hover:bg-zinc-200/40 hover:opacity-100'
                    }`}
                    title={`${item.target_type === 'folder' ? '폴더' : '프로젝트'} 열기`}
                  >
                    <span>{item.target_type === 'folder' ? '📁' : '🗂️'}</span>
                    <span className="truncate flex-1">{item.target_name}</span>
                    <span className="text-[10px] opacity-40 shrink-0">{item.target_type === 'folder' ? '폴더' : '프로젝트'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isSidebarOpen && (
          <div className="mt-6 pt-4 border-t border-zinc-500/10">
            <div className="text-[10px] font-medium opacity-40 uppercase tracking-wider mb-2 px-1">{t.focusViews}</div>
            <div className="flex flex-col gap-1">
              {frameworkData.map((step, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => navigateTo('focus', { stepKey: step.stepKey })}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition text-left ${
                    viewMode === 'focus' && focusStepKey === step.stepKey
                      ? 'bg-blue-600 text-white font-medium'
                      : (isDark ? 'opacity-70 hover:bg-zinc-800/40 hover:opacity-100' : 'opacity-70 hover:bg-zinc-200/40 hover:opacity-100')
                  }`}
                >
                  <span>{step.title}</span>
                  <span className="text-[10px] opacity-60">집중 →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 유저 정보 푸터 (헤더에서 이전) */}
      {isSidebarOpen && userEmail && (
        <div className={`mt-4 pt-3 border-t border-zinc-500/10 px-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] truncate" title={userEmail}>{userEmail}</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className={`shrink-0 text-[10px] px-2 py-1 rounded transition ${
                  isDark ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white'
                }`}
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}