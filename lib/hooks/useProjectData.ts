'use client';

import { useState, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Project } from '../types';
import { supabase } from '../supabase/client';
import { duplicateCardsForProject, deleteAllCardsByProject } from '../supabase/cards';
import { initialFrameworkData } from '../framework';

type FrameworkData = typeof initialFrameworkData;
type FormDataMap = Record<string, Record<string, Record<string, string>>>;

// 프로젝트 이름 수정 오류 메시지 포맷 (중복 이름은 사용자 친화적 메시지로 표시)
const formatProjectNameError = (error: any) => {
  if (error?.code === '23505') {
    // unique_user_project_name 등 중복 키 위반 → 사용자에게 명확한 안내
    return '이미 존재하는 프로젝트 이름입니다. 다른 이름을 입력해 주세요.';
  }
  return `프로젝트 이름을 수정하지 못했습니다.\n${error?.message || '오류가 발생했습니다.'}`;
};

interface UseProjectDataParams {
  canEdit: boolean;
  // 복제/삭제 시 함께 정리해야 하는 다른 도메인 상태
  formData: FormDataMap;
  setFormData: Dispatch<SetStateAction<FormDataMap>>;
  frameworkDataPerProject: Record<string, FrameworkData>;
  setFrameworkDataPerProject: Dispatch<SetStateAction<Record<string, FrameworkData>>>;
  // 프로젝트 추가 폼 UI 상태
  newProjName: string;
  setNewProjName: Dispatch<SetStateAction<string>>;
  setIsAddingProject: Dispatch<SetStateAction<boolean>>;
  // 사이드바 이름 수정 UI 상태
  sidebarEditingProjId: string | null;
  setSidebarEditingProjId: Dispatch<SetStateAction<string | null>>;
  sidebarTempName: string;
  setSidebarTempName: Dispatch<SetStateAction<string>>;
  // 헤더 이름 수정 UI 상태
  headerEditingProjId: string | null;
  setHeaderEditingProjId: Dispatch<SetStateAction<string | null>>;
  headerTempName: string;
  setHeaderTempName: Dispatch<SetStateAction<string>>;
}

