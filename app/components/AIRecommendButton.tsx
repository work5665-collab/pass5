'use client';

import React, { useState, useRef, useEffect } from 'react';

// ── Mock 추천 데이터 생성 ──────────────────────────────────────────────
// 프로젝트명과 필드 라벨을 기반으로 3개의 추천 입력값을 제안.
// 향후 실제 AI API 연동 시 이 함수를 대체하면 됨.
function generateMockSuggestions(projectName: string, fieldLabel: string): string[] {
  const ctx = projectName || '프로젝트';

  // 필드 라벨 키워드 기반 매핑 (Input 단계 6개 필드)
  const keywordMap: Record<string, string[]> = {
    '근본적인 이유': [
      `${ctx}를 통해 팀 간 산발된 콘텐츠 제작 과정을 하나의 표준 프로세스로 통합하기 위함`,
      `brand awareness 강화 및 신규 고객 유입을 위한 온라인 홍보 채널 확대 필요`,
      `경쟁사 대비 온라인 노출이 부족하여, 체계적인 홍보 영상 제작 체계 구축이 시급`
    ],
    '핵심 문제': [
      `홍보 영상 제작 시 기획-촬영-편집 간 피드백 루프가 비효율적으로 운영되고 있음`,
      `콘텐츠 소재 발굴부터 편집 완성까지 평균 2주 이상 소요되어 타이밍을 놓치는 빈번한 이슈`,
      `PD별 편차가 큰 제작 품질과 일정 관리로 인한 내부 신뢰도 하락`
    ],
    '주요 수혜자': [
      `브랜드 마케팅팀 내 홍보 영상 담당 PD 및 콘텐츠 기획자`,
      `SNS 채널 운영과 영상 편집을 동시에 담당하는 1인 미디어 마케터`,
      `제품 런칭 시 홍보 영상이 필요한 스타트업 대표 및 사업자`
    ],
    '가장 큰 불편함': [
      `매번 처음부터 기획안을 작성해야 하는 반복 작업의 피로감`,
      `어떤 톤앤매너와 메시지로 접근해야 할지 막막한 초반 기획 단계`,
      `편집 소프트웨어와 협업 툴 간 데이터가 동기화되지 않아 이중 작업 발생`
    ],
    '결정적 변화': [
      `기획안 작성 시간이 기존 대비 60% 이상 단축되고, 팀 내 콘텐츠 방향성 합의가 빨라짐`,
      `표준화된 템플릿으로 누구나 일정 수준 이상의 홍보 영상 기획안을 작성할 수 있게 됨`,
      `PD 개개인의 역량 편차가 줄어들고, 클라이언트 미팅 전 준비 시간이 대폭 절감됨`
    ],
    '핵심 기준': [
      `기획안 작성 소요 시간을 기존 3일에서 1일 이내로 단축`,
      `내부 승인율(First-pass approval)을 70% 이상 달성`,
      `홍� 영상 제작 후 채널별 조회수·engage rate 20% 이상 상승`
    ],
  };

  // 매칭되는 키워드 찾기
  for (const [keyword, suggestions] of Object.entries(keywordMap)) {
    if (fieldLabel.includes(keyword)) {
      return suggestions;
    }
  }

  // 기본 추천 (매칭 없을 때)
  return [
    `${ctx}의 핵심 목표와 달성 지표를 구체적으로 정의`,
    `타깃 오디언스의 니즈와 현재 콘텐츠 간 갭 분석`,
    `기존 홍보 채널 성과 데이터를 기반으로 한 개선 방향 설정`
  ];
}

// ── 타입 ──────────────────────────────────────────────────────────────
interface AIRecommendButtonProps {
  projectName: string;
  fieldLabel: string;
  onSelect: (value: string) => void;
  isDark: boolean;
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────
export default function AIRecommendButton({
  projectName,
  fieldLabel,
  onSelect,
  isDark,
}: AIRecommendButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 열기/닫기 토글
  const toggle = () => {
    if (!isOpen) {
      setSuggestions(generateMockSuggestions(projectName, fieldLabel));
    }
    setIsOpen(!isOpen);
  };

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex">
      {/* 버튼 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border transition whitespace-nowrap flex items-center gap-1 ${
          isOpen
            ? 'bg-violet-600 text-white border-violet-500'
            : isDark
              ? 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border-violet-500/30 hover:border-violet-500/60'
              : 'bg-violet-50 hover:bg-violet-100 text-violet-600 border-violet-200 hover:border-violet-300'
        }`}
        title="AI가 이 항목에 맞는 입력값을 추천합니다"
      >
        ✨ AI 추천
      </button>

      {/* 팝오버 */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={popoverRef}
          className={`absolute right-0 top-full mt-1.5 z-50 w-[340px] max-w-[calc(100vw-2rem)] sm:max-w-md rounded-xl border shadow-2xl p-3 flex flex-col gap-1.5 ${
            isDark
              ? 'bg-zinc-900 border-violet-500/40 shadow-black/60'
              : 'bg-white border-violet-200 shadow-violet-100/40'
          }`}
          style={{ maxHeight: 280, overflowY: 'auto' }}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-500/10">
            <span className="text-xs">✨</span>
            <span className={`text-[11px] font-bold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
              AI 추천 입력값
            </span>
            <span className={`text-[10px] ml-auto ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              프로젝트 맥락 기반
            </span>
          </div>

          {/* 추천 목록 */}
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(s)}
              className={`w-full text-left p-3 rounded-lg text-[11px] leading-relaxed border transition text-left break-words whitespace-normal ${
                isDark
                  ? 'bg-zinc-800/50 border-zinc-700/50 hover:border-violet-500/60 hover:bg-violet-500/10 text-zinc-200'
                  : 'bg-zinc-50 border-zinc-200 hover:border-violet-300 hover:bg-violet-50 text-zinc-700'
              }`}
            >
              <span className={`font-bold mr-1.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                {idx + 1}.
              </span>
              {s}
            </button>
          ))}

          {/* 하단 안내 */}
          <div className={`text-[10px] pt-1.5 border-t border-zinc-500/10 break-words whitespace-normal ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            💡 추천값을 클릭하면 해당 필드에 자동 입력됩니다.
          </div>
        </div>
      )}
    </div>
  );
}
