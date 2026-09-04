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
| `/` | page | **메인 앱** (`app/page.tsx`, ~1540줄) — 구글 로그인 필수. `Pass5MasterApp`이 모든 UI를 인라인 JSX로 보유 |
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
- 최신 커밋: `f1a9dff` `docs: Add integrated project briefing and roadmap`
- 태그: `v1.0-viewer-stable` (안정적 뷰어 버전 기준점)
- **미커밋 작업 존재**: `app/page.tsx` 외 4개 파일(`ProjectSidebar.tsx`, `KanbanBoard.tsx`, `useCardData.ts`, `supabase/cards.ts`)에 1단계(키워드 검색/필터) 및 최근 UI/UX 개선이 커밋 전 상태로 남아 있음 — 다음 커밋 대상

---

## 5. 5단계 고도화 로드맵 및 진행 상황

| 단계 | 기능 | 상태 |
|---|---|---|
| **1단계** | **인덱스 키워드 검색 및 카드 필터링** — 전체 프로젝트·카드·필드를 키워드로 검색하고 결과로 카드를 필터링 | ✅ **구현 완료** |
| **2단계** | **상단 전체 진행률 프로그레스 바 UI** — 프로젝트 전반의 종합 진행률을 상단 고정 바에 시각화 | 🔜 **다음 차례** |
| **3단계** | **프로젝트 오너 권한 승계 기능** — 오너가 다른 멤버에게 소유권을 이양하는 기능 | ⬜ 대기 |
| **4단계** | **세부 페이지 다중 옵션 선택 기능** — 카드 상세에서 여러 옵션을 동시에 선택/표시 | ⬜ 대기 |
| **5단계** | **호버/토글 기반 파이프라인 SVG 연결선 UI** — 5단계 칸반을 파이프라인 연결선으로 시각화 | ⬜ 대기 |

> 1단계(인덱스 키워드 검색 및 카드 필터링)는 **구현 완료** 상태이나 아직 미커밋. 다음은 2단계(프로그레스 바 UI) 작업 예정.

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

### 🎨 최근 UI/UX 개선 내역 (1단계 이후, 미커밋)

| 개선 항목 | 상세 |
|---|---|
| **글로벌 헤더 통일** | 모든 뷰에서 상단 글로벌 헤더(`Pass5 | project-name` + 종합 정의서/공유 버튼) 상시 노출. 보고서 뷰 조건부 숨김 제거 |
| **서브헤더·컨테이너 박스 디자인 통일** | 집중뷰·상세뷰·종합정의서 3개 뷰의 서브헤더, 박스 border-radius(`rounded-xl`), 너비(`max-w-4xl`) 일관 적용 |
| **곡률(border-radius) 정돈** | 제목 카드(`rounded-xl`), 본문 카드(`rounded-xl`), 네비게이터(`rounded-lg`) 곡률 계층 정리 |
| **네비게이터 위아래 수직 여백 조정** | 상단 `mt-1`, 하단 그래디언트 `h-1.5 -mb-1.5`(실제 공간 차지 없이 시각적 페이드아웃) |
| **(미작성) 클릭 링크** | 종합 정의서에서 미작성 필드 `(미작성)` 클릭 시 해당 카드 상세 페이지(`detail` 뷰)로 즉시 이동 |
| **TOP(최상단 이동) 버튼** | 우측 하단 고정 플로팅 버튼(`fixed bottom-6 right-6`), 스크롤 300px 초과 시 표시, 클릭 시 `scrollTo({ top: 0, behavior: 'smooth' })`. `main`을 스크롤 컨테이너로 사용하므로 버튼은 `main` 바깥에 위치 |
| **스크롤바 레이아웃 시프트 방지** | `scrollbar-gutter: stable`을 `<main>`에 인라인 적용으로 스크롤바 생성 시 글로벌 헤더 좌우 밀림 차단 |
