'use client';

import type { ReactNode } from 'react';

interface ViewScaffoldProps {
  /** 전체 폭(full-bleed) 서브바 — 헤더와 동일한 좌측 기준, 고정 높이 */
  subBar?: ReactNode;
  /** 본문 콘텐츠 */
  children: ReactNode;
  /** true면 본문도 전체 폭(칸반 뷰), false면 896px 중앙(그 외 서브 뷰) */
  wide?: boolean;
  /** 본문 컨테이너에 추가 적용할 클래스 (gap, pb 등) */
  className?: string;
}

// 모든 뷰 공통 상단 레이아웃 틀
// ======================================================================
// 구조: [글로벌 헤더(공통, 뷰 위에 한 번)] + [full-bleed 서브바(고정 높이)]
//       + [본문(칸반=전체 폭 / 그 외=896px 중앙)]
// - 서브바는 헤더와 동일한 좌측 기준(full-bleed)이며 높이가 고정되어 있어,
//   어떤 뷰로 전환해도 "헤더 + 서브바 계층"의 높이·폭·여백이 완전히 동일하다.
//   (세로 튀김/덜컹거림 방지)
// - 896px 중앙 정렬(max-w-4xl mx-auto)은 "본문"에만 적용되고 서브바에는
//   적용되지 않는다 → 뷰 전환 시 서브바가 가로로 튀지 않는다.
export default function ViewScaffold({
  subBar,
  children,
  wide = false,
  className = '',
}: ViewScaffoldProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 w-full min-h-0 mt-4">
      {/* 공통 서브바: 전체 폭 · 고정 높이 · 헤더와 좌측 기준 동일 */}
      {subBar && (
        <div className="h-11 sm:h-12 w-full shrink-0 flex items-center gap-3 print:hidden">
          {subBar}
        </div>
      )}

      {/* 본문: 칸반(wide)은 전체 폭, 그 외 서브 뷰는 896px 중앙 정렬 */}
      <div className={`flex flex-col flex-1 min-h-0 w-full ${wide ? '' : 'max-w-4xl mx-auto'} ${className}`}>
        {children}
      </div>
    </div>
  );
}