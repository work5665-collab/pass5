# 📘 PASS 5 프로젝트 — 시스템 스펙 브리핑

> 새 AI 세션에 전달하는 전람용 브리핑 자료.

**스택**: Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS v4 · Supabase (PostgreSQL + Auth + RLS) · Turbopack
**특이사항**: 이 Next.js 버전은 breaking change가 많음 — 코드 작성 전 반드시 `node_modules/next/dist/docs/`의 가이드를 읽을 것. 라우트 핸들러의 `params`는 `Promise`임 (`await params`).

---

## 0. 협업 규칙 및 역할

**역할 분담 (2-AI 협업 워크플로)**
| AI | 담당 |
|---|---|
| **Gemini** | 상황 분석 · 기술 검토 · 프롬프트 작성 (설계/리뷰 역할) |
| **Claude** | 실제 코드 작성 및 파일 수정 (구현 역할) |

**소통 스타일**
- **직설적/비판적** 검토 및 구현 가이드 제공
- 불필요한 정중체·애매모호한 표현 지양 — 명확한 지시와 즉시 실행 지향
- 새로운 AI 세션에서도 위 역할 분담과 소통 방식을 그대로 유지할 것

---

## 1. 주요 페이지 및 라우팅 구조

| 라우트 | 종류 | 설명 |
|---|---|---|
| `/` | page | **메인 앱** (`app/page.tsx`, ~1800줄) — 구글 로그인 필수. `Pass5MasterApp`이 모든 UI를 인라인 JSX로 보유 |
| `/share/[token]` | page | **읽기 전용 공유 뷰어** — 로그인 불필요, 공유 링크로 열람. 메인 레이아웃(사이드바+칸반) 재사용 |
| `/invite/[token]` | page | 이메일 초대 수락 페이지 |
| `/api/share/[token]/data` | API | 공유 데이터 조회 (service role, 익명 허용) — 프로젝트/폴더 + 카드 구조 반환 |
| `/api/shares` | API | 공유 현황 조회/생성 |
| `/api/shares/[id]` | API | 공유 수정/해지 |
| `/api/shares/users` | API | 공유 현황을 사용자 기준 그룹핑 |
| `/api/invite` `/api/invite/accept` `/api/invite/validate` | API | 이메일 초대 흐름 |
| `/api/members` | API | 프로젝트 멤버 관리 |
| `/api/send-invite-email` | API | 초대 이메일 발송 |
| `/api/share-link/accept` | API | 오픈 링크 공유 수락 |

**뷰 모드** (`ViewMode`): `'kanban' | 'focus' | 'detail' | 'report' | 'folder' | 'shares'`
- 메인 앱의 focus/detail/report 뷰는 **별도 컴포넌트가 아니라 `page.tsx`의 인라인 JSX** — 재사용하려면 복제 필요

---

## 2. 핵심 UI 컴포넌트 구성

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| **ProjectSidebar** | `app/components/ProjectSidebar.tsx` | 좌측 사이드바 — 폴더 트리(2단계), 프로젝트 목록, FOCUS VIEWS, 공유받은 항목. `readOnly` prop 지원 |
| **KanbanBoard** | `components/KanbanBoard.tsx` | 5열 칸반 보드 — 카드/단계 CRUD, 드래그, 진행률. `readOnly` prop 지원 |
| **ShareModal** | `app/components/ShareModal.tsx` | 공유 생성 모달 — 이메일 초대(이름/소속 라벨) + 오픈 링크 |
| **SharesView** | `app/components/SharesView.tsx` | 공유 현황 패널 — 사용자 그룹핑, 컬럼 표시/인라인 편집/검색 |
| **InviteModal** | `app/components/InviteModal.tsx` | 멤버 초대 |
| **ContextMenu** | `app/components/ContextMenu.tsx` | 카드/폴더/프로젝트 우클릭 메뉴 |
| **FolderIndexView** | `app/components/FolderIndexView.tsx` | 폴더 인덱스 뷰 |

