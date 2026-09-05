'use client';

import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type FormDataMap = Record<string, Record<string, Record<string, string>>>;

// 카드 필드값(선택값) 영속화 — 사용자별 localStorage
// ======================================================================
// 의도된 설계(브리핑): 필드 선택값은 DB(cards)가 아니라 "사용자별 localStorage"에 저장.
// 그런데 실제 코드에는 이 영속화 로직이 구현돼 있지 않아 formData가 순수 React state로만
// 유지됐고, 새로고침 시 {} 로 초기화되어 입력값이 전부 사라지는 버그가 있었다.
// 이 훅은 formData 를 localStorage에 로드/디바운스 저장하여 그 문제를 해결한다.
//
// key: 사용자별 격리 (pass5_field_values_v1:<userId>)
//   - formData는 projectId → cardId → fieldId → value 구조라 프로젝트 전부를 한 번에 보관
//   - 로그아웃 시(userId null) 메모리 비움 → 다른 사용자로의 값 누출 방지
const STORAGE_PREFIX = 'pass5_field_values_v1';
const SAVE_DEBOUNCE_MS = 500;

export function useFieldValuePersistence(
  formData: FormDataMap,
  setFormData: Dispatch<SetStateAction<FormDataMap>>,
  userId: string | null | undefined,
) {
  const storageKey = userId ? `${STORAGE_PREFIX}:${userId}` : null;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 복원 완료 전에는 저장을 건너뛰어, 복원 직후 빈 {} 로 실데이터를 덮어쓰는 것을 방지
  const hydratedRef = useRef(false);

  // 1) 마운트/로그인 시 localStorage에서 복원
  useEffect(() => {
    if (!storageKey) {
      // 로그아웃: 메모리 비우고 복원 상태 초기화 (다른 계정 값 누출 방지)
      setFormData({});
      hydratedRef.current = false;
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setFormData(parsed);
          console.log(
            `[필드값] localStorage에서 복원됨 (${storageKey}): 프로젝트 ${Object.keys(parsed).length}개`,
          );
        } else {
          console.warn('[필드값] 저장된 값이 올바른 객체가 아님 — 빈 상태로 시작');
        }
      } else {
        console.log(`[필드값] 저장된 값 없음 (${storageKey}) — 새로 시작`);
      }
    } catch (e) {
      console.error('[필드값] localStorage 복원 실패:', e);
    }

    hydratedRef.current = true;
  }, [storageKey, setFormData]);

  // 2) formData 변경 시 디바운스 저장
  useEffect(() => {
    if (!storageKey || !hydratedRef.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData));
        console.log(`[필드값] localStorage 저장됨 (디바운스 ${SAVE_DEBOUNCE_MS}ms): ${storageKey}`);
      } catch (e) {
        console.error('[필드값] localStorage 저장 실패:', e);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [formData, storageKey]);
}
