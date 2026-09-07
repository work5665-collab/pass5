'use client';

export interface ProgressContext {
  formData: Record<string, Record<string, Record<string, string>>>;
  projectKey: string;
  cardId?: string;
  fieldAddedSets?: Record<string, string[][]>;
  cardFields?: any[];
  allCards?: { id: string; fields: any[] }[];
}

export function computeProgress(ctx: ProgressContext) {
  const projStore = ctx.formData?.[ctx.projectKey] || {};
  if (ctx.cardId && ctx.cardFields) {
    // Per-card progress (same logic as getCardProgress)
    const cardStore = projStore[ctx.cardId] || {};
    let filled = 0;
    let totalSets = 0;
    ctx.cardFields.forEach((f: any) => {
      const addedSets = (ctx.fieldAddedSets || {})[f.id] || [];
      // Image #12: 분모는 세트 수만 존재 (빈 세트 포함)
      const totalFieldSets = 1 + addedSets.length;
      totalSets += totalFieldSets;
      const val = cardStore[f.id];
      const baseFilled = !!(val && typeof val === 'string' && val.trim() !== '');
      if (baseFilled) filled += 1;
      // Only non-empty added values count toward 채움 (분모는 위에서 addedSets.length로 계산)
      const nonEmptyAdded = addedSets.filter((arr: string[]) => Array.isArray(arr) && arr.some((s: string) => s && s.trim() !== ''));
      nonEmptyAdded.forEach((setArr: string[]) => {
        const hasValue = Array.isArray(setArr) && setArr.some((s: string) => s && s.trim() !== '');
        if (hasValue) filled += 1;
      });
    });
    if (filled > totalSets) filled = totalSets;
    return totalSets === 0 ? 0 : Math.round((filled / totalSets) * 100);
  }
  // Project-wide progress (same logic as projectProgress)
  if (!ctx.allCards) {
    // Derive from all cards if framework data passed via caller; here return 0 if insufficient
    return 0;
  }
  let totalFields = 0;
  let filledFields = 0;
  // Caller passes framework-derived allCards; this branch keeps single policy
  ctx.allCards.forEach(card => {
    const cardStore = projStore[card.id] || {};
    card.fields.forEach((f: any) => {
      totalFields++;
      const val = cardStore[f.id];
      if (val && typeof val === 'string' && val.trim() !== '') filledFields++;
    });
  });
  return totalFields === 0 ? 0 : Math.round((filledFields / totalFields) * 100);
}
