// PASS 5 — HeaderProgress (모듈 분리, 에이전트 8 규칙)
// Props 기반 진행률 표시: 카드별 + 전체 진행률 (배터리/차트 스타일)

interface Props {
  total: number;
  completed: number;
  step?: string;
  progressPercent?: number;
}

export default function HeaderProgress({ total, completed, step, progressPercent }: Props) {
  const pct = progressPercent ?? (total > 0 ? Math.round((completed / total) * 100) : 0);
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-gray-500">{step ?? '진행률'}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold">{completed}/{total}</span>
    </div>
  );
}
