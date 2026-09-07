'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export type FormDataMap = Record<string, Record<string, Record<string, string>>>;

interface UseFieldInteractionParams {
  // 공유 폼 데이터 (page 레벨에서 관리, useProjectData/useCardData와 공유)
  formData: FormDataMap;
  setFormData: Dispatch<SetStateAction<FormDataMap>>;
  projectKey: string;
  // useCardData 소유 setter (handleApplyPickedOptions에서 사용)
  newCardFields: { label: string; optionsStr: string }[];
  setNewCardFields: Dispatch<SetStateAction<{ label: string; optionsStr: string }[]>>;
  setNewFieldOptionsStr: Dispatch<SetStateAction<string>>;
}

// 필드 입력 인터랙션 로직(셀렉트/커스텀 입력/옵션 피커)과 해당 상태를 담당하는 커스텀 훅
export function useFieldInteraction({
  formData,
  setFormData,
  projectKey,
  newCardFields,
  setNewCardFields,
  setNewFieldOptionsStr,
}: UseFieldInteractionParams) {
  // 필드 입력 모드 상태
  const [fieldAddedSets, setFieldAddedSets] = useState<Record<string, string[][]>>({});
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({});
  const [fieldModes, setFieldModes] = useState<Record<string, 'SELECT' | 'CUSTOM' | 'EDIT'>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [savePermanently, setSavePermanently] = useState<Record<string, boolean>>({});

  // 옵션 피커 상태
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerStepKey, setPickerStepKey] = useState<string>('Input');
  const [pickerCardId, setPickerCardId] = useState<string>('');
  const [selectedPickedOptions, setSelectedPickedOptions] = useState<string[]>([]);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');
  const [pickerTargetType, setPickerTargetType] = useState<'newField' | 'newCardField' | 'existingField'>('newField');
  const [pickerTargetFieldIndex, setPickerTargetFieldIndex] = useState<number | null>(null);
  const [pickerTargetFieldId, setPickerTargetFieldId] = useState<string | null>(null);

  const newSet = (arr: string[]) => Array.from(new Set(arr));

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
    setFieldAddedSets(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
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

  const getFieldSets = (field: { id: string; options?: string[] }, addedSets?: string[][]): { options: string[] }[] => {
    const base = [{ options: field.options || [] }];
    const added = addedSets ?? [];
    const result = [...base];
    added.forEach(a => { if (Array.isArray(a)) result.push({ options: a }); });
    return result;
  };

  const setOptionSetValue = (cardId: string, fieldId: string, setIdx: number, value: string) => {
    // Agent 7 guard: handle array/index safely
    // Option 1 (user's 1): setIdx-aware formData key so per-set values don't overwrite
    const key = setIdx <= 1 ? fieldId : `${fieldId}#set${setIdx}`;
    try { updateFormValue(cardId, key, value); } catch { /* silent fail guard */ }
  };

  const removeOptionSet = (fieldId: string, setIdx: number) => {
    setFieldAddedSets(prev => ({ ...prev, [fieldId]: (prev[fieldId] || []).filter((_, i) => i !== setIdx - 1) }));
  };

  const addOptionSet = (fieldId: string, opts?: string[]) => {
    setFieldAddedSets(prev => ({ ...prev, [fieldId]: [...(prev[fieldId] || []), opts || []] }));
  };

  const getCardProgress = (card: any) => {
    if (!card || !card.fields) return 0;
    const projStore = formData[projectKey] || {};
    const cardStore = projStore[card.id] || {};
    let filledCount = 0;
    let totalSets = 0;
    card.fields.forEach((f: any) => {
      const addedSets = fieldAddedSets[f.id] || [];
      // Image #12: 분모는 세트 수만 존재 (빈 세트도 포함)
      const totalFieldSets = 1 + addedSets.length;
      totalSets += totalFieldSets;
      // Base value (setIdx 0)
      const valBase = cardStore[f.id];
      const baseFilled = !!(valBase && typeof valBase === 'string' && valBase.trim() !== '');
      if (baseFilled) filledCount += 1;
      // Added set values (setIdx 1..N) via set-aware keys — only non-empty counts toward 채움
      addedSets.forEach((arr: string[], idx: number) => {
        const originalIdx = addedSets.indexOf(arr);
        const setKey = originalIdx <= 0 ? f.id : `${f.id}#set${originalIdx + 1}`;
        const valSet = cardStore[setKey];
        const setFilled = !!(valSet && typeof valSet === 'string' && valSet.trim() !== '');
        if (setFilled) filledCount += 1;
        // Fallback: if set array itself has content (direct value in array form)
        const arrFilled = Array.isArray(arr) && arr.some((s: string) => s && s.trim() !== '');
        if (arrFilled && !setFilled) filledCount += 1; // only if key not yet counted
      });
    });
    if (filledCount > totalSets) filledCount = totalSets;
    if (totalSets === 0) return 0;
    return Math.round((filledCount / totalSets) * 100);
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

  return {
    customOptions,
    setCustomOptions,
    fieldModes,
    setFieldModes,
    customInputs,
    setCustomInputs,
    savePermanently,
    setSavePermanently,
    fieldAddedSets, // Agent 7/8: 패널 진단용 export
    setFieldAddedSets,
    isPickerOpen,
    setIsPickerOpen,
    pickerStepKey,
    setPickerStepKey,
    pickerCardId,
    setPickerCardId,
    selectedPickedOptions,
    setSelectedPickedOptions,
    pickerSearchQuery,
    setPickerSearchQuery,
    pickerTargetType,
    setPickerTargetType,
    pickerTargetFieldIndex,
    setPickerTargetFieldIndex,
    pickerTargetFieldId,
    setPickerTargetFieldId,
    getFieldOptions,
    handleSelectChange,
    handleStartEditOption,
    handleCustomSubmit,
    handleResetFieldValue,
    updateFormValue,
    getFieldSets,
    setOptionSetValue,
    addOptionSet,
    removeOptionSet,
    getCardProgress,
    handleApplyPickedOptions,
    helperToggleOption,
    newSet,
  };
}
