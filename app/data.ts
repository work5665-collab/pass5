import { Step } from './types';

export const dict = {
  ko: {
    editName: "이름 수정",
    kanbanView: "전체 칸반",
    reportView: "종합 정의서",
    kanbanGuide: "카드를 드래그하여 단계를 변경하거나 클릭하여 상세 내용을 입력하세요.",
    completed100: "완료됨",
    inProgress: "진행 중",
    focusGo: "집중 조회 ↗",
    addCard: "+ 의사결정 카드 추가",
    back: "← 돌아가기",
    focusModeTitle: "단계별 집중 조회 모드",
    progress: "진행률",
    detailEdit: "상세 입력 및 수정",
    formStatus: "항목별 입력 현황",
    notEntered: "미작성 (클릭하여 입력)",
    prevCard: "← 이전 카드",
    firstCard: "첫 번째 카드입니다",
    nextCard: "다음 카드 →",
    lastCard: "마지막 카드입니다",
    printPdf: "🖨️ PDF로 저장/인쇄",
  },
  en: {
    editName: "Edit Name",
    kanbanView: "Kanban",
    reportView: "Report",
    kanbanGuide: "Drag cards to change steps or click to edit details.",
    completed100: "Completed",
    inProgress: "In Progress",
    focusGo: "Focus View ↗",
    addCard: "+ Add Decision Card",
    back: "← Back",
    focusModeTitle: "Step Focus Mode",
    progress: "Progress",
    detailEdit: "Edit Details",
    formStatus: "Field Status",
    notEntered: "Not entered",
    prevCard: "← Prev Card",
    firstCard: "First card",
    nextCard: "Next Card →",
    lastCard: "Last card",
    printPdf: "🖨️ Print / PDF",
  }
};

export const initialFrameworkData: Step[] = [
  {
    stepKey: "pass1",
    title: "1단계: 문제 정의",
    subtitle: "해결해야 할 본질적인 문제가 무엇인가?",
    cards: [
      {
        id: "p1_c1",
        title: "핵심 페인포인트 정의",
        desc: "현재 조직이나 서비스에서 가장 시급하게 해결해야 하는 비효율이나 불만족 요소를 명확히 짚어봅니다.",
        fields: [
          {
            id: "p1_c1_f1",
            label: "가장 뼈아픈 현장 불만족 사항은 무엇인가?",
            options: ["반복되는 수작업으로 인한 시간 낭비", "부서간 소통 누락 및 정보 불일치", "명확하지 않은 업무 프로세스와 책임 소재"]
          },
          {
            id: "p1_c1_f2",
            label: "이 문제를 방치할 경우 발생하는 비용과 리스크는?",
            options: ["인력 이탈 및 업무 번아웃 심화", "고객 서비스 품질 저하 및 신뢰 하락", "불필요한 운영 예산 낭비 지속"]
          }
        ]
      }
    ]
  },
  {
    stepKey: "pass2",
    title: "2단계: 목표 수립",
    subtitle: "우리가 달성하고자 하는 궁극적 지점은?",
    cards: [
      {
        id: "p2_c1",
        title: "정량적/정성적 성공 지표",
        desc: "프로젝트가 성공적으로 끝났을 때 눈으로 확인할 수 있는 변화를 정의합니다.",
        fields: [
          {
            id: "p2_c1_f1",
            label: "가장 우선시되는 핵심 목표(North Star Metric)는?",
            options: ["업무 처리 시간 50% 단축", "부서간 협업 만족도 90점 이상 달성", "수작업 오류율 0% 수렴"]
          }
        ]
      }
    ]
  }
];