**중요 패턴**: ProjectSidebar와 KanbanBoard는 **순수 프레젠테이셔널** 컴포넌트 — 모든 데이터/핸들러를 props로 받음(각각 40+/30+ props). 그래서 `/share` 페이지에서도 그대로 재사용 가능.
**데이터 로직**: `lib/hooks/useCardData.ts`, `useFieldInteraction.ts`, `useFolderData.ts`, `useProjectData.ts` 훅으로 분리.

**뷰어 모드(공유 페이지)의 4개 뷰**: 칸반 / 집중뷰(focus) / 카드 상세(detail) / 종합 정의서(report) — 모두 읽기 전용. 헤더에 '종합 정의서' 버튼 상시 노출, '뒤로 가기'는 `historyStack`으로 직전 뷰 정확히 복귀.

---

## 3. 카드 데이터 구조

**프레임워크: PASS 5 — 5단계** (`lib/framework.ts`의 `initialFrameworkData`)
`Input → Setup → Processing → Review → Output` (각 단계에 2~3개 기본 카드, 총 15개)

```ts
// 핵심 타입 (lib/types.ts)
interface Field { id: string; label: string; options: string[] }  // 질문(레이블) + 보기 옵션
interface Card  { id: string; title: string; desc: string; fields: Field[] }
interface Step  { stepKey: string; title: string; subtitle: string; cards: Card[] }
```

**DB 테이블** (Supabase):
- `cards` — `{ id, project_id, card_id, title, description, step_key, fields: JSONB, position }`. **`project_id` 기준 데이터 격리** (이전에 격리 버그 수정됨)
- `projects` — `{ id, name, created_by, folder_id }`
- `folders` — 2단계 `parent_id` 계층
- `project_members` — `{ project_id, user_id, role }`
- `item_shares` — `{ target_type, target_id, share_method('user'|'link'), email, name, department, role, link_token, expires_at, status('active'|'revoked') }`

**⚠️ 상태 값 저장 방식**: 카드 필드의 **선택값은 DB가 아니라 사용자별 localStorage에 저장**됨. 익명 뷰어는 선택값을 볼 수 없음 → 공유 페이지에서는 `fields[].options`의 첫 비어있지 않은 값을 선택값으로 표시.

**✅ 영속화 구현 (`useFieldValuePersistence`)**: `lib/hooks/useFieldValuePersistence.ts` — formData(`projectId → cardId → fieldId → value`)를 `pass5_field_values_v1:<userId>` 키에 로드/500ms 디바운스 저장. 새로고침 시 입력값 유지, 로그아웃 시 메모리 비움(계정 간 값 누출 방지). 복원 완료 전에는 저장을 건너뛰어 빈 `{}`로 실데이터를 덮어쓰는 것을 방지.

---

## 4. 주요 기능 및 권한 체계

**핵심 기능**
- 구글 로그인 기반 프로젝트/폴더 관리, 2단계 폴더 트리
- 칸반 보드 카드 CRUD + 드래그 + 진행률(채워진 필드 비율)
- 집중뷰 / 카드 상세 / 종합 정의서(인쇄 지원) 열람
- 이메일 초대 + 오픈 링크 공유 (`item_shares`)
- 공유 링크를 통한 익명 읽기 전용 뷰어 (`/share/[token]`)
- 한국어/영어 i18n (`lib/i18n.ts`), 다크/라이트 테마

