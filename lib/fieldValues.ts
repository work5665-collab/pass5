// 필드 선택값 표현 타입 + 다중 선택 조합 유틸리티
// =============================================================
// 4단계(다중 옵션 선택) 저장 구조 확장:
//   - 기존: 필드값은 단일 문자열 (Record<fieldId, string>)
//   - 신규: 필드 하나에서 복수의 옵션 세트(드롭다운)를 선택해
//           string[] (selectedOptions) 로도 저장할 수 있게 확장
//   - 표시/내보내기 시 joinOptionsToText() 로 구분자 결합된 단일 텍스트로 변환
// 기존 단일 값 데이터와 하위 호환 (string 은 그대로 보존, JSON 직렬화 그대로 동작)

import type { FormDataMap } from './hooks/useFieldInteraction';
export type FieldValue = string | string[];

/** 다중 선택 값을 결합할 때 사용하는 구분자 */
export const OPTION_DELIMITER = ' / ';

/** 저장값(string | string[]) 을 항상 string[] 로 정규화 — 다중 선택 판정/결합의 단일 진입점 */
export function toOptionArray(value: FieldValue | null | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : value ? [value] : [];
}

/** 저장값을 표시용 단일 텍스트로 결합 — string 은 그대로, string[] 는 구분자로 연결
 *  미선택 세트의 빈 문자열('') 은 결합에서 제외 ("/ /" 방지) */
export function joinOptionsToText(
  value: FieldValue | null | undefined,
  delimiter: string = OPTION_DELIMITER,
): string {
  return toOptionArray(value).filter(v => v.trim() !== '').join(delimiter);
}

/** 채워졌는지 판정 (카드/프로젝트 진행률·완료 계산에서 "작성됨" 여부) */
export function isFieldFilled(value: FieldValue | null | undefined): boolean {
  return toOptionArray(value).some(v => v.trim() !== '');
}

/** 저장값에 특정 옵션이 포함되어 있는지 */
export function hasOption(value: FieldValue | null | undefined, opt: string): boolean {
  return toOptionArray(value).includes(opt);
}

/** 다중 선택 토글: opt 포함 시 제거, 미포함 시 추가한 새 배열 반환 */
export function toggleOptionIn(value: FieldValue | null | undefined, opt: string): string[] {
  const arr = toOptionArray(value);
  return arr.includes(opt) ? arr.filter(o => o !== opt) : [...arr, opt];
}

/** 다중 세트 선택: 저장 배열의 setIdx 위치에 value 를 세팅한 새 배열 반환
 *  value 가 빈 문자열이면 해당 인덱스를 제거(길이 축소) */
export function setArrayIndex(
  value: FieldValue | null | undefined,
  setIdx: number,
  newValue: string,
): string[] {
  const arr = toOptionArray(value);
  const next = [...arr];
  // 세트 개수만큼 확장 (부족한 자리는 빈 문자열)
  while (next.length <= setIdx) next.push('');
  next[setIdx] = newValue;
  // 빈 값으로 끝나는 트레이링 제거 (불필요한 세트 유지 안 함)
  while (next.length > 0 && next[next.length - 1].trim() === '') next.pop();
  return next;
}

/** 중복 제거된 합집합 (옵션 목록 병합) */
export function mergeUniqueOptions(...arrs: string[][]): string[] {
  return Array.from(new Set(arrs.flat()));
}