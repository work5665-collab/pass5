'use client';

import { useState, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Folder, Project, ViewMode } from '../types';
import { supabase } from '../supabase/client';
import { fetchFolders, createFolder, updateFolder, deleteFolder, assignProjectToFolder } from '../supabase/folders';

interface UseFolderDataParams {
  user: any;
  activeFolderId: string | null;
  setActiveFolderId: Dispatch<SetStateAction<string | null>>;
  navigateTo: (mode: ViewMode, options?: { folderId?: string }) => void;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  draggedProjectId: string | null;
  setDraggedProjectId: Dispatch<SetStateAction<string | null>>;
}

// 폴더 상태 및 CRUD/드래그 배정/펼치기 로직을 담당하는 커스텀 훅
export function useFolderData({
  user,
  activeFolderId,
  setActiveFolderId,
  navigateTo,
  setViewMode,
  projects,
  setProjects,
  draggedProjectId,
  setDraggedProjectId,
}: UseFolderDataParams) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [addingChildToFolderId, setAddingChildToFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderTempName, setFolderTempName] = useState('');

  // 이름 수정 중복 실행(Lock) 방지용 ref
  const folderRenameSaveRef = useRef(false);

  // 폴더 데이터 로딩
  useEffect(() => {
    if (!user) {
      setFolders([]);
      setActiveFolderId(null);
      return;
    }
    (async () => {
      const loadedFolders = await fetchFolders();
      setFolders(loadedFolders);
      setExpandedFolderIds(new Set(loadedFolders.filter(f => !f.parent_id).map(f => f.id)));
    })();
  }, [user]);

  const handleToggleFolderExpanded = (folderId: string) => {
    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const openFolder = (folderId: string) => {
    setActiveFolderId(folderId);
    navigateTo('folder', { folderId });
  };

  const handleAddFolder = async (parentId: string | null) => {
    const folderName = newFolderName.trim();
    if (!folderName) return;

    // 2단계 제한 검증: 부모가 이미 2단계(자기 자신이 하위)면 3단계 생성 차단
    if (parentId) {
      const parent = folders.find(f => f.id === parentId);
      if (parent?.parent_id) {
        alert('프로젝트 탐색 속도와 작업 효율성을 위해 폴더는 최대 2단계까지만 생성할 수 있습니다.');
        return;
      }
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      alert('로그인 정보를 확인하지 못했습니다.');
      return;
    }

    const newFolder = await createFolder(folderName, parentId, currentUser.id);
    if (!newFolder) {
      alert('폴더를 만들지 못했습니다.');
      return;
    }

    setFolders(prev => [...prev, newFolder]);
    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      next.add(newFolder.id);
      if (parentId) next.add(parentId);
      return next;
    });
    setNewFolderName('');
    setIsAddingFolder(false);
    setAddingChildToFolderId(null);
  };

  const handleRenameFolder = async (folderId: string) => {
    // Lock: 저장/에러 처리 진행 중이면 중복 실행 차단
    if (folderRenameSaveRef.current) return;
    if (editingFolderId !== folderId) return;

    folderRenameSaveRef.current = true;
    try {
      const folderName = folderTempName.trim();
      if (!folderName) {
        setEditingFolderId(null);
        return;
      }

      const currentFolder = folders.find(f => f.id === folderId);
      if (currentFolder && currentFolder.name === folderName) {
        setEditingFolderId(null);
        setFolderTempName('');
        return;
      }

      const success = await updateFolder(folderId, folderName);
      if (!success) {
        alert('폴더 이름을 수정하지 못했습니다.');
        setEditingFolderId(null);
        return;
      }
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: folderName } : f));
      setEditingFolderId(null);
      setFolderTempName('');
    } finally {
      folderRenameSaveRef.current = false;
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const childFolderIds = folders.filter(f => f.parent_id === folderId).map(f => f.id);
    const affectedFolderIds = [folderId, ...childFolderIds];

    // 소속 프로젝트는 미분류로 이동
    await Promise.all(
      projects
        .filter(p => p.folder_id && affectedFolderIds.includes(p.folder_id))
        .map(p => assignProjectToFolder(p.id, null))
    );

    await Promise.all(affectedFolderIds.map(id => deleteFolder(id)));

    setFolders(prev => prev.filter(f => !affectedFolderIds.includes(f.id)));
    setProjects(prev => prev.map(p =>
      p.folder_id && affectedFolderIds.includes(p.folder_id) ? { ...p, folder_id: null } : p
    ));

    if (activeFolderId && affectedFolderIds.includes(activeFolderId)) {
      setActiveFolderId(null);
      setViewMode('kanban');
    }
    if (editingFolderId === folderId) setEditingFolderId(null);
  };

  const handleDropOnFolder = async (folderId: string | null) => {
    if (!draggedProjectId) return;
    const proj = projects.find(p => p.id === draggedProjectId);
    setDraggedProjectId(null);
    if (!proj || proj.folder_id === folderId) return;

    const success = await assignProjectToFolder(proj.id, folderId);
    if (success) {
      setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, folder_id: folderId } : p));
    } else {
      alert('프로젝트를 폴더로 이동하지 못했습니다.');
    }
  };

  return {
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
  };
}