// 프로젝트(projects) 상태와 CRUD/이름 수정/드래그 재정렬 로직을 담당하는 커스텀 훅
export function useProjectData({
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
}: UseProjectDataParams) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  // 이름 수정 중복 실행(Lock) 방지용 refs
  // - SaveRef: 저장/에러 처리 진행 중 재진입 차단
  const handleEditSaveRef = useRef(false);   // handleEditProject 용
  const sidebarSaveRef = useRef(false);      // handleCommitSidebarProjectName 용
  const headerSaveRef = useRef(false);       // handleCommitHeaderProjectName 용

  const loadProjects = async (userId: string) => {
    setIsProjectsLoading(true);

    console.log('Loading projects for user:', userId);

    // 프로젝트만 먼저 가져오기
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, created_by, created_at, folder_id')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('프로젝트 불러오기 실패:', error);
      alert(`프로젝트를 불러오지 못했습니다.\n${error.message}`);
      setProjects([]);
      setActiveProjectId(null);
      setIsProjectsLoading(false);
      return;
    }

    const loadedProjects = (data || []) as Project[];
    console.log('Loaded projects:', loadedProjects);

    // 각 프로젝트에 대한 사용자 권한 확인 (이제 RLS 정책으로 자신의 멤버십 확인 가능)
    const projectsWithRoles = await Promise.all(
      loadedProjects.map(async (project) => {
        console.log('Checking role for project:', project.id, 'user:', userId);
        const { data: memberData, error: memberError } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', project.id)
          .eq('user_id', userId)
          .maybeSingle(); // single 대신 maybeSingle 사용

        console.log('Member data for project', project.id, ':', memberData, 'error:', memberError);

        return {
          ...project,
          userRole: memberData?.role || null
        };
      })
    );

    console.log('Projects with roles:', projectsWithRoles);
    setProjects(projectsWithRoles);

    // Initialize frameworkData for any new projects
    setFrameworkDataPerProject(prev => {
      const updated = { ...prev };
      projectsWithRoles.forEach(project => {
        if (!updated[project.id]) {
          updated[project.id] = JSON.parse(JSON.stringify(initialFrameworkData));
        }
      });
      return updated;
    });

    if (projectsWithRoles.length > 0) {
      setActiveProjectId(prev =>
        prev && projectsWithRoles.some(project => project.id === prev)
          ? prev
          : projectsWithRoles[0].id
      );
    } else {
      setActiveProjectId(null);
    }

    setIsProjectsLoading(false);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();

    const projectName = newProjName.trim();
    if (!projectName) return;

    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      alert(`로그인 정보를 확인하지 못했습니다.\n${userError?.message || '로그인이 필요합니다.'}`);
      return;
    }

    const { data: projectData, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        created_by: currentUser.id,
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        // unique_user_project_name 등 중복 키 위반 → 사용자 친화적 메시지
        alert('이미 존재하는 프로젝트 이름입니다. 다른 이름을 입력해 주세요.');
      } else {
        alert(`프로젝트를 만들지 못했습니다.\n${insertError.message}`);
      }
      return;
    }

    // Add creator as owner to project_members
    if (projectData?.id) {
      // DB 트리거가 owner 행을 자동 생성하므로, 중복 insert(23505) 방지를 위해
      // upsert + ignoreDuplicates 사용 (이미 존재하면 무시, 없을 때만 삽입)
      // project_members.email은 NOT NULL → 세션 유저 이메일을 함께 전송
      let userEmail: string | null = currentUser.email ?? null;
      if (!userEmail) {
        // email 정보가 없으면 세션에서 다시 조회하여 반영
        const refreshResult = await supabase.auth.getUser();
        userEmail = refreshResult.data.user?.email || null;
      }

      const { error: memberError } = await supabase
        .from('project_members')
        .upsert(
          {
            project_id: projectData.id,
            user_id: currentUser.id,
            role: 'owner',
            email: userEmail
          },
          { onConflict: 'project_id,user_id', ignoreDuplicates: true }
        );

      if (memberError) {
        console.error('Failed to add owner to project_members:', JSON.stringify(memberError));
        // Don't alert immediately - this might be a temporary RLS issue
        // The project was created successfully, let the user continue
        console.warn('Project created but owner assignment failed. email:', userEmail, 'Details:', JSON.stringify(memberError));
      }
    }

    setNewProjName('');
    setIsAddingProject(false);
    await loadProjects(currentUser.id);
  };

  const handleEditProject = async (projId: string, newName: string) => {
    // Lock: 저장/에러 처리 진행 중이면 중복 실행 차단
    if (handleEditSaveRef.current) return;

    handleEditSaveRef.current = true;
    try {
      if (!canEdit) {
        alert('편집 권한이 없습니다.');
        return;
      }

      const { error } = await supabase
        .from('projects')
        .update({ name: newName })
        .eq('id', projId);

      if (error) {
        alert(formatProjectNameError(error));
        return;
      }

      setProjects(prev => prev.map(p => p.id === projId ? { ...p, name: newName } : p));
    } finally {
      handleEditSaveRef.current = false;
    }
  };

  const handleDuplicateProject = async (proj: Project) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      console.error('Failed to get current user for project duplication.');
      alert('로그인 정보를 확인하지 못해 프로젝트를 복제할 수 없습니다.');
      return;
    }

    const newName = `${proj.name} (복제됨)`;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: newName,
        created_by: currentUser.id,
      })
      .select('id, name, created_by, created_at')
      .single();

    if (error) {
      alert(`프로젝트를 복제하지 못했습니다.\n${error.message}`);
      return;
    }

    const newProject = data as Project;
    const targetFormData = formData[proj.id] || {};
    const targetFrameworkData = frameworkDataPerProject[proj.id] || initialFrameworkData;

    // Add creator as owner to project_members for the duplicated project
    if (newProject.id && currentUser.id) {
      // project_members.email은 NOT NULL → 세션 유저 이메일을 함께 전송
      let userEmail: string | null = currentUser.email ?? null;
      if (!userEmail) {
        // email 정보가 없으면 세션에서 다시 조회하여 반영
        const refreshResult = await supabase.auth.getUser();
        userEmail = refreshResult.data.user?.email || null;
      }

      const { error: memberError } = await supabase
        .from('project_members')
        .upsert(
          {
            project_id: newProject.id,
            user_id: currentUser.id,
            role: 'owner',
            email: userEmail
          },
          { onConflict: 'project_id,user_id', ignoreDuplicates: true }
        );

      if (memberError) {
        console.error('Failed to add owner to project_members for duplicated project:', JSON.stringify(memberError));
        // The duplicated project's RLS access is driven by project_members,
        // so a failed owner insert means the project may not be accessible.
        // Don't alert immediately - this might be a temporary RLS issue.
        console.warn('Project duplicated but owner assignment failed. The duplicated project may not be accessible via RLS. Details:', JSON.stringify(memberError));
      }
    } else {
      console.error('Missing project id or user id for owner assignment. project_id:', newProject?.id, 'user_id:', currentUser?.id);
    }

    // Duplicate cards in database
    const duplicateSuccess = await duplicateCardsForProject(proj.id, newProject.id);
    if (!duplicateSuccess) {
      alert(`카드 복제에 실패했습니다. 프로젝트는 생성되었으나 카드 데이터가 없을 수 있습니다.`);
    }

    setFormData(prev => ({
      ...prev,
      [newProject.id]: JSON.parse(JSON.stringify(targetFormData))
    }));

    setFrameworkDataPerProject(prev => ({
      ...prev,
      [newProject.id]: JSON.parse(JSON.stringify(targetFrameworkData))
    }));

    // 복제 생성자는 owner이므로 일반 생성 프로젝트와 동일하게 userRole 부여
    // (loadProjects를 거치지 않고 state에 직접 추가하므로 권한 매핑이 필요)
    setProjects(prev => [...prev, { ...newProject, userRole: 'owner' }]);
    setActiveProjectId(newProject.id);
  };

  const handleDeleteProject = async (projId: string) => {
    if (projects.length <= 1) {
      alert('마지막 프로젝트는 삭제할 수 없습니다.');
      return;
    }

    // Delete all cards for this project from database
    await deleteAllCardsByProject(projId);

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projId);

    if (error) {
      alert(`프로젝트를 삭제하지 못했습니다.\n${error.message}`);
      return;
    }

    const filtered = projects.filter(p => p.id !== projId);
    setProjects(filtered);

    // Clean up formData and frameworkDataPerProject for deleted project
    setFormData(prev => {
      const updated = { ...prev };
      delete updated[projId];
      return updated;
    });

    setFrameworkDataPerProject(prev => {
      const updated = { ...prev };
      delete updated[projId];
      return updated;
    });

    if (activeProjectId === projId) {
      setActiveProjectId(filtered[0]?.id ?? null);
    }
  };

  const handleCommitSidebarProjectName = async (projId: string) => {
    // Lock: 저장/에러 처리 진행 중이면 중복 실행 차단
    if (sidebarSaveRef.current) return;
    // 이미 편집 모드를 벗어났으면 재실행 방지
    if (sidebarEditingProjId !== projId) return;

    sidebarSaveRef.current = true;
    try {
      // 이름이 비어 있으면 편집 종료
      if (!sidebarTempName.trim()) {
        setSidebarEditingProjId(null);
        return;
      }

      const projectName = sidebarTempName.trim();

      // 이름이 변경되지 않았으면 편집 종료 (blur만 누를 때 재커밋 방지)
      const currentProject = projects.find(p => p.id === projId);
      if (currentProject && currentProject.name === projectName) {
        setSidebarEditingProjId(null);
        return;
      }

      // 권한 체크
      const project = projects.find(p => p.id === projId);
      if (!canEdit || (project?.userRole !== 'owner' && project?.userRole !== 'admin')) {
        alert('프로젝트 이름을 수정할 권한이 없습니다.');
        setSidebarEditingProjId(null);
        return;
      }

      const { error } = await supabase
        .from('projects')
        .update({ name: projectName })
        .eq('id', projId);

      if (error) {
        alert(formatProjectNameError(error));
        setSidebarEditingProjId(null);
        return;
      }

      setProjects(prev => prev.map(p => p.id === projId ? { ...p, name: projectName } : p));
      setSidebarEditingProjId(null);
    } finally {
      sidebarSaveRef.current = false;
    }
  };

  const handleCommitHeaderProjectName = async (projId: string) => {
    // Lock: 저장/에러 처리 진행 중이면 중복 실행 차단
    if (headerSaveRef.current) return;
    // 이미 편집 모드를 벗어났으면 재실행 방지
    if (headerEditingProjId !== projId) return;

    headerSaveRef.current = true;
    try {
      // 이름이 비어 있으면 편집 종료
      if (!headerTempName.trim()) {
        setHeaderEditingProjId(null);
        return;
      }

      const projectName = headerTempName.trim();

      // 이름이 변경되지 않았으면 편집 종료 (blur만 누를 때 재커밋 방지)
      const currentProject = projects.find(p => p.id === projId);
      if (currentProject && currentProject.name === projectName) {
        setHeaderEditingProjId(null);
        return;
      }

      // 권한 체크
      const project = projects.find(p => p.id === projId);
      if (!canEdit || (project?.userRole !== 'owner' && project?.userRole !== 'admin')) {
        alert('프로젝트 이름을 수정할 권한이 없습니다.');
        setHeaderEditingProjId(null);
        return;
      }

      const { error } = await supabase
        .from('projects')
        .update({ name: projectName })
        .eq('id', projId);

      if (error) {
        alert(formatProjectNameError(error));
        setHeaderEditingProjId(null);
        return;
      }

      setProjects(prev => prev.map(p => p.id === projId ? { ...p, name: projectName } : p));
      setHeaderEditingProjId(null);
    } finally {
      headerSaveRef.current = false;
    }
  };

  const handleProjectDragStart = (e: React.DragEvent, projId: string) => {
    setDraggedProjectId(projId);
    e.dataTransfer.setData('text/plain', `proj_${projId}`);
  };

  const handleProjectDrop = (e: React.DragEvent, targetProjId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedProjectId === null || draggedProjectId === targetProjId) return;

    const projList = [...projects];
    const draggedIdx = projList.findIndex(p => p.id === draggedProjectId);
    const targetIdx = projList.findIndex(p => p.id === targetProjId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [moved] = projList.splice(draggedIdx, 1);
      projList.splice(targetIdx, 0, moved);
      setProjects(projList);
    }
    setDraggedProjectId(null);
  };

  return {
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
    handleEditProject,
    handleDuplicateProject,
    handleDeleteProject,
    handleCommitSidebarProjectName,
    handleCommitHeaderProjectName,
    handleProjectDragStart,
    handleProjectDrop,
  };
}
