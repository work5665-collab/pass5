'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import InviteModal from './components/InviteModal';
import ProjectSidebar from './components/ProjectSidebar';
import KanbanBoard from '../components/KanbanBoard';
import { ViewMode, LangMode, DictType, Project } from '../lib/types';
import { 
  fetchCardsByProject, 
  createCard, 
  updateCard, 
  deleteCard, 
  updateCardStep,
  duplicateCardsForProject,
  deleteAllCardsByProject
} from '../lib/supabase/cards';

// Supabase 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// PASS 5 단계별 카드 및 세부 점검 필드 기본 데이터 (의사결정 중심 질문형 구성)
const initialFrameworkData = [
  {
    stepKey: 'Input',
    title: 'Input',
    subtitle: '프로젝트의 방향성을 잡는 단계',
    cards: [
      {
        id: 'purpose_and_problem',
        title: '목적과 문제 정의',
        desc: '이 프로젝트를 왜 시작하며 어떤 문제를 해결하려 하는가?',
        fields: [
          {
            id: 'in_p_why',
            label: '1-1. 프로젝트를 시작하는 근본적인 이유와 배경',
            options: [
              '파편화된 업무 프로세스의 일원화 및 효율성 극대화',
              '수동 반복 업무 자동화를 통한 시간 및 자원 절감',
              '직관적이지 않은 워크플로우의 객관적 표준화 구축'
            ]
          },
          {
            id: 'in_p_problem',
            label: '1-2. 해결하고자 하는 핵심 문제 및 페인 포인트',
            options: [
              '부서 간 커뮤니케이션 오류 및 산출물 누락 발생',
              '반복적인 수작업으로 인한 리소스 낭비와 피로도 누적',
              '모호한 의사결정 기준과 주관적 판단으로 인한 지연'
            ]
          }
        ]
      },
      {
        id: 'target_analysis',
        title: '타깃 분석',
        desc: '누구를 위한 것이며 그들이 겪는 핵심 불편함은 무엇인가?',
        fields: [
          {
            id: 'in_t_who',
            label: '2-1. 주요 수혜자 및 실무 타깃 오디언스',
            options: [
              '프로젝트 기획 및 워크플로우 관리자 (PM/PL)',
              '실무 프로덕트 메이커 및 1인 개발자 (인디 해커)',
              '전사 조직 구성원 및 협업 실무진'
            ]
          },
          {
            id: 'in_t_pain',
            label: '2-2. 타깃이 체감하는 가장 큰 불편함',
            options: [
              '복잡하고 진입장벽이 높은 기존 협업 도구',
              '데이터와 피드백이 한곳에 모이지 않는 파편화 환경',
              '가시성이 부족한 진척도와 모호한 책임 소재'
            ]
          }
        ]
      },
      {
        id: 'value_and_kpi',
        title: '가치와 성공 기준',
        desc: '이 프로젝트가 끝나면 무엇이 좋아지며 성공 여부는 무엇으로 판단하는가?',
        fields: [
          {
            id: 'in_v_change',
            label: '3-1. 프로젝트 완료 후 기대되는 결정적 변화',
            options: [
              '가볍고 유연한 오픈소스 기반 실시간 워크플로우 정착',
              '주관적 판단을 배제한 객관적 지표 중심의 자동화',
              '투명한 진척도 공유로 팀 협업 피로도 대폭 감소'
            ]
          },
          {
            id: 'in_v_criteria',
            label: '3-2. 성공 여부를 판단하는 핵심 기준(KPI)',
            options: [
              '주간 반복 업무 소요 시간 50% 이상 단축',
              '프로젝트 산출물 문서화 누락률 0% 달성',
              '목표 마감일 내 MVP 개발 및 실무 배포 완료'
            ]
          }
        ]
      }
    ]
  },
  {
    stepKey: 'Setup',
    title: 'Setup',
    subtitle: '실행 조건을 설계하는 단계',
    cards: [
      {
        id: 'schedule_milestone',
        title: '일정 및 마일스톤',
        desc: '최종 마감은 언제이며 반드시 지켜야 할 주요 기점은 어디인가?',
        fields: [
          {
            id: 'su_s_deadline',
            label: '1-1. 프로젝트 최종 마감일 및 목표 일정',
            options: [
              '2주 내 MVP 개발 완료 및 Vercel 실무 배포',
              '1개월 집중 스프린트 후 정식 런칭',
              '상시 개선 형태의 애자일 마일스톤 운영'
            ]
          },
          {
            id: 'su_s_checkpoint',
            label: '1-2. 반드시 지켜야 할 주요 중간 기점(Milestone)',
            options: [
              'D+3일차: 코어 데이터 구조 및 레이아웃 완성',
              'D+7일차: 핵심 기능 연동 및 내부 테스트 완료',
              'D+14일차: 최종 검수 및 배포 완료'
            ]
          }
        ]
      },
      {
        id: 'resources_budget',
        title: '자원 및 예산',
        desc: '투입할 수 있는 예산, 인력, 장비는 각각 얼마인가?',
        fields: [
          {
            id: 'su_r_budget',
            label: '2-1. 가용 예산 및 비용 제약 조건',
            options: [
              '추가 비용 발생 없는 오픈소스 및 무료 티어 활용',
              '최소 실비 중심의 합리적 인프라 예산 편성',
              '별도 유료 솔루션 도입 예산 확보 완료'
            ]
          },
          {
            id: 'su_r_team',
            label: '2-2. 투입 가능 인력 및 기술 장비',
            options: [
              '1인 풀스택 개발 및 기획 단기 집중 체제',
              '기획, 개발, 검수 파트별 소규모 협업 인력',
              '클라우드 기반 협업 장비 및 툴 세팅 완료'
            ]
          }
        ]
      },
      {
        id: 'roles_and_responsibility',
        title: '역할과 책임 (R&R)',
        desc: '누가 무엇을 최종 책임지며 의사결정권자는 누구인가?',
        fields: [
          {
            id: 'su_rn_owner',
            label: '3-1. 최종 책임자(Project Owner) 및 의사결정권자',
            options: [
              '1인 메이커가 기획부터 실행까지 전 과정 총괄',
              '프로젝트 리드(PM)가 최종 승인 및 조율 담당',
              '이해관계자 합의를 통한 공동 의사결정 체제'
            ]
          },
          {
            id: 'su_rn_task',
            label: '3-2. 세부 파트별 실무 담당 분담',
            options: [
              '아키텍처 설계 및 프론트엔드 구현 전담',
              '데이터 구조화 및 콘텐츠 아카이빙 전담',
              '품질 검수 및 피드백 수렴 전담'
            ]
          }
        ]
      }
    ]
  },
  {
    stepKey: 'Processing',
    title: 'Processing',
    subtitle: '실제 실행 및 모니터링 단계',
    cards: [
      {
        id: 'core_tasks_wbs',
        title: '핵심 작업 (WBS)',
        desc: '목표를 달성하기 위해 어떤 순서로 일을 진행할 것인가?',
        fields: [
          {
            id: 'pr_w_order',
            label: '1-1. 단계별 실행 순서 및 핵심 태스크 정의',
            options: [
              '코어 데이터 스키마 정의 ➔ UI 컴포넌트 구현 ➔ 연동 테스트',
              '요구사항 정의 ➔ 프로토타입 제작 ➔ 피드백 반영 ➔ 배포',
              '백로그 작성 ➔ 우선순위 선정 ➔ 스프린트 실행'
            ]
          },
          {
            id: 'pr_w_planb',
            label: '1-2. 일정 지연 및 이슈 발생 시 대응 플랜 (Plan B)',
            options: [
              '핵심 파이프라인 사수를 위해 부가 기능 과감히 홀드',
              '유저 피드백 즉시 수렴 후 핫픽스 스프린트 즉각 가동',
              '모듈화 분할 재작업을 통한 복잡도 분산 처리'
            ]
          }
        ]
      },
      {
        id: 'quality_criteria',
        title: '품질 및 완료 기준',
        desc: '결과물이 제대로 나왔는지 무엇을 기준으로 검수할 것인가?',
        fields: [
          {
            id: 'pr_q_check',
            label: '2-1. 결과물 검수 및 품질 통과 기준',
            options: [
              '모든 세부 입력 항목 정합성 100% 충족 여부',
              '초기 설정한 정량적 KPI 지표 달성 가능성 확인',
              '실무 환경에서 에러 없이 원활히 구동되는지 테스트'
            ]
          }
        ]
      },
      {
        id: 'communication_change',
        title: '소통 및 변경 관리',
        desc: '진행 상황은 어떻게 공유하고 스펙 바뀔 때 대응할 것인가?',
        fields: [
          {
            id: 'pr_c_sync',
            label: '3-1. 진행 상황 공유 및 싱크 주간 루틴',
            options: [
              '깃허브 커밋 및 칸반 보드를 통한 실시간 진척도 공유',
              '주간 단위 회고 및 스프린트 싱크 미팅 진행',
              '이슈 발생 즉시 슬랙/메신저 채널을 통한 실시간 알림'
            ]
          },
          {
            id: 'pr_c_shift',
            label: '3-2. 요구사항 및 스펙 변경 시 대응 프로세스',
            options: [
              '변경 사유 타당성 검토 후 백로그 우선순위 재조정',
              '프로젝트 마감일에 미치는 영향도 분석 후 승인',
              '긴급 스펙 변경 시 별도 브랜치 분리 후 독립 처리'
            ]
          }
        ]
      }
    ]
  },
  {
    stepKey: 'Review',
    title: 'Review',
    subtitle: '결과를 검증하고 되돌아보는 단계',
    cards: [
      {
        id: 'requirement_check',
        title: '요구사항 충족 여부',
        desc: '처음 기획했던 핵심 목적과 필수 조건들이 제대로 반영되었는가?',
        fields: [
          {
            id: 're_req_match',
            label: '1-1. 초기 Input 목적 및 필수 조건 반영도 검증',
            options: [
              '초기 기획한 모든 핵심 Pain Point 해결 여부 검토 완료',
              '타깃 오디언스 니즈가 실제 산출물에 완벽히 녹아들었는지 확인',
              '필수 요구사항 대비 누락되거나 변질된 항목 점검'
            ]
          }
        ]
      },
      {
        id: 'performance_evaluation',
        title: '성과 평가',
        desc: '정량적·정성적 목표 대비 실제 결과는 어떠한가?',
        fields: [
          {
            id: 're_pe_score',
            label: '2-1. 정량적·정성적 목표 달성도 평가',
            options: [
              '목표한 KPI 수치(시간 단축, 문서화 등) 초과 달성',
              '기대했던 정성적 만족도 및 업무 피로도 개선 효과 확인',
              '예상치 못한 병목 구간 발생으로 인한 성과 일부 조정'
            ]
          }
        ]
      },
      {
        id: 'kpt_retrospective',
        title: 'KPT 회고 (Keep / Problem / Try)',
        desc: '이번에 유지할 점과 겪은 문제, 다음 시도할 점은 무엇인가?',
        fields: [
          {
            id: 're_kpt_content',
            label: '3-1. KPT 관점의 종합 회고 내용 도출',
            options: [
              'Keep: 효율적인 자동화 프로세스와 명확한 문서화 체계 유지',
              'Problem: 초기 일정 산정의 빠듯함과 예외 케이스 처리 지연',
              'Try: 다음 프로젝트에서는 더 유연한 마일스톤 및 자동 동기화 도입'
            ]
          }
        ]
      }
    ]
  },
  {
    stepKey: 'Output',
    title: 'Output',
    subtitle: '프로젝트 완료 및 관리하는 단계',
    cards: [
      {
        id: 'final_delivery',
        title: '최종 산출물 전달',
        desc: '결과물을 어떤 포맷으로 누구에게 전달하고 완료를 확인할 것인가?',
        fields: [
          {
            id: 'ou_f_format',
            label: '1-1. 최종 산출물 포맷 및 전달 대상',
            options: [
              'PASS 5 마스터 스펙 정의서 웹 어플리케이션 최종 렌더링 및 배포',
              '깃허브 소스 코드 및 노션 공식 매뉴얼 문서 인계',
              '이해관계자 대상 결과 보고서 및 아카이빙 링크 공유'
            ]
          }
        ]
      },
      {
        id: 'project_closing',
        title: '프로젝트 클로징',
        desc: '최종 승인과 정산 등 마무리 절차는 어떻게 끝낼 것인가?',
        fields: [
          {
            id: 'ou_cl_signoff',
            label: '2-1. 최종 승인(Sign-off) 및 클로징 절차',
            options: [
              '프로젝트 오너 최종 검수 승인 후 공식 종료 선언',
              '사용된 리소스 및 잔여 예산 최종 정산 마무리',
              '칸반 보드 및 백로그 최종 상태 업데이트 후 락(Lock) 처리'
            ]
          }
        ]
      },
      {
        id: 'knowledge_asset',
        title: '경험 및 지식 아카이빙',
        desc: '다음 프로젝트에서 재사용할 기록과 지식을 남기는 단계',
        fields: [
          {
            id: 'ou_k_archive',
            label: '3-1. 향후 재사용을 위한 아카이빙 및 템플릿화',
            options: [
              '성공적인 워크플로우 템플릿 및 커스텀 옵션 영구 라이브러리화',
              '이번 프로젝트의 트러블슈팅 노하우 문서화 및 공유',
              '다음 스프린트에 곧바로 적용 가능한 베스트 프랙티스 저장'
            ]
          }
        ]
      }
    ]
  }
];

