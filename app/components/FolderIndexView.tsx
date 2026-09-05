'use client';

import React from 'react';
import { Folder, Project, DictType, ViewMode } from '../../lib/types';
import type { ShareTarget } from './ShareModal';
import ViewScaffold from './ViewScaffold';

interface FolderIndexViewProps {
  folders: Folder[];
  projects: Project[];
  activeFolderId: string | null;
  isDark: boolean;
  t: DictType;
  navigateTo: (mode: ViewMode, options?: any) => void;
  openFolder: (folderId: string) => void;
  handleGoBack: () => void;
  setActiveProjectId: (id: string) => void;
  onShareFolder?: (target: ShareTarget) => void;
}

export default function FolderIndexView({
  folders,
  projects,
  activeFolderId,
  isDark,
  t,
  navigateTo,
  openFolder,
  handleGoBack,
  setActiveProjectId,
  onShareFolder,
}: FolderIndexViewProps) {
  const folder = folders.find(f => f.id === activeFolderId);

  if (!folder) {
    return (
      <ViewScaffold className="pb-12">
        <div className="text-xs opacity-60">폴더를 선택해주세요.</div>
      </ViewScaffold>
    );
  }

  const subfolders = folders.filter(f => f.parent_id === folder.id);
  const folderProjects = projects.filter(p => p.folder_id === folder.id);

  const cardCls = (hover: boolean) =>
    `p-5 rounded-2xl border transition cursor-pointer ${
      isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
    } ${hover ? (isDark ? 'hover:bg-zinc-800/60 hover:border-zinc-600' : 'hover:bg-zinc-50 hover:border-zinc-300') : ''}`;

  return (
    <ViewScaffold
      className="gap-6 pb-12"
      subBar={(
        <div className="w-full h-full flex justify-between items-center gap-3 px-3 bg-zinc-500/10 rounded-xl text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className={`font-semibold px-2.5 py-1 rounded-lg transition ${isDark ? 'text-zinc-300 hover:text-white bg-zinc-700/50' : 'text-zinc-700 hover:text-zinc-900 bg-zinc-200'}`}
          >
            {t.back}
          </button>
          <button
            onClick={() => navigateTo('kanban')}
            className="font-semibold text-blue-400 hover:underline"
          >
            {t.kanbanView}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 font-bold">
            {folderProjects.length} {t.projects}
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
            {subfolders.length} {t.subfolders}
          </span>
        </div>
      </div>
      )}
    >

      {/* 폴더 제목 */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Folder Index</span>
          <h2 className="text-xl font-black mt-0.5">📁 {folder.name}</h2>
        </div>
        {onShareFolder && (
          <button
            onClick={() => onShareFolder({ type: 'folder', id: folder.id, name: folder.name })}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
              isDark ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'
            }`}
          >
            공유
          </button>
        )}
      </div>

      {/* 하위 폴더 목록 */}
      <div>
        <div className="text-xs font-bold opacity-60 uppercase tracking-wider mb-3">📂 {t.subfolders}</div>
        {subfolders.length === 0 ? (
          <div className="text-xs opacity-50 italic">{t.folderEmpty}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subfolders.map(sub => {
              const subProjects = projects.filter(p => p.folder_id === sub.id);
              return (
                <div key={sub.id} className="relative group">
                  <button
                    onClick={() => openFolder(sub.id)}
                    className={`${cardCls(true)} w-full`}
                  >
                    <div className="text-sm font-bold truncate">📁 {sub.name}</div>
                    <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {subProjects.length} {t.projects}
                    </div>
                  </button>
                  {onShareFolder && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareFolder({ type: 'folder', id: sub.id, name: sub.name });
                      }}
                      className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition ${
                        isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      공유
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 속한 프로젝트 카드 */}
      <div>
        <div className="text-xs font-bold opacity-60 uppercase tracking-wider mb-3">🗂️ {t.projects}</div>
        {folderProjects.length === 0 ? (
          <div className="text-xs opacity-50 italic">이 폴더에 속한 프로젝트가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {folderProjects.map(proj => (
              <button
                key={proj.id}
                onClick={() => {
                  setActiveProjectId(proj.id);
                  navigateTo('kanban');
                }}
                className={cardCls(true)}
              >
                <div className="text-sm font-bold truncate">🗂️ {proj.name}</div>
                <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>→ {t.kanbanView}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </ViewScaffold>
  );
}