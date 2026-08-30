import React from 'react';
import { Project, LangMode } from '../types';

interface SidebarProps {
  projects: Project[];
  activeProject: Project;
  setActiveProject: (p: Project) => void;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  lang: LangMode;
  setLang: (l: LangMode) => void;
  handleCreateProject: () => void;
  handleDeleteProject: (id: string) => void;
  editingProjId: string | null;
  setEditingProjId: (id: string | null) => void;
  tempProjName: string;
  setTempProjName: (name: string) => void;
  handleCommitProjectName: (id: string) => void;
  t: any;
}

export default function Sidebar({
  projects,
  activeProject,
  setActiveProject,
  isDark,
  setIsDark,
  lang,
  setLang,
  handleCreateProject,
  handleDeleteProject,
  editingProjId,
  setEditingProjId,
  tempProjName,
  setTempProjName,
  handleCommitProjectName,
  t
}: SidebarProps) {
  return (
    <aside className={`w-72 border-r flex flex-col justify-between p-5 transition ${isDark ? 'bg-[#121214] border-zinc-800/80 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-md">P5</div>
            <span className="font-extrabold text-sm tracking-tight">PASS 5 Framework</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-bold opacity-50 uppercase tracking-wider">Projects</span>
            <button
              onClick={handleCreateProject}
              className="text-[11px] font-semibold text-blue-500 hover:text-blue-400 transition"
            >
              + 새 프로젝트
            </button>
          </div>

          <div className="flex flex-col gap-1 max-h-[350px] overflow-y-auto pr-1">
            {projects.map((proj) => {
              const isActive = activeProject.id === proj.id;
              const isEditing = editingProjId === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    if (!isEditing) setActiveProject(proj);
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : (isDark ? 'hover:bg-zinc-800/60 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700')
                  }`}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={tempProjName}
                      onChange={(e) => setTempProjName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitProjectName(proj.id);
                        if (e.key === 'Escape') setEditingProjId(null);
                      }}
                      onBlur={() => handleCommitProjectName(proj.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-transparent border-b border-white outline-none text-white font-bold"
                    />
                  ) : (
                    <>
                      <span className="truncate flex-1">{proj.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProjId(proj.id);
                            setTempProjName(proj.name);
                          }}
                          className={`p-1 rounded transition ${isActive ? 'hover:bg-blue-500 text-white' : 'hover:bg-zinc-700 text-zinc-400'}`}
                          title="이름 수정"
                        >
                          ✏️
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`"${proj.name}" 프로젝트를 삭제하시겠습니까?`)) {
                                handleDeleteProject(proj.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition"
                            title="삭제"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-500/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
          >
            <span>{isDark ? '🌙 다크 모드' : '☀️ 라이트 모드'}</span>
          </button>
        </div>

        <div className="flex bg-zinc-500/10 p-1 rounded-lg">
          <button
            onClick={() => setLang('ko')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${lang === 'ko' ? 'bg-blue-600 text-white shadow-xs' : 'opacity-60 hover:opacity-100'}`}
          >
            KO
          </button>
          <button
            onClick={() => setLang('en')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${lang === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'opacity-60 hover:opacity-100'}`}
          >
            EN
          </button>
        </div>
      </div>
    </aside>
  );
}