const dict: Record<LangMode, DictType> = {
  KO: {
    workspace: 'PASS 5 WORKSPACE',
    projects: 'Projects',
    focusViews: 'Focus Views',
    addProjectBtn: '+ 추가',
    projPlaceholder: '새 프로젝트 이름...',
    kanbanView: '📋 전체 칸반 뷰',
    reportView: '📑 종합 정의서',
    kanbanGuide: '카드를 드래그하여 단계를 재배치하거나, 의사결정 중심의 질문형 카드를 자유롭게 관리하세요.',
    completed100: '100% 완료됨',
    inProgress: '진행 중 / 미완료',
    focusGo: '집중뷰 ↗',
    editName: '✏️ 이름 수정',
    addCard: '+ 새 카드 추가',
    back: '◀ 뒤로 가기',
    focusModeTitle: 'PASS 5 Focus Mode',
    detailEdit: '개별 수정하기 →',
    progress: '진행도:',
    formStatus: '세부 점검 항목별 입력 현황',
    notEntered: '아직 입력되지 않았습니다.',
    prevCard: '◀ 이전 카드',
    nextCard: '다음 카드 ▶',
    firstCard: '첫 카드',
    lastCard: '마지막 카드',
    selectAll: '전체 선택 ✓',
    deselectAll: '전체 해제 ✕',
    printPdf: '🖨️ 정의서 인쇄 / PDF 저장',
    lightMode: '☀️ 라이트 모드',
    darkMode: '🌙 다크 모드',
    langToggle: '🌐 ENG',
  },
  EN: {
    workspace: 'PASS 5 WORKSPACE',
    projects: 'Projects',
    focusViews: 'Focus Views',
    addProjectBtn: '+ Add',
    projPlaceholder: 'New project name...',
    kanbanView: '📋 Kanban Board',
    reportView: '📑 Master Report',
    kanbanGuide: 'Drag cards to rearrange steps, or freely manage decision-centric question cards.',
    completed100: '100% Completed',
    inProgress: 'In Progress / Pending',
    focusGo: 'Focus ↗',
    editName: '✏️ Edit Name',
    addCard: '+ Add Card',
    back: '◀ Back',
    focusModeTitle: 'PASS 5 Focus Mode',
    detailEdit: 'Edit Details →',
    progress: 'Progress:',
    formStatus: 'Field Input Status',
    notEntered: 'Not entered yet.',
    prevCard: '◀ Prev Card',
    nextCard: 'Next Card ▶',
    firstCard: 'First Card',
    lastCard: 'Last Card',
    selectAll: 'Select All ✓',
    deselectAll: 'Deselect All ✕',
    printPdf: '🖨️ Print / Save PDF',
    lightMode: '☀️ Light Mode',
    darkMode: '🌙 Dark Mode',
    langToggle: '🌐 KOR',
  }
};

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

  const loadProjects = async (userId: string) => {
    setIsProjectsLoading(true);

    console.log('Loading projects for user:', userId);

    // 프로젝트만 먼저 가져오기
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, created_by, created_at')
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

  const loadProjectMembers = async (projectId: string) => {
    try {
      // 현재 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      console.log('Loading project members for:', projectId);
      console.log('Current user ID:', user?.id);

      const response = await fetch(`/api/members?projectId=${projectId}`, {
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

  const loadCardsForProject = async (projectId: string) => {
    try {
      const dbCards = await fetchCardsByProject(projectId);
      
      // Convert DB cards to frameworkData format
      // Merge with initialFrameworkData to keep default cards
      const frameworkDataFromDB: typeof initialFrameworkData = initialFrameworkData.map(step => {
        const stepDbCards = dbCards
          .filter(card => card.step_key === step.stepKey)
          .map(dbCard => ({
            id: dbCard.card_id,
            title: dbCard.title,
            desc: dbCard.description,
            fields: dbCard.fields
          }));

        // If there are DB cards for this step, use them; otherwise use default cards
        if (stepDbCards.length > 0) {
          return {
            ...step,
            cards: stepDbCards
          };
        } else {
          return step; // Keep default cards
        }
      });

      // Update frameworkData with DB data
      setFrameworkData(frameworkDataFromDB);
      
      // Store in frameworkDataPerProject for local state management
      setFrameworkDataPerProject(prev => ({
        ...prev,
        [projectId]: frameworkDataFromDB
      }));
    } catch (error) {
      console.error('Failed to load cards for project:', error);
      // Fallback to initial framework data if DB load fails
      setFrameworkData(initialFrameworkData);
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [projectMembers, setProjectMembers] = useState<any[]>([]); // 프로젝트 멤버 정보
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null); // 현재 사용자 권한
  
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  
  const [sidebarEditingProjId, setSidebarEditingProjId] = useState<string | null>(null);
  const [sidebarTempName, setSidebarTempName] = useState('');

  const [headerEditingProjId, setHeaderEditingProjId] = useState<string | null>(null);
  const [headerTempName, setHeaderTempName] = useState('');

  // 초대 모달 상태
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member'); // admin, member, viewer

  const [frameworkDataPerProject, setFrameworkDataPerProject] = useState<Record<string, typeof initialFrameworkData>>({});
  const [frameworkData, setFrameworkData] = useState(initialFrameworkData);

  // 모든 상태 정의 후 useEffect 훅 배치
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

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tempCardTitle, setTempCardTitle] = useState('');
  const [tempCardDesc, setTempCardDesc] = useState('');

  const [editingStepMetaKey, setEditingStepMetaKey] = useState<string | null>(null);
  const [tempStepTitle, setTempStepTitle] = useState('');
  const [tempStepSubtitle, setTempStepSubtitle] = useState('');

  const [addingCardStepKey, setAddingCardStepKey] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardFields, setNewCardFields] = useState<{ label: string; optionsStr: string }[]>([
    { label: '1-1. 세부 항목 질문 입력', optionsStr: '옵션 1, 옵션 2, 옵션 3' }
  ]);

  const [editingFieldCardId, setEditingFieldCardId] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldOptionsStr, setNewFieldOptionsStr] = useState('');

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [tempFieldLabel, setTempFieldLabel] = useState('');

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerStepKey, setPickerStepKey] = useState<string>('Input');
  const [pickerCardId, setPickerCardId] = useState<string>('');
  const [selectedPickedOptions, setSelectedPickedOptions] = useState<string[]>([]);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');
  const [pickerTargetType, setPickerTargetType] = useState<'newField' | 'newCardField' | 'existingField'>('newField');
  const [pickerTargetFieldIndex, setPickerTargetFieldIndex] = useState<number | null>(null);
  const [pickerTargetFieldId, setPickerTargetFieldId] = useState<string | null>(null);

  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [focusStepKey, setFocusStepKey] = useState<string>('Input');
  const [activeCardId, setActiveCardId] = useState<string>('purpose_and_problem');
  const [historyStack, setHistoryStack] = useState<{ mode: ViewMode; stepKey?: string; cardId?: string }[]>([]);

  const navigateTo = (newMode: ViewMode, options?: { stepKey?: string; cardId?: string }) => {
    setHistoryStack(prev => [...prev, { mode: viewMode, stepKey: focusStepKey, cardId: activeCardId }]);
    setViewMode(newMode);
    if (options?.stepKey) setFocusStepKey(options.stepKey);
    if (options?.cardId) setActiveCardId(options.cardId);
  };

  const handleGoBack = () => {
    if (historyStack.length === 0) {
      setViewMode('kanban');
      return;
    }
    const lastState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
    setViewMode(lastState.mode);
    if (lastState.stepKey) setFocusStepKey(lastState.stepKey);
    if (lastState.cardId) setActiveCardId(lastState.cardId);
  };

  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [fieldModes, setFieldModes] = useState<Record<string, 'SELECT' | 'CUSTOM' | 'EDIT'>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [savePermanently, setSavePermanently] = useState<Record<string, boolean>>({});

  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectKey = activeProjectId ?? '';

  // Helper function to update frameworkData for the current project
  const updateFrameworkData = (updater: (prev: typeof initialFrameworkData) => typeof initialFrameworkData) => {
    setFrameworkData(updater);
    if (activeProjectId) {
      setFrameworkDataPerProject(prev => ({
        ...prev,
        [activeProjectId]: updater(prev[activeProjectId] || initialFrameworkData)
      }));
    }
  };

  // 권한 확인 헬퍼 함수
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'member';
  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const getFieldOptions = (field: any, cardId: string) => {
    const added = customOptions[field.id] || [];
    const projStore = formData[projectKey] || {};
    const cardStore = projStore[cardId] || {};
    const currentVal = cardStore[field.id];

    let baseOptions = [...field.options, ...added];
    if (currentVal && !baseOptions.includes(currentVal)) {
      baseOptions = [currentVal, ...baseOptions];
    }
    return baseOptions;
  };

  const handleSelectChange = (fieldId: string, val: string, cardId: string) => {
    if (val === 'CUSTOM_MODE') {
      const projStore = formData[projectKey] || {};
      const cardStore = projStore[cardId] || {};
      const currentVal = cardStore[fieldId] || '';
      
      setFieldModes(prev => ({ ...prev, [fieldId]: 'CUSTOM' }));
      setCustomInputs(prev => ({ ...prev, [fieldId]: currentVal }));
    } else if (val === '') {
      handleResetFieldValue(cardId, fieldId);
    } else {
      setFieldModes(prev => ({ ...prev, [fieldId]: 'SELECT' }));
      updateFormValue(cardId, fieldId, val);
    }
  };

  const handleStartEditOption = (fieldId: string, currentVal: string) => {
    setFieldModes(prev => ({ ...prev, [fieldId]: 'EDIT' }));
    setCustomInputs(prev => ({ ...prev, [fieldId]: currentVal }));
  };

  const handleCustomSubmit = (cardId: string, fieldId: string, isEdit: boolean = false) => {
    const text = customInputs[fieldId]?.trim();
    if (!text) return;
    updateFormValue(cardId, fieldId, text);

    if (savePermanently[fieldId]) {
      const currentAdded = customOptions[fieldId] || [];
      if (!currentAdded.includes(text)) {
        setCustomOptions(prev => ({
          ...prev,
          [fieldId]: [...currentAdded, text]
        }));
      }
    }

    setFieldModes(prev => ({ ...prev, [fieldId]: 'SELECT' }));
    setCustomInputs(prev => ({ ...prev, [fieldId]: '' }));
  };

  const handleResetFieldValue = (cardId: string, fieldId: string) => {
    const projStore = formData[projectKey] || {};
    const cardStore = projStore[cardId] || {};
    const newCardStore = { ...cardStore };
    delete newCardStore[fieldId];

    setFormData(prev => ({
      ...prev,
      [projectKey]: {
        ...projStore,
        [cardId]: newCardStore
      }
    }));
    setFieldModes(prev => ({ ...prev, [fieldId]: 'SELECT' }));
  };

  const updateFormValue = (cardId: string, fieldId: string, value: string) => {
    const projStore = formData[projectKey] || {};
    const cardStore = projStore[cardId] || {};
    setFormData(prev => ({
      ...prev,
      [projectKey]: {
        ...projStore,
        [cardId]: {
          ...cardStore,
          [fieldId]: value
        }
      }
    }));
  };

  const getCardProgress = (card: any) => {
    if (!card || !card.fields) return 0;
    const projStore = formData[projectKey] || {};
    const cardStore = projStore[card.id] || {};
    const totalFields = card.fields.length;
    if (totalFields === 0) return 0;
    let filledCount = 0;
    card.fields.forEach((f: any) => {
      if (cardStore[f.id] && cardStore[f.id].trim() !== '') {
        filledCount++;
      }
    });
    return Math.round((filledCount / totalFields) * 100);
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
      alert(`프로젝트를 만들지 못했습니다.\n${insertError.message}`);
      return;
    }

    // Add creator as owner to project_members
    if (projectData?.id) {
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectData.id,
          user_id: currentUser.id,
          role: 'owner'
        });

      if (memberError) {
        console.error('Failed to add owner to project_members:', memberError);
        alert(`프로젝트는 생성되었으나 권한 설정에 실패했습니다.\n${memberError.message}`);
      }
    }

    setNewProjName('');
    setIsAddingProject(false);
    await loadProjects(currentUser.id);
  };

  const handleEditProject = async (projId: string, newName: string) => {
    if (!canEdit) {
      alert('편집 권한이 없습니다.');
      return;
    }

    const { error } = await supabase
      .from('projects')
      .update({ name: newName })
      .eq('id', projId);

    if (error) {
      alert(`프로젝트 이름을 수정하지 못했습니다.\n${error.message}`);
      return;
    }

    setProjects(prev => prev.map(p => p.id === projId ? { ...p, name: newName } : p));
  };

  const handleDuplicateProject = async (proj: Project) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

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
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: newProject.id,
        user_id: currentUser.id,
        role: 'owner'
      });

    if (memberError) {
      console.error('Failed to add owner to project_members for duplicated project:', memberError);
      alert(`프로젝트는 복제되었으나 권한 설정에 실패했습니다.\n${memberError.message}`);
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

    setProjects(prev => [...prev, newProject]);
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
    const projectName = sidebarTempName.trim();
    if (!projectName) {
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
      alert(`프로젝트 이름을 수정하지 못했습니다.\n${error.message}`);
      setSidebarEditingProjId(null);
      return;
    }

    setProjects(prev => prev.map(p => p.id === projId ? { ...p, name: projectName } : p));
    setSidebarEditingProjId(null);
  };

  const handleCommitHeaderProjectName = async (projId: string) => {
    const projectName = headerTempName.trim();
    if (!projectName) {
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
      alert(`프로젝트 이름을 수정하지 못했습니다.\n${error.message}`);
      setHeaderEditingProjId(null);
      return;
    }

    setProjects(prev => prev.map(p => p.id === projId ? { ...p, name: projectName } : p));
    setHeaderEditingProjId(null);
  };


  const handleCommitStepMeta = (stepKey: string) => {
    updateFrameworkData(prev => prev.map(step => {
      if (step.stepKey === stepKey) {
        return {
          ...step,
          title: tempStepTitle.trim() || step.title,
          subtitle: tempStepSubtitle.trim() || step.subtitle
        };
      }
      return step;
    }));
    setEditingStepMetaKey(null);
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

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStepKey: string, targetCardId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedCardId || !activeProjectId) return;

    // Find the card being moved
    let movedCard: any = null;
    let sourceStepKey: string | null = null;

    frameworkData.forEach(step => {
      const foundCard = step.cards.find(c => c.id === draggedCardId);
      if (foundCard) {
        movedCard = foundCard;
        sourceStepKey = step.stepKey;
      }
    });

    if (!movedCard) return;

    // Update local state first
    updateFrameworkData(prevFramework => {
      let movedCardLocal: any = null;

      const cleanedFramework = prevFramework.map(step => {
        const filteredCards = step.cards.filter(c => {
          if (c.id === draggedCardId) {
            movedCardLocal = c;
            return false;
          }
          return true;
        });
        return { ...step, cards: filteredCards };
      });

      if (!movedCardLocal) return prevFramework;

      return cleanedFramework.map(step => {
        if (step.stepKey === targetStepKey) {
          const newCards = [...step.cards];
          if (targetCardId) {
            const targetIdx = newCards.findIndex(c => c.id === targetCardId);
            if (targetIdx !== -1) {
              newCards.splice(targetIdx, 0, movedCardLocal);
            } else {
              newCards.push(movedCardLocal);
            }
          } else {
            newCards.push(movedCardLocal);
          }
          return { ...step, cards: newCards };
        }
        return step;
      });
    });

    // Update database
    if (sourceStepKey !== targetStepKey) {
      // Card moved to different step - update step_key in DB
      await updateCardStep(draggedCardId, activeProjectId, targetStepKey);
    }
    // If moved within same step, position update would be handled here (omitted for simplicity)

    setDraggedCardId(null);
  };

  const handleFieldDragStart = (e: React.DragEvent, fieldId: string) => {
    e.dataTransfer.setData('text/field', fieldId);
  };

  const handleFieldDrop = (e: React.DragEvent, cardId: string, targetFieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceFieldId = e.dataTransfer.getData('text/field');
    if (!sourceFieldId || sourceFieldId === targetFieldId) return;

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          const fields = [...card.fields];
          const sIdx = fields.findIndex((f: any) => f.id === sourceFieldId);
          const tIdx = fields.findIndex((f: any) => f.id === targetFieldId);
          if (sIdx !== -1 && tIdx !== -1) {
            const [moved] = fields.splice(sIdx, 1);
            fields.splice(tIdx, 0, moved);
          }
          return { ...card, fields };
        }
        return card;
      })
    })));
  };

  const handleCreateCard = async (stepKey: string) => {
    if (!newCardTitle.trim() || !activeProjectId) return;

    const formattedFields = newCardFields.map((f, idx) => ({
      id: `field_${Date.now()}_${idx}`,
      label: f.label.trim() || `세부 항목 ${idx + 1}`,
      options: f.optionsStr.split(',').map(o => o.trim()).filter(Boolean)
    }));

    const newCardId = `card_${Date.now()}`;
    const newCard = {
      id: newCardId,
      title: newCardTitle.trim(),
      desc: newCardDesc.trim() || '새로 추가된 커스텀 항목입니다.',
      fields: formattedFields.length > 0 ? formattedFields : [
        {
          id: `field_${Date.now()}_1`,
          label: '1-1. 핵심 내용 입력',
          options: ['기본 옵션 A', '기본 옵션 B']
        }
      ]
    };

    // Save to database
    await createCard(
      activeProjectId,
      newCardId,
      newCard.title,
      newCard.desc,
      stepKey,
      newCard.fields
    );

    updateFrameworkData(prev => prev.map(step => {
      if (step.stepKey === stepKey) {
        return { ...step, cards: [...step.cards, newCard] };
      }
      return step;
    }));

    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardFields([{ label: '1-1. 세부 항목 질문 입력', optionsStr: '옵션 1, 옵션 2, 옵션 3' }]);
    setAddingCardStepKey(null);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!activeProjectId) return;

    // Delete from database with project_id filter
    await deleteCard(cardId, activeProjectId);

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.filter(c => c.id !== cardId)
    })));

    if (activeCardId === cardId) {
      const remaining = allFlattenedCards.filter(item => item.card.id !== cardId);
      if (remaining.length > 0) {
        setActiveCardId(remaining[0].card.id);
      } else {
        setViewMode('kanban');
      }
    }
  };

  const handleSaveCardMeta = async (cardId: string) => {
    if (!activeProjectId) return;

    // Find the card to get its current fields
    let cardFields: any[] = [];
    frameworkData.forEach(step => {
      const card = step.cards.find(c => c.id === cardId);
      if (card) {
        cardFields = card.fields;
      }
    });

    // Update in database with project_id filter
    await updateCard(cardId, activeProjectId, {
      title: tempCardTitle.trim(),
      description: tempCardDesc.trim(),
      fields: cardFields
    });

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          return {
            ...card,
            title: tempCardTitle.trim() || card.title,
            desc: tempCardDesc.trim() || card.desc
          };
        }
        return card;
      })
    })));
    setEditingCardId(null);
  };

  const handleAddFieldToCard = async (cardId: string) => {
    if (!newFieldLabel.trim() || !activeProjectId) return;
    const opts = newFieldOptionsStr.split(',').map(o => o.trim()).filter(Boolean);

    // Find the card and its current fields
    let currentFields: any[] = [];
    frameworkData.forEach(step => {
      const card = step.cards.find(c => c.id === cardId);
      if (card) {
        currentFields = card.fields;
      }
    });

    const newFieldObj = {
      id: `field_${Date.now()}`,
      label: newFieldLabel.trim(),
      options: opts.length > 0 ? opts : ['기본 옵션 1', '기본 옵션 2']
    };

    const updatedFields = [...currentFields, newFieldObj];

    // Update in database with project_id filter
    await updateCard(cardId, activeProjectId, {
      fields: updatedFields
    });

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          return {
            ...card,
            fields: updatedFields
          };
        }
        return card;
      })
    })));

    setNewFieldLabel('');
    setNewFieldOptionsStr('');
    setEditingFieldCardId(null);
  };

  const handleDeleteFieldFromCard = async (cardId: string, fieldId: string) => {
    if (!activeProjectId) return;

    // Find the card and its current fields
    let currentFields: any[] = [];
    frameworkData.forEach(step => {
      const card = step.cards.find(c => c.id === cardId);
      if (card) {
        currentFields = card.fields;
      }
    });

    const updatedFields = currentFields.filter((f: any) => f.id !== fieldId);

    // Update in database with project_id filter
    await updateCard(cardId, activeProjectId, {
      fields: updatedFields
    });

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          return {
            ...card,
            fields: updatedFields
          };
        }
        return card;
      })
    })));
  };

  const handleUpdateFieldLabel = async (cardId: string, fieldId: string) => {
    if (!tempFieldLabel.trim() || !activeProjectId) return;

    // Find the card and its current fields
    let currentFields: any[] = [];
    frameworkData.forEach(step => {
      const card = step.cards.find(c => c.id === cardId);
      if (card) {
        currentFields = card.fields;
      }
    });

    const updatedFields = currentFields.map((f: any) => 
      f.id === fieldId ? { ...f, label: tempFieldLabel.trim() } : f
    );

    // Update in database with project_id filter
    await updateCard(cardId, activeProjectId, {
      fields: updatedFields
    });

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          return {
            ...card,
            fields: updatedFields
          };
        }
        return card;
      })
    })));
    setEditingFieldId(null);
    setTempFieldLabel('');
  };

  const handleApplyPickedOptions = () => {
    if (selectedPickedOptions.length === 0) {
      setIsPickerOpen(false);
      return;
    }

    const joinedStr = selectedPickedOptions.join(', ');

    if (pickerTargetType === 'newField') {
      setNewFieldOptionsStr(prev => prev ? `${prev}, ${joinedStr}` : joinedStr);
    } else if (pickerTargetType === 'newCardField' && pickerTargetFieldIndex !== null) {
      const updated = [...newCardFields];
      const current = updated[pickerTargetFieldIndex].optionsStr;
      updated[pickerTargetFieldIndex].optionsStr = current ? `${current}, ${joinedStr}` : joinedStr;
      setNewCardFields(updated);
    } else if (pickerTargetType === 'existingField' && pickerTargetFieldId) {
      setCustomOptions(prev => {
        const existing = prev[pickerTargetFieldId] || [];
        const merged = Array.from(newSet([...existing, ...selectedPickedOptions]));
        return { ...prev, [pickerTargetFieldId]: merged };
      });
    }

    setSelectedPickedOptions([]);
    setIsPickerOpen(false);
    setPickerSearchQuery('');
  };

  const helperToggleOption = (opt: string) => {
    setSelectedPickedOptions(prev => 
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const newSet = (arr: string[]) => Array.from(new Set(arr));

  const allFlattenedCards: { card: any; stepKey: string; stepTitle: string }[] = [];
  frameworkData.forEach(step => {
    step.cards.forEach(card => {
      allFlattenedCards.push({ card, stepKey: step.stepKey, stepTitle: step.title });
    });
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
          activeProjectId={activeProjectId}
          setActiveProjectId={setActiveProjectId}
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
                    if (e.key === 'Enter') handleCommitHeaderProjectName(activeProject.id);
                    if (e.key === 'Escape') setHeaderEditingProjId(null);
                  }}
                  onBlur={() => handleCommitHeaderProjectName(activeProject.id)}
                  className={`text-xl font-bold bg-transparent border-b-2 border-blue-500 outline-none w-[350px] ${isDark ? 'text-white' : 'text-zinc-900'}`}
                />
              ) : (
                <div className="flex items-center gap-3 group">
                  <h1 className="text-xl font-bold tracking-tight cursor-pointer" onClick={() => navigateTo('kanban')}>{activeProject.name}</h1>
                  <button
                    onClick={() => {
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
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragStart={handleDragStart}
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
                          onDragOver={handleDragOver}
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

    </div>
  );
}