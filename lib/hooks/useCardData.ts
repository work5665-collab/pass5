'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ViewMode } from '../types';
import { initialFrameworkData } from '../framework';
import { fetchCardsByProject, createCard, updateCard, deleteCard, updateCardStep } from '../supabase/cards';

type FrameworkData = typeof initialFrameworkData;
type FormDataMap = Record<string, Record<string, Record<string, string>>>;

interface UseCardDataParams {
  activeProjectId: string | null;
  setActiveProjectId: Dispatch<SetStateAction<string | null>>;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  formData: FormDataMap;
  setFormData: Dispatch<SetStateAction<FormDataMap>>;
  frameworkDataPerProject: Record<string, FrameworkData>;
  setFrameworkDataPerProject: Dispatch<SetStateAction<Record<string, FrameworkData>>>;
  activeCardId: string;
  setActiveCardId: Dispatch<SetStateAction<string>>;
}

// 카드/프레임워크 데이터 상태와 CRUD/필드 관리/드래그 로직을 담당하는 커스텀 훅
export function useCardData({
  activeProjectId,
  setActiveProjectId,
  setViewMode,
  formData,
  setFormData,
  frameworkDataPerProject,
  setFrameworkDataPerProject,
  activeCardId,
  setActiveCardId,
}: UseCardDataParams) {
  const [frameworkData, setFrameworkData] = useState<FrameworkData>(initialFrameworkData);

  // Helper function to update frameworkData for the current project
  const updateFrameworkData = (updater: (prev: FrameworkData) => FrameworkData) => {
    setFrameworkData(updater);
    if (activeProjectId) {
      setFrameworkDataPerProject(prev => ({
        ...prev,
        [activeProjectId]: updater(prev[activeProjectId] || initialFrameworkData)
      }));
    }
  };

  // --- Card editing state ---
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tempCardTitle, setTempCardTitle] = useState('');
  const [tempCardDesc, setTempCardDesc] = useState('');

  // --- Step metadata editing state ---
  const [editingStepMetaKey, setEditingStepMetaKey] = useState<string | null>(null);
  const [tempStepTitle, setTempStepTitle] = useState('');
  const [tempStepSubtitle, setTempStepSubtitle] = useState('');

  // --- New card creation state ---
  const [addingCardStepKey, setAddingCardStepKey] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardFields, setNewCardFields] = useState<{ label: string; optionsStr: string }[]>([
    { label: '1-1. 세부 항목 질문 입력', optionsStr: '옵션 1, 옵션 2, 옵션 3' }
  ]);

  // --- Field editing state ---
  const [editingFieldCardId, setEditingFieldCardId] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldOptionsStr, setNewFieldOptionsStr] = useState('');

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [tempFieldLabel, setTempFieldLabel] = useState('');

  // --- Card drag state ---
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // --- Helpers ---
  const findCardById = (cardId: string) => {
    for (const step of frameworkData) {
      const card = step.cards.find(c => c.id === cardId);
      if (card) return card;
    }
    return null;
  };

  const findCardFields = (cardId: string): any[] => {
    const card = findCardById(cardId);
    return card?.fields || [];
  };

  // --- Data loading ---
  const loadCardsForProject = async (projectId: string) => {
    // 가드 조건: projectId가 유효할 때만 fetchCardsByProject 호출
    if (!projectId || projectId.trim() === '') {
      console.warn('loadCardsForProject: 유효하지 않은 projectId — 카드 로드 스킵');
      setFrameworkData(initialFrameworkData);
      return;
    }
    try {
      const dbCards = await fetchCardsByProject(projectId);

      const frameworkDataFromDB: FrameworkData = initialFrameworkData.map(step => {
        const defaultCardIds = step.cards.map(c => c.id);

        const stepDbCards = dbCards
          .filter(card => card.step_key === step.stepKey)
          .filter(dbCard => !defaultCardIds.includes(dbCard.card_id))
          .map(dbCard => ({
            id: dbCard.id,
            title: dbCard.title,
            desc: dbCard.description,
            fields: dbCard.fields
          }));

        return {
          ...step,
          cards: [...step.cards, ...stepDbCards]
        };
      });

      setFrameworkData(frameworkDataFromDB);
      setFrameworkDataPerProject(prev => ({
        ...prev,
        [projectId]: frameworkDataFromDB
      }));
    } catch (error) {
      console.error('Failed to load cards for project:', error);
      setFrameworkData(initialFrameworkData);
    }
  };

  // --- Card CRUD ---
  const handleCreateCard = async (stepKey: string) => {
    if (!newCardTitle.trim() || !activeProjectId) return;

    const formattedFields = newCardFields.map((f, idx) => ({
      id: `field_${Date.now()}_${idx}`,
      label: f.label.trim() || `세부 항목 ${idx + 1}`,
      options: f.optionsStr.split(',').map(o => o.trim()).filter(Boolean)
    }));

    const newCardId = `card_${Date.now()}`;
    const newCard = {
      id: newCardId,
      title: newCardTitle.trim(),
      desc: newCardDesc.trim() || '새로 추가된 커스텀 항목입니다.',
      fields: formattedFields.length > 0 ? formattedFields : [
        {
          id: `field_${Date.now()}_1`,
          label: '1-1. 핵심 내용 입력',
          options: ['기본 옵션 A', '기본 옵션 B']
        }
      ]
    };

    const dbCard = await createCard(
      activeProjectId,
      newCardId,
      newCard.title,
      newCard.desc,
      stepKey,
      newCard.fields
    );

    const finalCard = { ...newCard, id: dbCard?.id || newCardId };

    updateFrameworkData(prev => prev.map(step => {
      if (step.stepKey === stepKey) {
        return { ...step, cards: [...step.cards, finalCard] };
      }
      return step;
    }));

    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardFields([{ label: '1-1. 세부 항목 질문 입력', optionsStr: '옵션 1, 옵션 2, 옵션 3' }]);
    setAddingCardStepKey(null);
  };

  // 카드 복제: 원본 카드의 제목 뒤에 ' (복사본)'을 붙여 같은 단계에 새 카드 생성
  const handleDuplicateCard = async (cardId: string) => {
    if (!activeProjectId) return;

    // 원본 카드와 소속 단계 찾기
    let sourceCard: any = null;
    let sourceStepKey: string | null = null;
    frameworkData.forEach(step => {
      const card = step.cards.find(c => c.id === cardId);
      if (card) {
        sourceCard = card;
        sourceStepKey = step.stepKey;
      }
    });
    if (!sourceCard || !sourceStepKey) return;

    const newCardId = `card_${Date.now()}`;

    // 필드 딥 클론 (새 id 부여 — 원본과 데이터 충돌 방지)
    const clonedFields = (sourceCard.fields || []).map((f: any, idx: number) => ({
      id: `field_${Date.now()}_${idx}`,
      label: f.label,
      options: Array.isArray(f.options) ? [...f.options] : [],
    }));

    const newTitle = `${sourceCard.title} (복사본)`;
    const newDesc = sourceCard.desc || '';

    const dbCard = await createCard(
      activeProjectId,
      newCardId,
      newTitle,
      newDesc,
      sourceStepKey,
      clonedFields
    );

    const finalCard = {
      id: dbCard?.id || newCardId,
      title: newTitle,
      desc: newDesc,
      fields: clonedFields,
    };

    updateFrameworkData(prev => prev.map(step => {
      if (step.stepKey === sourceStepKey) {
        return { ...step, cards: [...step.cards, finalCard] };
      }
      return step;
    }));
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!activeProjectId) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(cardId);

    if (isValidUuid) {
      const success = await deleteCard(cardId, activeProjectId);
      if (!success) {
        alert('카드 삭제에 실패했습니다. 다시 시도해 주세요.');
        return;
      }
    }

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.filter(c => c.id !== cardId)
    })));

    if (activeCardId === cardId) {
      const remaining = allFlattenedCards.filter(item => item.card.id !== cardId);
      if (remaining.length > 0) {
        setActiveCardId(remaining[0].card.id);
      } else {
        setViewMode('kanban');
      }
    }
  };

  const handleSaveCardMeta = async (cardId: string) => {
    if (!activeProjectId) return;

    const cardFields = findCardFields(cardId);

    await updateCard(cardId, activeProjectId, {
      title: tempCardTitle.trim(),
      description: tempCardDesc.trim(),
      fields: cardFields
    });

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          return {
            ...card,
            title: tempCardTitle.trim() || card.title,
            desc: tempCardDesc.trim() || card.desc
          };
        }
        return card;
      })
    })));
    setEditingCardId(null);
  };

  // --- Step metadata ---
  const handleCommitStepMeta = (stepKey: string) => {
    updateFrameworkData(prev => prev.map(step => {
      if (step.stepKey === stepKey) {
        return {
          ...step,
          title: tempStepTitle.trim() || step.title,
          subtitle: tempStepSubtitle.trim() || step.subtitle
        };
      }
      return step;
    }));
    setEditingStepMetaKey(null);
  };

  // --- Card drag ---
  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDrop = async (e: React.DragEvent, targetStepKey: string, targetCardId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedCardId || !activeProjectId) return;

    let movedCard: any = null;
    let sourceStepKey: string | null = null;

    frameworkData.forEach(step => {
      const foundCard = step.cards.find(c => c.id === draggedCardId);
      if (foundCard) {
        movedCard = foundCard;
        sourceStepKey = step.stepKey;
      }
    });

    if (!movedCard) return;

    updateFrameworkData(prevFramework => {
      let movedCardLocal: any = null;

      const cleanedFramework = prevFramework.map(step => {
        const filteredCards = step.cards.filter(c => {
          if (c.id === draggedCardId) {
            movedCardLocal = c;
            return false;
          }
          return true;
        });
        return { ...step, cards: filteredCards };
      });

      if (!movedCardLocal) return prevFramework;

      return cleanedFramework.map(step => {
        if (step.stepKey === targetStepKey) {
          const newCards = [...step.cards];
          if (targetCardId) {
            const targetIdx = newCards.findIndex(c => c.id === targetCardId);
            if (targetIdx !== -1) {
              newCards.splice(targetIdx, 0, movedCardLocal);
            } else {
              newCards.push(movedCardLocal);
            }
          } else {
            newCards.push(movedCardLocal);
          }
          return { ...step, cards: newCards };
        }
        return step;
      });
    });

    if (sourceStepKey !== targetStepKey) {
      await updateCardStep(draggedCardId, activeProjectId, targetStepKey);
    }

    setDraggedCardId(null);
  };

  // --- Field management ---
  const handleAddFieldToCard = async (cardId: string) => {
    if (!newFieldLabel.trim() || !activeProjectId) return;
    const opts = newFieldOptionsStr.split(',').map(o => o.trim()).filter(Boolean);

    const currentFields = findCardFields(cardId);

    const newFieldObj = {
      id: `field_${Date.now()}`,
      label: newFieldLabel.trim(),
      options: opts.length > 0 ? opts : ['기본 옵션 1', '기본 옵션 2']
    };

    const updatedFields = [...currentFields, newFieldObj];

    await updateCard(cardId, activeProjectId, {
      fields: updatedFields
    });

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          return { ...card, fields: updatedFields };
        }
        return card;
      })
    })));

    setNewFieldLabel('');
    setNewFieldOptionsStr('');
    setEditingFieldCardId(null);
  };

  const handleDeleteFieldFromCard = async (cardId: string, fieldId: string) => {
    if (!activeProjectId) return;

    const currentFields = findCardFields(cardId);
    const updatedFields = currentFields.filter((f: any) => f.id !== fieldId);

    await updateCard(cardId, activeProjectId, {
      fields: updatedFields
    });

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          return { ...card, fields: updatedFields };
        }
        return card;
      })
    })));
  };

  const handleUpdateFieldLabel = async (cardId: string, fieldId: string) => {
    if (!tempFieldLabel.trim() || !activeProjectId) return;

    const currentFields = findCardFields(cardId);
    const updatedFields = currentFields.map((f: any) =>
      f.id === fieldId ? { ...f, label: tempFieldLabel.trim() } : f
    );

    await updateCard(cardId, activeProjectId, {
      fields: updatedFields
    });

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          return { ...card, fields: updatedFields };
        }
        return card;
      })
    })));
    setEditingFieldId(null);
    setTempFieldLabel('');
  };

  const handleFieldDragStart = (e: React.DragEvent, fieldId: string) => {
    e.dataTransfer.setData('text/field', fieldId);
  };

  const handleFieldDrop = (e: React.DragEvent, cardId: string, targetFieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceFieldId = e.dataTransfer.getData('text/field');
    if (!sourceFieldId || sourceFieldId === targetFieldId) return;

    updateFrameworkData(prev => prev.map(step => ({
      ...step,
      cards: step.cards.map(card => {
        if (card.id === cardId) {
          const fields = [...card.fields];
          const sIdx = fields.findIndex((f: any) => f.id === sourceFieldId);
          const tIdx = fields.findIndex((f: any) => f.id === targetFieldId);
          if (sIdx !== -1 && tIdx !== -1) {
            const [moved] = fields.splice(sIdx, 1);
            fields.splice(tIdx, 0, moved);
          }
          return { ...card, fields };
        }
        return card;
      })
    })));
  };

  // --- Derived data ---
  const allFlattenedCards: { card: any; stepKey: string; stepTitle: string }[] = [];
  frameworkData.forEach(step => {
    step.cards.forEach(card => {
      allFlattenedCards.push({ card, stepKey: step.stepKey, stepTitle: step.title });
    });
  });

  return {
    frameworkDataPerProject,
    setFrameworkDataPerProject,
    frameworkData,
    setFrameworkData,
    updateFrameworkData,
    editingCardId,
    setEditingCardId,
    tempCardTitle,
    setTempCardTitle,
    tempCardDesc,
    setTempCardDesc,
    editingStepMetaKey,
    setEditingStepMetaKey,
    tempStepTitle,
    setTempStepTitle,
    tempStepSubtitle,
    setTempStepSubtitle,
    addingCardStepKey,
    setAddingCardStepKey,
    newCardTitle,
    setNewCardTitle,
    newCardDesc,
    setNewCardDesc,
    newCardFields,
    setNewCardFields,
    editingFieldCardId,
    setEditingFieldCardId,
    newFieldLabel,
    setNewFieldLabel,
    newFieldOptionsStr,
    setNewFieldOptionsStr,
    editingFieldId,
    setEditingFieldId,
    tempFieldLabel,
    setTempFieldLabel,
    draggedCardId,
    setDraggedCardId,
    loadCardsForProject,
    handleCreateCard,
    handleDuplicateCard,
    handleDeleteCard,
    handleSaveCardMeta,
    handleCommitStepMeta,
    handleCardDragStart,
    handleCardDragOver,
    handleCardDrop,
    handleAddFieldToCard,
    handleDeleteFieldFromCard,
    handleUpdateFieldLabel,
    handleFieldDragStart,
    handleFieldDrop,
    findCardById,
    allFlattenedCards,
  };
}
