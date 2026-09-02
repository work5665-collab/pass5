'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type FormDataMap = Record<string, Record<string, Record<string, string>>>;

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
    getCardProgress,
    handleApplyPickedOptions,
    helperToggleOption,
    newSet,
  };
}