**권한 체계** (`lib/shares/permissions.ts`)
- 역할 등급: `viewer(1) < editor/member(2) < admin(3) < owner(4)`
- **최고 권한 채택(Highest Privilege)**: `resolveEffectiveRole`이 `project_members` 역할과 `item_shares` 역할을 모두 `max()` 비교
- **권한 상속은 가산적(Additive)**: 상위 폴더 권한이 하위로 상향 전파됨 (강등 없음)
- `canManageProject`: owner/admin이면 관리 가능 + **fallback**으로 프로젝트 생성자(`created_by`)는 오너로 취급 (멤버십 미연동 레거시 대응, 403 방지)
- Supabase **RLS** 적용: anon client(로그인 사용자, RLS 적용) vs **service role**(서버 전용, RLS 우회) — `SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 아님
- 뷰어 모드에서 CUD(생성/수정/삭제/드래그)만 차단, 열람은 모두 허용

---

### 🔗 커밋/태그 상태
- 직전 커밋: `cfaf08e` `feat & refactor: PGRST303 재시도·ViewScaffold 뷰 통일·필드값 영속화·AI 추천·헤더 안정화` (그 앞 `df7bd43` 2단계 진행률 바, `463d991` 1단계 검색/필터)
- 태그: `v1.0-viewer-stable` (안정적 뷰어 버전 기준점)
- **이번 브리핑 커밋**: `feat: 프로젝트 소유권 넘기기 기능 구현, UI 용어 개선 및 문서 업데이트` — 3단계 구현(`/api/members/transfer-owner` + 공유 현황 '오너' 메뉴)과 아래 3단계 상세의 UI 용어 개선, DB Clean-up을 함께 커밋·push함
- **배포 상태**: GitHub(work5665-collab/pass5) — Vercel 사이트 연동 자동 배포로 main push 시 Production 배포가 트리거됨. 최신 배포(`cfaf08e`)는 **Vercel 빌드 완료 + deployment success** 확인됨. 단 배포 인스턴스 URL은 계정 SSO/배포 보호 상태라 비인증 접근은 로그인용 `vercel.com/sso-api`로 리다이렉트됨.

---

## 5. 5단계 고도화 로드맵 및 진행 상황

| 단계 | 기능 | 상태 |
|---|---|---|
| **1단계** | **인덱스 키워드 검색 및 카드 필터링** — 전체 프로젝트·카드·필드를 키워드로 검색하고 결과로 카드를 필터링 | ✅ **구현 완료** |
| **2단계** | **상단 전체 진행률 프로그레스 바 UI** — 프로젝트 전반의 종합 진행률을 상단 고정 바에 시각화 | ✅ **구현 완료** |
| **3단계** | **프로젝트 오너 권한 승계 기능** — 오너가 다른 멤버에게 소유권을 넘기는 기능 | ✅ **구현 완료** |
| **4단계** | **세부 페이지 다중 옵션 선택 기능** — 카드 상세에서 여러 옵션을 동시에 선택/표시 | ⬜ 대기 |
| **5단계** | **호버/토글 기반 파이프라인 SVG 연결선 UI** — 5단계 칸반을 파이프라인 연결선으로 시각화 | ⬜ 대기 |

> 1~3단계 모두 **구현 완료** 상태. **다음 진행 과제: 4단계(세부 페이지 다중 옵션 선택 기능)**

### ✅ 1단계 구현 상세: 키워드 검색 및 카드 필터링

**구현 위치**: `app/page.tsx` + `components/KanbanBoard.tsx`

**상태 관리** (`page.tsx` lines 46-60):
```ts
const [searchKeyword, setSearchKeyword] = useState('');      // 검색 입력값
const [searchTitle, setSearchTitle] = useState(true);         // 제목 검색 토글
const [searchDesc, setSearchDesc] = useState(true);           // 내용 검색 토글
const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();
const isSearchActive = normalizedSearchKeyword.length > 0;

