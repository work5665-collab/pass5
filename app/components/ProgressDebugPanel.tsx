'use client';
import { useMemo } from 'react';

export function ProgressDebugPanel({
  formData, projectKey, cardId, card,
  getCardProgress,
  fieldAddedSets,
}: {
  formData: any;
  projectKey: string;
  cardId: string;
  card?: { id: string; fields: any[] };
  getCardProgress: (card: any) => number;
  fieldAddedSets?: Record<string, string[][]>;
}) {
  const diag = useMemo(() => {
    const projStore = formData?.[projectKey] || {};
    const cardStore = projStore?.[cardId] || {};
    // Use getCardProgress if card object available; else approximate
    // For accurate filled count matching getCardProgress: delegate to passed getCardProgress
    // We only have formData/store here, so compute manually with addedSets awareness
    const fields = Object.keys(cardStore); // base keys only; added-set keys (#setN) also visible
    const entries: { fieldId: string; value: string | undefined; addedSetsCount: number }[] = [];
    let filled = 0;
    let totalSets = 0;
    // Derive unique field ids from base keys (strip #setN)
    const baseFids = new Set<string>();
    // Agent 1/8: use card.fields definition rather than only formData keys
    if (card && Array.isArray(card.fields)) {
      card.fields.forEach((f: any) => f?.id && baseFids.add(f.id));
    }
    // Fallback / added sets
    fields.forEach(fid => {
      const base = fid.includes('#set') ? fid.split('#set')[0] : fid;
      baseFids.add(base);
    });
    (fieldAddedSets ? Object.keys(fieldAddedSets).map(k => k) : []).forEach(fid => baseFids.add(fid));
    Array.from(baseFids).sort().forEach(fid => {
      const added = (fieldAddedSets || {})[fid] || [];
      // Image #12: 분모는 세트 수만 (빈 세트 포함)
      totalSets += 1 + added.length;
      const valBase = cardStore[fid];
      const baseFilled = !!(valBase && typeof valBase === 'string' && valBase.trim() !== '');
      if (baseFilled) filled++;
      // Added set keys — only non-empty values count toward 채움
      const nonEmptyAdded = added.filter((a: string[]) => Array.isArray(a) && a.some((s: string) => s && s.trim() !== ''));
      nonEmptyAdded.forEach((_, i) => {
        const originalIdx = added.indexOf(nonEmptyAdded[i]);
        const setKey = originalIdx <= 0 ? fid : `${fid}#set${originalIdx + 1}`;
        const valSet = cardStore[setKey];
        const setFilled = !!(valSet && typeof valSet === 'string' && valSet.trim() !== '');
        if (setFilled) filled++;
      });
      entries.push({
        fieldId: fid,
        value: valBase,
        addedSetsCount: added.length,
      });
    });
    const percent = totalSets > 0 ? Math.round((Math.min(filled, totalSets) / totalSets) * 100) : 0;
    return { entries, filled, totalSets, percent, projectKey, cardId };
  }, [formData, projectKey, cardId, card, fieldAddedSets]);

  return (
    <div className="fixed top-20 right-4 z-50 w-72 bg-black/90 text-white text-xs rounded-xl border border-white/10 p-3 shadow-2xl backdrop-blur-md">
      <div className="font-bold mb-2 text-amber-300">🔍 진행도 디버그 (진단용)</div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-white/10 rounded px-2 py-1 text-center"><div className="text-xs text-white/60">채움</div><div className="font-mono text-amber-400 text-base">{diag.filled}</div></div>
        <div className="bg-white/10 rounded px-2 py-1 text-center"><div className="text-xs text-white/60">분모</div><div className="font-mono text-amber-400 text-base">{diag.totalSets}</div></div>
        <div className="bg-white/10 rounded px-2 py-1 text-center"><div className="text-xs text-white/60">%</div><div className="font-mono text-amber-400 text-base">{diag.percent}</div></div>
      </div>
      <div className="text-white/50 mb-1">projectKey: <span className="text-white font-mono text-[10px]">{diag.projectKey}</span></div>
      <div className="text-white/50 mb-1">cardId: <span className="text-white font-mono text-[10px]">{diag.cardId}</span></div>
      <div className="text-white/60 mb-1">formData entries ({diag.entries.length}):</div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {diag.entries.map(e => (
          <div key={e.fieldId} className="bg-white/5 rounded px-1.5 py-1 flex justify-between gap-2">
            <span className="font-mono text-[10px] truncate">{e.fieldId}</span>
            <span className={`font-mono text-[10px] ${e.value ? 'text-amber-300' : 'text-white/30'}`}>{e.value ? (e.value.length > 20 ? e.value.slice(0, 20) + '…' : e.value) : '—'}</span>
            <span className="font-mono text-[10px] text-white/40 whitespace-nowrap">+{e.addedSetsCount}</span>
          </div>
        ))}
        {diag.entries.length === 0 && <div className="text-white/30 italic">(formData 비어 있음)</div>}
      </div>
      <div className="text-[10px] text-white/40 mt-2">디버그 패널 — 8당 Agent 7 검토 완료. 구조 진단 시 사용. 실제 배포 시 제거.</div>
    </div>
  );
}
