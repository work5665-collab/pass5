'use client';

import React from 'react';
import { Project, Step, DictType, ViewMode } from '../../lib/types';

type FrameworkStep = Step;

interface ProjectSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isFolderOpen: boolean;
  setIsFolderOpen: (open: boolean) => void;
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
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
  navigateTo: (mode: any, options?: any) => void;
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
}

export default function ProjectSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  isFolderOpen,
  setIsFolderOpen,
  projects,
  activeProjectId,
  setActiveProjectId,
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
  focusStepKey
}: ProjectSidebarProps) {
  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-8'} transition-all duration-300 flex flex-col justify-between p-3 bg-transparent border-r border-zinc-500/10 overflow-hidden`}>
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
                <span className="text-[10px] font-medium opacity-40 uppercase tracking-wider">{t.projects} (폴더 관리)</span>
              </div>
              <div className="flex gap-1">
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
                    👥 초대
                  </button>
                )}
              </div>
            </div>

            {isAddingProject && (
              <form onSubmit={handleAddProject} className="flex flex-col gap-1.5 mb-2.5 p-2 rounded-lg bg-zinc-500/10">
                <input
                  type="text"
                  autoFocus
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder={t.projPlaceholder}
                  className={`px-2 py-1.5 text-xs rounded outline-none border ${isDark ? 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400'}`}
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingProject(false)}
                    className="px-2 py-0.5 text-[10px] rounded bg-zinc-600 text-white"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 text-[10px] rounded bg-blue-600 text-white font-semibold"
                  >
                    생성
                  </button>
                </div>
              </form>
            )}

            {isFolderOpen && (
              <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto pr-1">
                {projects.map((proj) => {
                  const isEditing = sidebarEditingProjId === proj.id;
                  return (
                    <div
                      key={proj.id}
                      draggable={!isEditing}
                      onDragStart={(e) => handleProjectDragStart(e, proj.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleProjectDrop(e, proj.id)}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveProjectId(proj.id);
                          navigateTo('kanban');
                        }
                      }}
                      className={`group flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition cursor-pointer ${
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
                            if (e.key === 'Enter') handleCommitSidebarProjectName(proj.id);
                            if (e.key === 'Escape') setSidebarEditingProjId(null);
                          }}
                          onBlur={() => handleCommitSidebarProjectName(proj.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full bg-transparent outline-none border-b border-blue-500 text-xs ${isDark ? 'text-white' : 'text-zinc-900'}`}
                        />
                      ) : (
                        <div className="flex items-center gap-2 truncate flex-1">
                          <span>📁</span>
                          <span className="truncate">{proj.name}</span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ml-1">
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
                })}
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
    </aside>
  );
}