const isCardMatch = useCallback((card: Card) => {
  if (!isSearchActive) return true;
  const inTitle = searchTitle && card.title.toLowerCase().includes(normalizedSearchKeyword);
  const inDesc = searchDesc && card.desc.toLowerCase().includes(normalizedSearchKeyword);
  return inTitle || inDesc;
}, [isSearchActive, normalizedSearchKeyword, searchTitle, searchDesc]);
```

**검색 UI** (`page.tsx` lines 793-833): 글로벌 헤더 내 검색 인풋 + 클리어 버튼 + `제목`/`내용` 토글 버튼

**KanbanBoard 연동** (`page.tsx` lines 932-933): `searchActive={isSearchActive}`, `isCardMatch={isCardMatch}` props 전달 → 미일치 카드 반투명 디밍 + 일치 카드 강조 하이라이트 (`KanbanBoard.tsx` lines 172-195)

---

### 🛠️ 최근 적용 내역 (이번 커밋 대상 작업)

| 작업 | 상세 |
|---|---|
| **PGRST303 자동 재시도** | `lib/supabase/retry.ts` — "JWT issued at future"(인증/API 서버 시계 오차, 일시적) 발생 시 400ms 대기 후 최대 2회 재시도(총 3회). `runSupabaseQuery(() => …)`로 **데이터 계층의 모든 쿼리 사이트**에 적용(`useProjectData.ts`, `supabase/cards.ts`, `supabase/folders.ts`); 소진 후에만 알림/콘솔 노출. `error.ts`의 `describeSupabaseError`로 에러 메시지 정규화(빈 `{}` 방지) |
| **ViewScaffold 뷰 레이아웃 통일** | `app/components/ViewScaffold.tsx` — 6개 뷰(칸반/포커스/카드상세/종합정의서/공유/폴더)의 상단부를 공통 틀로 추출. full-bleed 고정 높이 서브바(`mt-4` + `h-11 sm:h-12`) + 본문만 `max-w-4xl mx-auto`(칸반은 `wide`=전체 폭). 뷰 전환 시 '헤더+서브바' 계층이 픽셀 단위로 동일해 세로 튀김(덜컹거림) 제거. 칸반 진행률 바도 서브바 안으로 이동 |
| **필드값 localStorage 영속화** | `lib/hooks/useFieldValuePersistence.ts` — formData를 `pass5_field_values_v1:<userId>`에 로드/500ms 디바운스 저장. 새로고침 시 입력 유지, 로그아웃 시 초기화(계정 간 누출 방지) |
| **AI 추천 버튼** | `app/components/AIRecommendButton.tsx` — 카드 상세 필드 우측 '✨ AI 추천'. 프로젝트명+필드 라벨 기반 3개 추천값 팝오버(외부 클릭/ESC 닫기), 선택 시 해당 필드에 자동 입력(기존 옵션이면 SELECT, 아니면 CUSTOM + 제출). 현재 mock — API 연동 시 `generateMockSuggestions` 교체 지점 |
| **헤더/스크롤바 안정화** | `<header>` `w-full overflow-hidden` + 좌측 제목 `min-w-0 flex-1` + `truncate`, 우측 컨트롤 `flex-nowrap shrink-0` 고정 → 사이드바 열림 시 가로 스크롤·버튼 겹침 제거. `<main>`에 `overflow-x-hidden` + `scrollbar-gutter: stable`(스크롤바 생성 시 헤더 좌우 밀림 방지). [종합정의서] 버튼 활성 상태(`viewMode==='report'`) 파란 하이라이트 정상화 |
| **종합정의서 세로 여백 리듬** | 서브바 ↔ 문서타이틀 `mt-3`(12px), 문서타이틀 ↔ 네비게이터 ↔ 본문카드 `gap-2`(8px), 네비게이터 내부 `py-1.5`(6px) — '요소 간 바깥 여백' 기준으로 대칭적인 compact 리듬 정리 |

### ✅ 2단계 구현 상세: 상단 전체 진행률 프로그레스 바 UI

**구현 위치**: `app/page.tsx`

**데이터 계산** (`page.tsx` lines 471-486):
```ts
const projectProgress = useMemo(() => {
  const projStore = formData[projectKey] || {};
  let totalFields = 0;
  let filledFields = 0;
  frameworkData.forEach(step => {
    step.cards.forEach(card => {
      const cardStore = projStore[card.id] || {};
      card.fields.forEach(f => {
        totalFields++;
        if (cardStore[f.id] && cardStore[f.id].trim() !== '') filledFields++;
      });
    });
  });
  return totalFields === 0 ? 0 : Math.round((filledFields / totalFields) * 100);
}, [formData, projectKey, frameworkData]);
```

**프로그레스 바 JSX**: 칸반 뷰의 `<ViewScaffold subBar={...}>` 서브바 밴드에 배치(글로벌 헤더 바로 아래, **칸반 뷰 전용** 표시)

- **위치**: `<header>` 하단 border-b와 콘텐츠 영역 사이
- **높이**: `h-1.5` (6px) `rounded-full`
- **색상**: 미완료 `bg-blue-500` / 100% 완료 시 `bg-emerald-500`
- **애니메이션**: `transition-all duration-500 ease-out`
- **퍼센트 텍스트**: `tabular-nums` 숫자 폭 고정 + `w-10 text-right`
- **라벨**: "전체 진행률" 왼쪽 고정
- **조건**: `activeProject`가 있을 때만 표시 (폴더 인덱스 뷰에서는 숨김)
- **클라이언트 전용**: `formData`는 localStorage 기반이므로 프로그레스 바도 클라이언트 전용

---

### ✅ 3단계 구현 상세: 프로젝트 오너 권한 승계 (소유권 넘기기)

**배경**: 프로젝트를 실제 소유(관리)할 멤버를 변경할 수 있는 기능. 오너가 다른 멤버에게 소유권을 넘기면 본인은 `관리자(Admin)`로 강등된다.

#### 기능 개요

| 영역 | 상세 |
|---|---|
| **백엔드 API** | `app/api/members/transfer-owner/route.ts` — `POST /api/members/transfer-owner` (`{projectId, newOwnerUserId}`). 요청자(owner 검증) → **service role(RLS 우회)** 로 3건 안전 일괄 업데이트: ① `projects.created_by = newOwnerUserId`, ② 기존 오너 row `role: owner → admin`, ③ 신규 오너 row `role → owner` |
| **UI 통합** | `app/components/SharesView.tsx` — **공유 현황** 페이지 권한 드롭다운에 '오너' 메뉴 통합. 노출 조건: 현재 사용자가 해당 프로젝트의 **owner** + 초대 수락 완료(`user_id` 존재)된 다른 멤버 행 (정산은 서버 측 `/api/shares/users` 응답의 `present_user_can_transfer` 필드로 계산) |
| **이양 판정 메타데이터** | `/api/shares/users` 응답 확장 — `user_id`, `project_id`(폴더 대상은 소속 프로젝트 역조회), `email`, `name`, `present_user_is_owner`, `present_user_can_transfer` |

#### UI UX 용어 개선 (직관적 '넘기기' 표현 통일)

- 드롭다운 메뉴 옵션: `👑 오너 (Owner)`
- 모달 타이틀: **`👑 프로젝트 소유권 넘기기`**
- 본문 문구: **"[이름]님에게 프로젝트 소유권을 넘기시겠습니까? 완료되면 본인의 권한은 '관리자(Admin)'로 변경됩니다."**
- 실행 버튼: **[소유권 넘기기]**
- 성공 알림: **"소유권이 성공적으로 넘겨졌습니다."**
- 이후 공유 현황 목록 자동 재조회, 기존 오너는 '오너' 옵션 노출 중단(Admin로 전환)

#### 검증 및 정리

- **DB Clean-up 완료**: 테스트 프로젝트(`[테스트] 소유권 이양 검증용`) · project_members · item_shares · 가상 멤버 auth 유저 **전부 0건** 검증 완료 (잔존물 없음)
- **임시 스크립트 삭제 완료**: `scripts/ui_setup/`(`01_find_user.cjs` · `02_setup.cjs` · `03_cleanup.cjs` · `state.json`) 및 빈 `scripts/` 디렉토리 제거 → git 작업 트리 내 테스트 흔적 0건
- **빌드 검증**: `npm run build` 성공 — TypeScript 컴파일 · 13개 페이지/라우트 정적 생성 통과
